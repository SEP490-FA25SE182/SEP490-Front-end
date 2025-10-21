import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { type Book } from "@/services/BookService";
import { CartService } from "@/services/CartService";
import { CartItemService, type CartItem } from "@/services/CartItemService";
import { getUserByEmail } from "@/services/UserService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getBookById } from "@/services/BookService";

/* =====================================================
   🛒 TYPE DEFINITIONS
===================================================== */
export type CartLine = {
  book: Book;
  qty: number;
  price: number;
  cartItemId?: string;
};

export type CartState = {
  cartId: string | null;
  lines: CartLine[];
};

/* =====================================================
   ⚙️ REDUCER
===================================================== */
type Action =
  | { type: "INIT"; cartId: string; lines: CartLine[] }
  | { type: "ADD"; line: CartLine }
  | { type: "SET_QTY"; bookId: string; qty: number }
  | { type: "REMOVE"; bookId: string }
  | { type: "CLEAR" };

const initialState: CartState = { cartId: null, lines: [] };



function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "INIT":
      return { cartId: action.cartId, lines: action.lines };
    case "ADD":
      const exists = state.lines.find(
        (l) => l.book.bookId === action.line.book.bookId
      );
      if (exists) {
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.book.bookId === action.line.book.bookId
              ? { ...l, qty: l.qty + action.line.qty }
              : l
          ),
        };
      } else {
        return { ...state, lines: [...state.lines, action.line] };
      }
    case "SET_QTY":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.book.bookId === action.bookId ? { ...l, qty: action.qty } : l
        ),
      };
    case "REMOVE":
      return { ...state, lines: state.lines.filter((l) => l.book.bookId !== action.bookId) };
    case "CLEAR":
      return { cartId: state.cartId, lines: [] };
    default:
      return state;
  }
}

/* =====================================================
   💡 CONTEXT VALUE TYPE
===================================================== */
type CartContextValue = {
  state: CartState;
  addToCart: (book: Book, qty?: number) => Promise<void>;
  remove: (bookId: string) => Promise<void>;
  setQty: (bookId: string, qty: number) => Promise<void>;
  clear: () => Promise<void>;
  subtotal: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

/* =====================================================
   🚀 PROVIDER COMPONENT
===================================================== */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
 const [state, dispatch] = useReducer(reducer, initialState, () => {
  const saved = localStorage.getItem("cart_state");
  return saved ? JSON.parse(saved) : initialState;
});

  const [userId, setUserId] = useState<string | null>(null);

  /* --------------------------------------------------
     🧠 Lấy userId từ email (vì AuthContext chỉ lưu email)
  -------------------------------------------------- */
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        if (user?.email) {
          const res = await getUserByEmail(user.email);
          setUserId(res.userId);
        }
      } catch (err) {
        console.error("❌ Lỗi lấy userId:", err);
      }
    };
    fetchUserId();
  }, [user]);

  /* --------------------------------------------------
     🛒 Tải giỏ hàng khi userId sẵn sàng
  -------------------------------------------------- */
  useEffect(() => {
    const fetchCart = async () => {
      if (!userId) return;
      try {
         console.log("🚀 Fetching cart for user:", userId);
        let cart = await CartService.getCartByUserId(userId);
         console.log("🧩 Cart:", cart);
        if (!cart) {
          cart = await CartService.createCart(userId);
        }

        const items = await CartItemService.getItemsByCartId(cart.cartId);
         console.log("📦 Items:", items);
        const lines: CartLine[] = await Promise.all(
        items.map(async (i: CartItem) => {
          try {
            const book = await getBookById(i.bookId);
            return {
              book,
              qty: i.quantity,
              price: i.price,
              cartItemId: i.cartItemId,
            };
          } catch (err) {
            console.error("❌ Lỗi khi lấy thông tin sách:", i.bookId, err);
            return {
              book: { bookId: i.bookId } as Book, // fallback để không crash
              qty: i.quantity,
              price: i.price,
              cartItemId: i.cartItemId,
            };
          }
        })
      );

        dispatch({ type: "INIT", cartId: cart.cartId, lines });
        console.log("✅ Cart loaded:", cart.cartId);
      } catch (err) {
         console.error("❌ Lỗi fetchCart:", err);
        console.error("❌ Lỗi khi tải giỏ hàng:", err);
      }
    };
    fetchCart();
  }, [userId]);

  // 🔹 Lưu state hiện tại vào localStorage để giữ dữ liệu khi reload
useEffect(() => {
  localStorage.setItem("cart_state", JSON.stringify(state));
}, [state]);


  /* --------------------------------------------------
     🧮 Tổng tiền & số lượng
  -------------------------------------------------- */
  const subtotal = useMemo(
    () => state.lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0),
    [state.lines]
  );
  const count = useMemo(() => state.lines.reduce((n, l) => n + l.qty, 0), [state.lines]);

  /* --------------------------------------------------
     🛒 Thêm sản phẩm vào giỏ
  -------------------------------------------------- */
  const addToCart = async (book: Book, qty = 1) => {
  if (!userId) {
    toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
    return;
  }

  try {
    // 🧩 Lấy giỏ hàng hiện tại (hoặc tạo mới)
    let cart = await CartService.getCartByUserId(userId);
    if (!cart) {
      cart = await CartService.createCart(userId);
    }

    const cartId = cart.cartId;

    // ⚙️ Kiểm tra xem sản phẩm đã tồn tại trong giỏ chưa
    const existing = state.lines.find(
      (l) => l.book.bookId === book.bookId
    );

    if (existing) {
      // 🔹 Nếu đã có -> cộng dồn số lượng & cập nhật BE
      const newQty = existing.qty + qty;
      await CartItemService.updateCartItem(existing.cartItemId!, newQty);

      dispatch({ type: "SET_QTY", bookId: book.bookId, qty: newQty });

      toast.success(`Đã cập nhật số lượng “${book.bookName}” (${newQty})`);
    } else {
      // 🔹 Nếu chưa có -> tạo item mới
      const newItem = await CartItemService.addCartItem(
        cartId,
        book.bookId,
        qty,
        150000
      );

      dispatch({
        type: "ADD",
        line: {
          book,
          qty,
          price: newItem.price ?? 150000,
          cartItemId: newItem.cartItemId,
        },
      });

      toast.success(`Đã thêm “${book.bookName}” vào giỏ hàng`);
    }
  } catch (err) {
    console.error("❌ Lỗi khi thêm sản phẩm:", err);
    toast.error("Không thể thêm sản phẩm vào giỏ hàng");
  }
};




  /* --------------------------------------------------
     ✏️ Cập nhật số lượng
  -------------------------------------------------- */
  const setQty = async (bookId: string, qty: number) => {
    const line = state.lines.find((l) => l.book.bookId === bookId);
    if (!line || !line.cartItemId) return;
    await CartItemService.updateCartItem(line.cartItemId, qty);
    dispatch({ type: "SET_QTY", bookId, qty });
  };

  /* --------------------------------------------------
     🗑️ Xóa 1 sản phẩm
  -------------------------------------------------- */
  const remove = async (bookId: string) => {
    const line = state.lines.find((l) => l.book.bookId === bookId);
    if (!line?.cartItemId) return;
    await CartItemService.deleteCartItem(line.cartItemId);
    dispatch({ type: "REMOVE", bookId });
  };

  /* --------------------------------------------------
     🧹 Xóa toàn bộ giỏ hàng
  -------------------------------------------------- */
  const clear = async () => {
    if (state.cartId) await CartItemService.clearCart(state.cartId);
    dispatch({ type: "CLEAR" });
  };

  /* --------------------------------------------------
     💾 Giá trị context
  -------------------------------------------------- */
  const value: CartContextValue = useMemo(
    () => ({ state, addToCart, remove, setQty, clear, subtotal, count }),
    [state, subtotal, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/* =====================================================
   🧩 HOOK TIỆN ÍCH
===================================================== */
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

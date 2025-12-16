// src/context/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { type Book, getBookById } from "@/services/BookService";
import { CartService } from "@/services/CartService";
import { CartItemService, type CartItem } from "@/services/CartItemService";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";


export type CartLine = {
  book: Book;
  qty: number;
  price: number;
  cartItemId?: string;
};

async function syncCartLinesWithLatestBook(
  lines: CartLine[]
): Promise<CartLine[]> {
  return Promise.all(
    lines.map(async (line) => {
      try {
        const latestBook = await getBookById(line.book.bookId);

        return {
          ...line,
          book: {
            ...line.book,
            ...latestBook, // 🔥 update toàn bộ field từ DB
          },
          price: latestBook.price, // 🔥 giá luôn mới
        };
      } catch (err) {
        console.error("❌ Không sync được book:", line.book.bookId, err);
        return line; // fallback an toàn
      }
    })
  );
}


export type CartState = { cartId: string | null; lines: CartLine[]; };

type Action =
  | { type: "INIT"; cartId: string | null; lines: CartLine[] }
  | { type: "ADD"; line: CartLine }
  | { type: "SET_QTY"; bookId: string; qty: number; price?: number; book?: Book }
  | { type: "REMOVE"; bookId: string }
  | { type: "CLEAR" };


const initialState: CartState = { cartId: null, lines: [] };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "INIT": return { cartId: action.cartId, lines: action.lines };
    case "ADD": {
      const exists = state.lines.find((l) => l.book.bookId === action.line.book.bookId);
      return exists
        ? {
          ...state, lines: state.lines.map((l) =>
            l.book.bookId === action.line.book.bookId ? { ...l, qty: l.qty + action.line.qty } : l)
        }
        : { ...state, lines: [...state.lines, action.line] };
    }
    case "SET_QTY":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.book.bookId === action.bookId
            ? {
              ...l,
              qty: action.qty,
              ...(action.price !== undefined ? { price: action.price } : {}),
              ...(action.book ? { book: action.book } : {}),
            }
            : l
        ),
      };
    case "REMOVE": return { ...state, lines: state.lines.filter((l) => l.book.bookId !== action.bookId) };
    case "CLEAR": return { cartId: state.cartId, lines: [] };
    default: return state;
  }
}

type CartContextValue = {
  state: CartState;
  addToCart: (book: Book, qty?: number) => Promise<void>;
  remove: (bookId: string) => Promise<void>;
  setQty: (bookId: string, qty: number, price?: number) => Promise<void>;
  clear: () => Promise<void>;
  clearUI: () => void; // ✅ thêm
  subtotal: number;
  count: number;
};


const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    const saved = localStorage.getItem("cart_state");
    return saved ? JSON.parse(saved) : initialState;
  });
  const { user, isInitialized } = useAuth();
  const userId = user?.userId ?? null;




  // 🔑 Lấy userId từ localStorage (đã được set khi login) + sync khi storage thay đổi
  useEffect(() => {
    if (!isInitialized) return;
    dispatch({ type: "INIT", cartId: null, lines: [] });
  }, [userId, isInitialized]);

  // 🛒 Load Cart sau khi Auth sẵn sàng và có userId
  useEffect(() => {
    if (!isInitialized) return;
    if (!userId) return;

    const fetchCart = async () => {
      try {
        const cart = await CartService.getCartByUserId(userId);
        if (!cart?.cartId) return;

        const items = await CartItemService.getItemsByCartId(cart.cartId);

        const rawLines: CartLine[] = await Promise.all(
          items.map(async (i: CartItem) => {
            const book =
              (await getBookById(i.bookId).catch(() => null)) ||
              ({ bookId: i.bookId } as Book);

            return {
              book,
              qty: i.quantity,
              price: i.price, // để tạm, lát sync sẽ thay
              cartItemId: i.cartItemId,
            };
          })
        );

        // ✅ SYNC THEO DB: update book + update price
        const syncedLines = await syncCartLinesWithLatestBook(rawLines);

        dispatch({ type: "INIT", cartId: cart.cartId, lines: syncedLines });
      } catch (err) {
        console.error("❌ Lỗi fetchCart:", err);
      }
    };


    fetchCart();
  }, [isInitialized, userId]);


  // 💾 Lưu giỏ hàng vào localStorage
  useEffect(() => {
    localStorage.setItem("cart_state", JSON.stringify(state));
  }, [state]);

  const subtotal = useMemo(() => state.lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0), [state.lines]);
  const count = useMemo(() => state.lines.reduce((n, l) => n + l.qty, 0), [state.lines]);

  const addToCart = async (book: Book, qty = 1) => {
    if (!userId) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }
    try {
      let cart = await CartService.getCartByUserId(userId);
      if (!cart) cart = await CartService.createCart(userId);
      const cartId = cart.cartId;

      const existing = state.lines.find((l) => l.book.bookId === book.bookId);
      if (existing) {
        const newQty = existing.qty + qty;
        await CartItemService.updateCartItem(existing.cartItemId!, newQty);
        dispatch({
          type: "SET_QTY",
          bookId: book.bookId,
          qty: newQty,
          price: book.price, 
          book,              
        });
        toast.success(`Đã cập nhật số lượng “${book.bookName}” (${newQty})`);
      } else {
        const newItem = await CartItemService.addCartItem(cartId, book.bookId, qty, book.price);
        dispatch({
          type: "ADD",
          line: { book, qty, price: newItem.price, cartItemId: newItem.cartItemId },
        });
        toast.success(`Đã thêm “${book.bookName}” vào giỏ hàng`);
      }
    } catch (err) {
      console.error("❌ Lỗi khi thêm sản phẩm:", err);
      toast.error("Không thể thêm sản phẩm vào giỏ hàng");
    }
  };

  const setQty = async (bookId: string, qty: number, price?: number) => {
    const line = state.lines.find((l) => l.book.bookId === bookId);
    if (!line || !line.cartItemId) return;

    await CartItemService.updateCartItem(line.cartItemId, qty);

    dispatch({ type: "SET_QTY", bookId, qty, price });
  };


  const remove = async (bookId: string) => {
    const line = state.lines.find((l) => l.book.bookId === bookId);
    if (!line?.cartItemId) return;
    await CartItemService.deleteCartItem(line.cartItemId);
    dispatch({ type: "REMOVE", bookId });
  };

  const clear = async () => {
    if (state.cartId) await CartItemService.clearCart(state.cartId);
    dispatch({ type: "CLEAR" });
  };

  const clearUI = () => {
    dispatch({ type: "CLEAR" });
    localStorage.removeItem("cart_state");
  };


  const value: CartContextValue = useMemo(
    () => ({ state, addToCart, remove, setQty, clear, subtotal, count, clearUI }),
    [state, subtotal, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};



// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

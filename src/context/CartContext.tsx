// src/context/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { type Book, getBookById } from "@/services/BookService";
import { CartService } from "@/services/CartService";
import { CartItemService, type CartItem } from "@/services/CartItemService";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/authStorage";

export type CartLine = {
  book: Book;
  qty: number;
  price: number;
  cartItemId?: string;
};

export type CartState = { cartId: string | null; lines: CartLine[]; };

type Action =
  | { type: "INIT"; cartId: string; lines: CartLine[] }
  | { type: "ADD"; line: CartLine }
  | { type: "SET_QTY"; bookId: string; qty: number }
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
      return { ...state, lines: state.lines.map((l) => l.book.bookId === action.bookId ? { ...l, qty: action.qty } : l) };
    case "REMOVE": return { ...state, lines: state.lines.filter((l) => l.book.bookId !== action.bookId) };
    case "CLEAR": return { cartId: state.cartId, lines: [] };
    default: return state;
  }
}

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

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    const saved = localStorage.getItem("cart_state");
    return saved ? JSON.parse(saved) : initialState;
  });

  const [userId, setUserId] = useState<string | null>(null);

  // 🔑 Lấy userId từ localStorage (đã được set khi login) + sync khi storage thay đổi
  useEffect(() => {
    setUserId(getCurrentUserId());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rookie.auth.currentUserId") setUserId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 🛒 Tải giỏ hàng khi userId sẵn sàng
  useEffect(() => {
    const fetchCart = async () => {
      if (!userId) return;
      try {
        let cart: { cartId: string } | null = null;

        try {
          cart = await CartService.getCartByUserId(userId);
        } catch (err: any) {
          if (err.response?.status === 404) {
            cart = await CartService.createCart(userId);
          } else {
            throw err;
          }
        }

        if (!cart) return; // ⭐ TS không còn báo lỗi nữa

        const items = await CartItemService.getItemsByCartId(cart.cartId);

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
              return {
                book: { bookId: i.bookId } as Book,
                qty: i.quantity,
                price: i.price,
                cartItemId: i.cartItemId,
              };
            }
          })
        );

        dispatch({ type: "INIT", cartId: cart.cartId, lines });

      } catch (err) {
        console.error("❌ Lỗi khi tải giỏ hàng:", err);
      }
    };

    fetchCart();
  }, [userId]);

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
        dispatch({ type: "SET_QTY", bookId: book.bookId, qty: newQty });
        toast.success(`Đã cập nhật số lượng “${book.bookName}” (${newQty})`);
      } else {
        const newItem = await CartItemService.addCartItem(cartId, book.bookId, qty, 2000);
        dispatch({
          type: "ADD",
          line: { book, qty, price: newItem.price ?? 2000, cartItemId: newItem.cartItemId },
        });
        toast.success(`Đã thêm “${book.bookName}” vào giỏ hàng`);
      }
    } catch (err) {
      console.error("❌ Lỗi khi thêm sản phẩm:", err);
      toast.error("Không thể thêm sản phẩm vào giỏ hàng");
    }
  };

  const setQty = async (bookId: string, qty: number) => {
    const line = state.lines.find((l) => l.book.bookId === bookId);
    if (!line || !line.cartItemId) return;
    await CartItemService.updateCartItem(line.cartItemId, qty);
    dispatch({ type: "SET_QTY", bookId, qty });
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

  const value: CartContextValue = useMemo(
    () => ({ state, addToCart, remove, setQty, clear, subtotal, count }),
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

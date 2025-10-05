// src/contexts/CartContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Book } from "@/types/books";

export type CartLine = { book: Book; qty: number };
export type CartState = { lines: CartLine[] };

type Action =
  | { type: "ADD"; book: Book; qty?: number }
  | { type: "REMOVE"; bookId: string }
  | { type: "SET_QTY"; bookId: string; qty: number }
  | { type: "CLEAR" };

const STORAGE_KEY = "cart_v1";
const initialState: CartState = { lines: [] };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD": {
      const qty = Math.max(1, action.qty ?? 1);
      const i = state.lines.findIndex(l => l.book.book_id === action.book.book_id);
      const lines =
        i >= 0
          ? state.lines.map((l, idx) => (idx === i ? { ...l, qty: l.qty + qty } : l))
          : [...state.lines, { book: action.book, qty }];
      return { ...state, lines };
    }
    case "REMOVE":
      return { ...state, lines: state.lines.filter(l => l.book.book_id !== action.bookId) };
    case "SET_QTY": {
      const lines = state.lines
        .map(l => (l.book.book_id === action.bookId ? { ...l, qty: Math.max(1, action.qty) } : l))
        .filter(l => l.qty > 0);
      return { ...state, lines };
    }
    case "CLEAR":
      return { ...state, lines: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  state: CartState;
  add: (book: Book, qty?: number) => void;
  remove: (bookId: string) => void;
  setQty: (bookId: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartState) : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getUnit = (b: Book) => b.sale_price ?? b.price ?? 150000; // fallback 150k như bạn đang dùng

  const subtotal = useMemo(
    () => state.lines.reduce((s, l) => s + getUnit(l.book) * l.qty, 0),
    [state.lines]
  );
  const count = useMemo(() => state.lines.reduce((n, l) => n + l.qty, 0), [state.lines]);

  const value: CartContextValue = {
    state,
    add: (book, qty) => dispatch({ type: "ADD", book, qty }),
    remove: (bookId) => dispatch({ type: "REMOVE", bookId }),
    setQty: (bookId, qty) => dispatch({ type: "SET_QTY", bookId, qty }),
    clear: () => dispatch({ type: "CLEAR" }),
    subtotal,
    count,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

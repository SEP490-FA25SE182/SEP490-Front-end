import React, { createContext, useContext, useEffect, useState } from "react";
import { type Book } from "@/services/BookService";
import { toast } from "sonner";

/* =====================================================
   ❤️ Favorite Context
===================================================== */

type FavoriteContextType = {
  favorites: Book[];
  toggleFavorite: (book: Book) => void;
  isFavorite: (bookId: string) => boolean;
};

const FavoriteContext = createContext<FavoriteContextType | undefined>(
  undefined
);

export const FavoriteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<Book[]>(() => {
    // 🧠 Load từ localStorage khi khởi động
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // 💾 Lưu favorites mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  // ❤️ Thêm / Xóa yêu thích
  const toggleFavorite = (book: Book) => {
    setFavorites((prev) => {
      const exists = prev.some((b) => b.bookId === book.bookId);
      if (exists) {
        toast.info(`Đã xóa “${book.bookName}” khỏi thư viện`);
        return prev.filter((b) => b.bookId !== book.bookId);
      } else {
        toast.success(`Đã thêm “${book.bookName}” vào thư viện`);
        return [...prev, book];
      }
    });
  };

  // 🔍 Kiểm tra sách đã yêu thích chưa
  const isFavorite = (bookId: string) =>
    favorites.some((b) => b.bookId === bookId);

  return (
    <FavoriteContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoriteContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoriteContext);
  if (!ctx)
    throw new Error("useFavorites must be used within a FavoriteProvider");
  return ctx;
};

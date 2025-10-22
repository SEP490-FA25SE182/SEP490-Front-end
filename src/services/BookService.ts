import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface Book {
  bookId: string;
  bookName: string;
  coverUrl: string;
  decription: string;
  authorId: string;
  progressStatus: string;
  publicationStatus: string;
  isActived: string;
  createdAt: string;
  updatedAt: string;
  publishedDate: string;
}

// 🟩 Lấy danh sách tất cả sách (paged)
export const getAllBooks = async (): Promise<Book[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/books`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // ✅ Backend trả dạng Page, lấy mảng trong content
  if (res.data && Array.isArray(res.data.content)) {
    return res.data.content;
  }

  console.warn("⚠️ Dữ liệu books không có 'content':", res.data);
  return [];
};

// 🟩 Lấy chi tiết sách theo ID
export const getBookById = async (id: string): Promise<Book> => {
  const res = await axios.get(`${API_BASE_URL}/users/books/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

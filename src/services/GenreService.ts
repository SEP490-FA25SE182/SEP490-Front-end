import axios from "axios";
import { API_RK } from "@/config";

export interface Genre {
  genreId: string;
  genreName: string;
  description: string;
  isActived?: string;
  createdAt?: string;
  updatedAt?: string;
  
}

// 🟢 Lấy tất cả thể loại
export const getAllGenres = async (bookId?: string): Promise<Genre[]> => {
  const res = await axios.get(`${API_RK}/users/genres`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    params: bookId ? { bookId } : {},
  });

  // ✅ Một số BE trả dạng Page, nên ta lấy content nếu có
  if (Array.isArray(res.data)) return res.data;
  if (res.data?.content && Array.isArray(res.data.content)) return res.data.content;

  return [];
};

// 🟢 Lấy chi tiết 1 thể loại
export const getGenreById = async (id: string): Promise<Genre> => {
  const res = await axios.get(`${API_RK}/users/genres/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

// 🟡 Tạo thể loại
export const createGenre = async (data: Partial<Genre>): Promise<Genre> => {
  const res = await axios.post(`${API_RK}/users/genres`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

// 🟡 Cập nhật thể loại
export const updateGenre = async (id: string, data: Partial<Genre>): Promise<Genre> => {
  const res = await axios.put(`${API_RK}/users/genres/${id}`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

// 🔴 Xóa thể loại
export const deleteGenre = async (id: string): Promise<void> => {
  await axios.delete(`${API_RK}/users/genres/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
};

// 🟢 Gắn nhiều genre vào 1 sách
export const attachGenresToBook = async (
  bookId: string,
  genreIds: string[]
): Promise<void> => {
  await axios.post(
    `${API_RK}/users/books/${bookId}/genres`,
    genreIds, // body là array<string>, đúng theo Swagger
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
};


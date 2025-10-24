import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface Genre {
  genreId: string;
  genreName: string;
  description: string;
  isActived?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 🟢 Lấy tất cả thể loại
export const getAllGenres = async (): Promise<Genre[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/genres`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // ✅ Một số BE trả dạng Page, nên ta lấy content nếu có
  if (Array.isArray(res.data)) return res.data;
  if (res.data?.content && Array.isArray(res.data.content)) return res.data.content;

  return [];
};

// 🟢 Lấy chi tiết 1 thể loại
export const getGenreById = async (id: string): Promise<Genre> => {
  const res = await axios.get(`${API_BASE_URL}/users/genres/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

// 🟡 Tạo thể loại
export const createGenre = async (data: Partial<Genre>): Promise<Genre> => {
  const res = await axios.post(`${API_BASE_URL}/users/genres`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

// 🟡 Cập nhật thể loại
export const updateGenre = async (id: string, data: Partial<Genre>): Promise<Genre> => {
  const res = await axios.put(`${API_BASE_URL}/users/genres/${id}`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

// 🔴 Xóa thể loại
export const deleteGenre = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/genres/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
};

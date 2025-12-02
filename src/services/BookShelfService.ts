import axios from "axios";
import { API_RK } from "@/config";

export interface Bookshelf {
  bookshelveId: string;
  bookshelveName: string;
  decription: string;
  userId: string;
  isActived: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookshelfRequest {
  bookshelveName: string;
  decription: string;
  userId: string;
}

/* ------------------ 📘 GET all bookshelves ------------------ */
export const getAllBookshelves = async (): Promise<Bookshelf[]> => {
  const res = await axios.get(`${API_RK}/users/bookshelves`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.data;
};

/* ------------------ 📘 GET bookshelf by ID ------------------ */
export const getBookshelfById = async (id: string): Promise<Bookshelf> => {
  const res = await axios.get(`${API_RK}/users/bookshelves/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.data;
};

/* ------------------ ➕ POST create bookshelf ------------------ */
export const createBookshelf = async (
  data: CreateBookshelfRequest
): Promise<Bookshelf> => {
  const res = await axios.post(`${API_RK}/users/bookshelves`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

/* ------------------ ✏️ PUT update bookshelf ------------------ */
export const updateBookshelf = async (
  id: string,
  data: Partial<CreateBookshelfRequest>
): Promise<Bookshelf> => {
  const res = await axios.put(`${API_RK}/users/bookshelves/${id}`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

/* ------------------ ❌ DELETE bookshelf ------------------ */
export const deleteBookshelf = async (id: string): Promise<void> => {
  await axios.delete(`${API_RK}/users/bookshelves/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
};

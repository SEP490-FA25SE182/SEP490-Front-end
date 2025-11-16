// src/services/WalletService.ts
import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface Wallet {
  walletId: string;
  userId: string;
  balance: number;  // tiền thật VND
  coin: number;     // xu
  isActived: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletRequest {
  userId: string;
  balance: number;
  coin: number;
  isActived: string;
}

export interface UpdateWalletRequest {
  balance?: number;
  coin?: number;
  isActived?: string;
}

/* ---------------------------------------------
📌 Lấy ví theo ID
--------------------------------------------- */
export const getWalletById = async (id: string): Promise<Wallet> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.data;
};

/* ---------------------------------------------
📌 Lấy ví theo userId (1 ví duy nhất)
--------------------------------------------- */
export const getWalletByUserId = async (userId: string): Promise<Wallet> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/user/${userId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.data;
};

/* ---------------------------------------------
📌 Lấy tất cả ví (mảng)
--------------------------------------------- */
export const getAllWallets = async (): Promise<Wallet[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.data;
};

/* ---------------------------------------------
📌 Tạo ví mới
--------------------------------------------- */
export const createWallet = async (
  body: CreateWalletRequest
): Promise<Wallet> => {
  const res = await axios.post(`${API_BASE_URL}/users/wallets`, [body], {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data; // backend trả object
};

/* ---------------------------------------------
📌 Cập nhật ví
--------------------------------------------- */
export const updateWallet = async (
  walletId: string,
  body: UpdateWalletRequest
): Promise<Wallet> => {
  const res = await axios.put(`${API_BASE_URL}/users/wallets/${walletId}`, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

/* ---------------------------------------------
📌 Xóa ví
--------------------------------------------- */
export const deleteWallet = async (walletId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/wallets/${walletId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
};

/* ---------------------------------------------
📌 Search ví
--------------------------------------------- */
export const searchWallets = async (query: string): Promise<Wallet[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/search?q=${query}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.data;
};

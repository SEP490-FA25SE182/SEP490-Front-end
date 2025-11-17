// src/services/WalletService.ts
import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface Wallet {
  walletId: string;
  userId: string;
  balance: number;
  coin: number;
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

const headers = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
};

/* Lấy ví theo ID */
export const getWalletById = async (id: string): Promise<Wallet> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/${id}`, { headers });
  return res.data;
};

/* Lấy ví theo userId */
export const getWalletByUserId = async (userId: string): Promise<Wallet> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/user/${userId}`, {
    headers,
  });
  return res.data;
};

/* Lấy tất cả */
export const getAllWallets = async (): Promise<Wallet[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets`, { headers });
  return res.data;
};

/* Tạo ví mới → BE nhận array + trả array */
export const createWallet = async (
  body: CreateWalletRequest
): Promise<Wallet[]> => {
  const res = await axios.post(`${API_BASE_URL}/users/wallets`, [body], {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  return res.data; // array
};

/* Cập nhật ví */
export const updateWallet = async (
  walletId: string,
  body: UpdateWalletRequest
): Promise<Wallet> => {
  const res = await axios.put(`${API_BASE_URL}/users/wallets/${walletId}`, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
  return res.data;
};

/* Xóa ví */
export const deleteWallet = async (walletId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/wallets/${walletId}`, { headers });
};

/* Search ví */
export const searchWallets = async (
  params?: Record<string, string | number | undefined>
): Promise<Wallet[]> => {
  const query = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const res = await axios.get(`${API_BASE_URL}/users/wallets/search?${query}`, {
    headers,
  });

  return res.data;
};

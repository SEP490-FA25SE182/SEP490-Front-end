// src/services/WalletService.ts
import axios from "axios";
import { API_RK } from "@/config";

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

export interface WalletPage {
  content: Wallet[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  // các field khác nếu cần thêm sau
}

const headers = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
};

/* Lấy ví theo ID */
export const getWalletById = async (id: string): Promise<Wallet> => {
  const res = await axios.get(`${API_RK}/users/wallets/${id}`, { headers });
  return res.data;
};

/* Lấy ví theo userId */
export const getWalletByUserId = async (userId: string): Promise<Wallet> => {
  const res = await axios.get(`${API_RK}/users/wallets/user/${userId}`, {
    headers,
  });
  return res.data;
};

/* Lấy tất cả */
export const getAllWallets = async (): Promise<Wallet[]> => {
  const res = await axios.get(`${API_RK}/users/wallets`, { headers });
  return res.data;
};

/* Tạo ví mới → BE nhận array + trả array */
export const createWallet = async (
  body: CreateWalletRequest
): Promise<Wallet> => {
  const res = await axios.post(`${API_RK}/users/wallets`, [body], {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  const arr: Wallet[] = res.data;
  return arr[0]; //  lấy phần tử đầu tiên làm Wallet
};


/* Cập nhật ví */
export const updateWallet = async (
  walletId: string,
  body: UpdateWalletRequest
): Promise<Wallet> => {
  const res = await axios.put(`${API_RK}/users/wallets/${walletId}`, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
  return res.data;
};

/* Xóa ví */
export const deleteWallet = async (walletId: string): Promise<void> => {
  await axios.delete(`${API_RK}/users/wallets/${walletId}`, { headers });
};

/* Search ví */
export const searchWallets = async (
  params?: Record<string, string | number | undefined>
): Promise<WalletPage> => {
  const query = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const res = await axios.get(
    `${API_RK}/users/wallets/search${query ? `?${query}` : ""}`,
    { headers }
  );

  return res.data as WalletPage;
};
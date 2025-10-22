import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface Wallet {
  walletId: string;
  userId: string;
  balance: number;
  currency: string;
  isActived: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletRequest {
  userId: string;
  balance?: number;
  currency?: string;
  isActived?: string;
}

export interface UpdateWalletRequest {
  balance?: number;
  currency?: string;
  isActived?: string;
}

/* ---------------------------------------------
📦 Lấy tất cả ví
--------------------------------------------- */
export const getAllWallets = async (): Promise<Wallet[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

/* ---------------------------------------------
📦 Tạo mới ví
--------------------------------------------- */
export const createWallet = async (
  data: CreateWalletRequest
): Promise<Wallet> => {
  console.log("📤 Creating wallet:", data);
  const res = await axios.post(`${API_BASE_URL}/users/wallets`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  console.log("✅ Wallet created:", res.data);
  return res.data;
};

/* ---------------------------------------------
📦 Lấy ví theo id
--------------------------------------------- */
export const getWalletById = async (id: string): Promise<Wallet> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

/* ---------------------------------------------
📦 Cập nhật ví theo id
--------------------------------------------- */
export const updateWallet = async (
  id: string,
  data: UpdateWalletRequest
): Promise<Wallet> => {
  console.log("🛠 Updating wallet:", id, data);
  const res = await axios.put(`${API_BASE_URL}/users/wallets/${id}`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  console.log("✅ Wallet updated:", res.data);
  return res.data;
};

/* ---------------------------------------------
📦 Xóa ví theo id
--------------------------------------------- */
export const deleteWallet = async (id: string): Promise<void> => {
  console.log("🗑 Deleting wallet:", id);
  await axios.delete(`${API_BASE_URL}/users/wallets/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
};

/* ---------------------------------------------
📦 Lấy ví theo userId
--------------------------------------------- */
export const getWalletByUserId = async (userId: string): Promise<Wallet> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/user/${userId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

/* ---------------------------------------------
📦 Tìm kiếm ví (ví dụ: theo email, userId, hoặc trạng thái)
--------------------------------------------- */
export const searchWallets = async (query: string): Promise<Wallet[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/wallets/search`, {
    params: { q: query },
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};

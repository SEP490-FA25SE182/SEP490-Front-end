import axios from "axios";
import { API_BASE_URL } from "@/config";

/* ------------------------------------------
 🧩 Kiểu type của Transaction từ BE
------------------------------------------ */
export type TransactionType =
  | "PAYMENT"
  | "REFUND"
  | "SETTLEMENT"
  | "DEPOSIT"
  | "WITHDRAW";

/* ------------------------------------------
 🧩 RESPONSE khi BE trả về Transaction
------------------------------------------ */
export interface TransactionResponse {
  transactionId: string;
  totalPrice: number;
  status: number; 
  orderCode: number;
  orderId: string;
  paymentMethodId: string;
  walletId: string;
  transType: TransactionType;
  isActived: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSearchResponse {
  content: TransactionResponse[];
  totalPages: number;
  totalElements: number;
}


/* ------------------------------------------
 🧩 REQUEST BODY chuẩn khi tạo transaction
------------------------------------------ */
export interface TransactionRequest {
  totalPrice: number;
  status: number; 
  orderId: string;
  paymentMethodId: string;
  walletId: string;
  transType: TransactionType; // PAYMENT / REFUND / ...
  isActived: "ACTIVE" | "INACTIVE";
}

/* ------------------------------------------
 ⚙️ TransactionService
------------------------------------------ */
export const TransactionService = {
  // 🔹 Lấy transaction theo ID
  async getById(id: string): Promise<TransactionResponse> {
    const res = await axios.get(`${API_BASE_URL}/transactions/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔹 Tạo transaction mới (PAYMENT, REFUND, ...)
  async create(data: TransactionRequest): Promise<TransactionResponse> {
    const res = await axios.post(`${API_BASE_URL}/transactions`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔹 Cập nhật transaction theo ID
  async update(
    id: string,
    data: Partial<TransactionRequest>
  ): Promise<TransactionResponse> {
    const res = await axios.put(`${API_BASE_URL}/transactions/${id}`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔹 Xóa transaction
  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/transactions/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },

  // 🔹 Tìm kiếm transaction theo: orderId, paymentMethodId, transType, ...
  async search(
  params?: Record<string, string | number | undefined>
): Promise<TransactionSearchResponse> {
  const query = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        acc[k] = String(v);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const res = await axios.get(`${API_BASE_URL}/transactions/search?${query}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return res.data; // { content: [...], totalPages, totalElements }
}
};

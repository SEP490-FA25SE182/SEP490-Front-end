// src/services/TransactionService.ts
import axios from "axios";
import { API_BASE_URL } from "@/config";

/* ------------------------------------------
 🧩 Interface định nghĩa kiểu dữ liệu
------------------------------------------ */
export interface Transaction {
  transactionId: string;
  userId: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  description: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------
 🧩 Request body khi tạo / cập nhật transaction
------------------------------------------ */
export interface CreateTransactionRequest {
  userId: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  description?: string;
  status?: "PENDING" | "SUCCESS" | "FAILED";
}

export interface UpdateTransactionRequest {
  amount?: number;
  type?: "CREDIT" | "DEBIT";
  description?: string;
  status?: "PENDING" | "SUCCESS" | "FAILED";
}

export interface TransactionRequest {
  totalPrice: number;
  status: number;
  orderCode: number;
  orderId: string;
  paymentMethodId: string;
  isActived: "ACTIVE" | "INACTIVE";
}

export interface TransactionResponse {
  transactionId: string;
  totalPrice: number;
  status: string;
  orderCode: number;
  orderId: string;
  paymentMethodId: string;
  isActived: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------
 ⚙️ TransactionService
------------------------------------------ */
export const TransactionService = {
  // 🔹 Lấy transaction theo ID
  async getById(id: string): Promise<Transaction> {
    const res = await axios.get(`${API_BASE_URL}/transactions/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔹 Tạo mới transaction
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
  async update(id: string, data: UpdateTransactionRequest): Promise<Transaction> {
    const res = await axios.put(`${API_BASE_URL}/transactions/${id}`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔹 Xóa transaction theo ID
  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/transactions/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },

  // 🔹 Tìm kiếm transaction (ví dụ: theo userId, status,...)
  async search(params?: Record<string, string | number | undefined>): Promise<Transaction[]> {
    const query = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const res = await axios.get(`${API_BASE_URL}/transactions/search?${query}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },
};

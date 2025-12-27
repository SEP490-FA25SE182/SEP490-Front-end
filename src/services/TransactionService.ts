import axios from "axios";
import { API_RK } from "@/config";

/* ------------------------------------------
 🧩 Kiểu type của Transaction từ BE
------------------------------------------ */
export type TransactionType =
  | "PAYMENT"
  | "REFUND"
  | "SETTLEMENT"
  | "DEPOSIT"
  | "WITHDRAW"
  | "AI_IMAGE"
  | "AI_MODEL";

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
  orderId?: string | null;
  paymentMethodId: string;
  walletId?: string;
  transType: TransactionType; // PAYMENT / REFUND / ...
  isActived: "ACTIVE" | "INACTIVE";
}

/* ⭐ NEW: Request riêng cho API /transactions/wallet/pay */
export interface WalletPayRequest {
  totalPrice: number;
  status: number;
  userId: string;
  transType: TransactionType; // "AI_IMAGE", "AI_MODEL", ...
  isActived: "ACTIVE" | "INACTIVE";

  // các field dưới đây là OPTIONAL, muốn thì gửi, không thì bỏ
  paymentMethodId?: string | null;
  walletId?: string | null;
}

/* ------------------------------------------
 ⚙️ TransactionService
------------------------------------------ */
export const TransactionService = {
  // 🔹 Lấy transaction theo ID
  async getById(id: string): Promise<TransactionResponse> {
    const res = await axios.get(`${API_RK}/transactions/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔹 Tạo transaction mới (PAYMENT, REFUND, ...)
  async create(data: TransactionRequest): Promise<TransactionResponse> {
    const res = await axios.post(`${API_RK}/transactions`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // Tạo transaction cho COD
  async createCOD(data: TransactionRequest): Promise<TransactionResponse> {
    const res = await axios.post(`${API_RK}/transactions/cod`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // ⭐ NEW: Thanh toán bằng ví /api/rookie/transactions/wallet/pay
  async walletPay(data: WalletPayRequest): Promise<TransactionResponse> {
    const res = await axios.post(
      `${API_RK}/transactions/wallet/pay`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    return res.data;
  },

  // 🔹 Cập nhật transaction theo ID
  async update(
    id: string,
    data: Partial<TransactionRequest>
  ): Promise<TransactionResponse> {
    const res = await axios.put(`${API_RK}/transactions/${id}`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔹 Xóa transaction
  async delete(id: string): Promise<void> {
    await axios.delete(`${API_RK}/transactions/${id}`, {
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

    const res = await axios.get(`${API_RK}/transactions/search?${query}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    return res.data; // { content: [...], totalPages, totalElements }
  },

  async searchTransactions(params?: {
    walletId?: string;
    orderId?: string;
    status?:number              // ✅ add
    transType?: TransactionType;   // ✅ add
    page?: number;
    size?: number;
    sort?: string[];
  }) {
    const qp = new URLSearchParams();

    if (params?.walletId) qp.set("walletId", String(params.walletId));
    if (params?.orderId) qp.set("orderId", String(params.orderId));        
    if (params?.transType) qp.set("transType", String(params.transType)); 

    if (params?.page !== undefined) qp.set("page", String(params.page));
    if (params?.size !== undefined) qp.set("size", String(params.size));
    if (params?.sort) params.sort.forEach((s) => qp.append("sort", s));

    const res = await axios.get(`${API_RK}/transactions/search?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    return res.data; // { content: [...], pageable... }
  },
};

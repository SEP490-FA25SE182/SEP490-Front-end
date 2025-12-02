import axios from "axios";
import { API_RK } from "@/config";

export interface PaymentMethod {
  paymentMethodId: string;
  methodName: string;
  provider: string;
  decription: string;
  isActived: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface PaymentMethodRequest {
  methodName: string;
  provider: string;
  decription: string;
  isActived: "ACTIVE" | "INACTIVE";
}

/** Lấy tất cả phương thức thanh toán (search page) */
export const getAllPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const res = await axios.get(`${API_RK}/payment-methods/search`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });

    // BE trả Page => lấy content
    return res.data?.content ?? [];
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách phương thức thanh toán:", error);
    return [];
  }
};

/** Lấy chi tiết theo ID */
export const getPaymentMethodById = async (
  id: string
): Promise<PaymentMethod> => {
  const res = await axios.get(`${API_RK}/payment-methods/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
  return res.data;
};

/** Tạo mới phương thức thanh toán */
export const createPaymentMethod = async (
  data: PaymentMethodRequest
): Promise<PaymentMethod> => {
  const res = await axios.post(`${API_RK}/payment-methods`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
  return res.data;
};

/** Cập nhật phương thức theo ID */
export const updatePaymentMethod = async (
  id: string,
  data: PaymentMethodRequest
): Promise<PaymentMethod> => {
  const res = await axios.put(`${API_RK}/payment-methods/${id}`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
  return res.data;
};

/** Xoá phương thức thanh toán theo ID */
export const deletePaymentMethod = async (id: string): Promise<void> => {
  await axios.delete(`${API_RK}/payment-methods/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
};

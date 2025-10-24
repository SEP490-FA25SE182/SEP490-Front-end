// src/services/OrderDetailService.ts
import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface CreateOrderDetailRequest {
  quantity: number;
  price: number;
  orderId: string;
  bookId: string;
}

export interface OrderDetailResponse {
  orderDetailId: string;
  orderId: string;
  bookId: string;
  quantity: number;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

export const OrderDetailService = {
  // 🆕 Tạo mới Order Detail
  async createOrderDetail(details: CreateOrderDetailRequest[]): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/users/order/order-details`, details, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  // 🔍 Lấy toàn bộ order detail
  async getAllOrderDetails(): Promise<OrderDetailResponse[]> {
    const res = await axios.get(`${API_BASE_URL}/users/order/order-details`);
    return res.data;
  },

  // 🔍 Lấy order detail theo ID
  async getOrderDetailById(id: string): Promise<OrderDetailResponse> {
    const res = await axios.get(`${API_BASE_URL}/users/order/order-details/${id}`);
    return res.data;
  },

  // 🔍 Lấy danh sách order detail theo orderId
  async getOrderDetailsByOrderId(orderId: string): Promise<OrderDetailResponse[]> {
    const res = await axios.get(`${API_BASE_URL}/users/order/order-details/order/${orderId}`);
    return res.data;
  },

  // ✏️ Cập nhật order detail
  async updateOrderDetail(id: string, data: Partial<CreateOrderDetailRequest>): Promise<OrderDetailResponse> {
    const res = await axios.put(`${API_BASE_URL}/users/order/order-details/${id}`, data);
    return res.data;
  },

  // ❌ Xóa order detail
  async deleteOrderDetail(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/users/order/order-details/${id}`);
  },
};

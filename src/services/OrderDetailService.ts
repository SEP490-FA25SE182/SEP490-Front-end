// src/services/OrderDetailService.ts
import axios from "axios";

const API_BASE_URL = "http://localhost:8081/api/rookie/users/order/order-details";

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
    const res = await axios.post(API_BASE_URL, details, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  // 🔍 Lấy toàn bộ order detail
  async getAllOrderDetails(): Promise<OrderDetailResponse[]> {
    const res = await axios.get(API_BASE_URL);
    return res.data;
  },

  // 🔍 Lấy order detail theo ID
  async getOrderDetailById(id: string): Promise<OrderDetailResponse> {
    const res = await axios.get(`${API_BASE_URL}/${id}`);
    return res.data;
  },

  // 🔍 Lấy danh sách order detail theo orderId
  async getOrderDetailsByOrderId(orderId: string): Promise<OrderDetailResponse[]> {
    const res = await axios.get(`${API_BASE_URL}/order/${orderId}`);
    return res.data;
  },

  // ✏️ Cập nhật order detail
  async updateOrderDetail(id: string, data: Partial<CreateOrderDetailRequest>): Promise<OrderDetailResponse> {
    const res = await axios.put(`${API_BASE_URL}/${id}`, data);
    return res.data;
  },

  // ❌ Xóa order detail
  async deleteOrderDetail(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/${id}`);
  },
};

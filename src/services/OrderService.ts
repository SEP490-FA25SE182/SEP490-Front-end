// src/services/OrderService.ts
import axios from "axios";

const API_BASE_URL = "http://localhost:8081/api/rookie/users/orders";

export interface CreateOrderRequest {
  amount: number;
  totalPrice: number;
  status: number;
  cartId: string;
  walletId: string;
}

export interface OrderResponse {
  orderId: string;
  amount: number;
  totalPrice: number;
  status: string;
  cartId: string;
  walletId: string;
  createdAt?: string;
  updatedAt?: string;
  
}

export const OrderService = {
  // 🆕 Tạo mới Order
  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    console.log("📦 Gửi request tạo order:", data);

    const res = await axios.post(API_BASE_URL, [data], {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Tạo order thành công:", res.data);
    return Array.isArray(res.data) ? res.data[0] : res.data;
  },

  // 🔍 Lấy tất cả orders
  async getAllOrders(): Promise<OrderResponse[]> {
    const res = await axios.get(API_BASE_URL);
    return res.data;
  },

  // 🔍 Lấy order theo ID
  async getOrderById(orderId: string): Promise<OrderResponse> {
    const res = await axios.get(`${API_BASE_URL}/${orderId}`);
    return res.data;
  },

  // ✏️ Cập nhật order
  async updateOrder(orderId: string, data: Partial<CreateOrderRequest>): Promise<OrderResponse> {
    const res = await axios.put(`${API_BASE_URL}/${orderId}`, data);
    return res.data;
  },

  // ❌ Xóa order
  async deleteOrder(orderId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/${orderId}`);
  },

  // 🔍 Lấy order theo cartId
  async getOrderByCartId(cartId: string): Promise<OrderResponse> {
    const res = await axios.get(`${API_BASE_URL}/cart/${cartId}`);
    return res.data;
  },
};

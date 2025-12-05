// src/services/OrderService.ts
import axios from "axios";
import { API_RK } from "@/config";

export interface CreateOrderRequest {
  amount: number;
  totalPrice: number;
  status: number;
  cartId: string;
  walletId: string;
  reason?: string;
  imageUrl?: string;
  
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
  userAddressId: string;
  reason?: string;
  imageUrl?: string;

}

export const OrderService = {
  // 🆕 Tạo mới Order
  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    console.log("📦 Gửi request tạo order:", data);

    const res = await axios.post(`${API_RK}/users/orders`, [data], {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Tạo order thành công:", res.data);
    return Array.isArray(res.data) ? res.data[0] : res.data;
  },

  // ✨ TẠO MỚI: Tạo Order từ Cart và Wallet ✨
  async createOrderFromCart(
    cartId: string,
    walletId: string,
    usePoints: boolean,
    cartItemIds: string[]
  ): Promise<OrderResponse> {
    const url = `${API_RK}/users/orders/from-cart/${cartId}/wallet/${walletId}?usePoints=${usePoints}`;

    try {
      // 🟢 Gọi API (không cần body)
      const res = await axios.post(
        url,
        cartItemIds, // ✅ Body đúng backend
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
          },
        });

      console.log("✅ Tạo order từ cart thành công:", res.data);
      return res.data as OrderResponse;
    } catch (error: any) {
      console.error("❌ Lỗi khi tạo order từ cart:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Không thể tạo order từ cart.");
    }
  },


  // 🔍 Lấy tất cả orders
  async getAllOrders(): Promise<OrderResponse[]> {
    const res = await axios.get(`${API_RK}/users/orders`);
    return res.data;
  },

  // 🔍 Lấy order theo ID
  async getOrderById(orderId: string): Promise<OrderResponse> {
    const res = await axios.get(`${API_RK}/users/orders/${orderId}`);
    return res.data;
  },

  // ✏️ Cập nhật order
  async updateOrder(orderId: string, data: Partial<CreateOrderRequest>): Promise<OrderResponse> {
    const res = await axios.put(`${API_RK}/users/orders/${orderId}`, data);
    return res.data;
  },

  // ❌ Xóa order
  async deleteOrder(orderId: string): Promise<void> {
    await axios.delete(`${API_RK}/users/orders/${orderId}`);
  },

  // 🔍 Lấy order theo cartId
  async getOrderByCartId(cartId: string): Promise<OrderResponse> {
    const res = await axios.get(`${API_RK}/users/orders/cart/${cartId}`);
    return res.data;
  },

  // 🔍 Tìm orders theo bộ lọc (userId, status, page, size, sort)
  async searchOrders(params: {
    userId?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string[];
  }): Promise<any> {
    const res = await axios.get(`${API_RK}/users/orders/search`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    return res.data;
  },
};

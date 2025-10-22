import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface Cart {
  cartId: string;
  userId: string;
  isActived: string;
  createdAt: string;
  updatedAt: string;
}

export const CartService = {
  // 🟢 Lấy giỏ hàng theo userId
  async getCartByUserId(userId: string): Promise<Cart | null> {
    try {
      const res = await axios.get(`${API_BASE_URL}/users/carts/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // 🟢 Trường hợp BE trả về object
      if (!res.data) return null;
      if (Array.isArray(res.data)) return res.data[0] || null;
      return res.data;
    } catch (error: any) {
      // 🟡 Nếu BE ném 500 → hiểu là "chưa có giỏ hàng", trả null
      if (error.response?.status === 500) {
        console.warn("⚠️ Chưa có giỏ hàng cho user này, trả về null.");
        return null;
      }

      // 🟠 Nếu lỗi khác thì vẫn ném ra để debug
      console.error("❌ Lỗi khi gọi getCartByUserId:", error);
      throw error;
    }
  },

  // 🟢 Tạo giỏ hàng mới
  async createCart(userId: string): Promise<Cart> {
    const payload = [
      {
        amount: 0,
        totalPrice: 0,
        userId, // ✅ Giờ BE yêu cầu có userId
        isActived: "ACTIVE",
      },
    ];

    console.log("📦 Gửi request tạo giỏ hàng:", payload);

    const res = await axios.post(`${API_BASE_URL}/users/carts`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    console.log("✅ Phản hồi tạo giỏ hàng:", res.data);
    return Array.isArray(res.data) ? res.data[0] : res.data;
  },

  // 🔴 Xóa giỏ hàng
  async deleteCart(cartId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/users/carts/${cartId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
  },
};

import axios from "axios";
import { API_RK } from "@/config";

export interface CartItem {
  cartItemId: string;
  cartId: string;
  bookId: string;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export const CartItemService = {
  // 🟢 Lấy danh sách item theo cartId
  async getItemsByCartId(cartId: string): Promise<CartItem[]> {
    const res = await axios.get(`${API_RK}/users/carts/cart-items/cart/${cartId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return Array.isArray(res.data) ? res.data : res.data?.content || [];
  },

  // 🟡 Thêm item vào giỏ
  async addCartItem(cartId: string, bookId: string, quantity: number, price: number) {
    const body = {
      quantity,
      price,
      cartId, // 🔥 thêm vào đúng theo BE yêu cầu
      bookId,
    };

    console.log("📦 Gửi request tạo CartItem:", body);

    const res = await axios.post(`${API_RK}/users/carts/cart-items/cart/${cartId}`, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    return res.data;
  },

  // 🟡 Cập nhật item
  async updateCartItem(cartItemId: string, quantity: number): Promise<CartItem> {
    const payload = { quantity };
    const res = await axios.put(`${API_RK}/users/carts/cart-items/${cartItemId}`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  },

  // 🔴 Xóa 1 item
  async deleteCartItem(cartItemId: string): Promise<void> {
    await axios.delete(`${API_RK}/users/carts/cart-items/${cartItemId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
  },

  // 🔴 Xóa toàn bộ item trong giỏ
  async clearCart(cartId: string): Promise<void> {
    await axios.delete(`${API_RK}/users/carts/cart-items/cart/${cartId}/clear`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
  },
};

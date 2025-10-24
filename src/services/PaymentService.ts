// src/services/PaymentService.ts
import axios from "axios";
import { API_BASE_URL } from "@/config";

/* =====================================================
   🧾 TYPE DEFINITIONS
===================================================== */
export interface PaymentCheckoutResponse {
  amount: number;
  checkoutUrl: string;
  orderCode: number;
  paymentLinkId: string;
  qrCode: string;
}

export interface PaymentWebhookRequest {
  code: string;
  desc: string;
  success: boolean;
  data: Record<string, any>;
  signature: string;
}

export interface PaymentWebhookResponse {
  code: string;
  desc: string;
  success: boolean;
}

/* =====================================================
   💳 PAYMENT SERVICE
===================================================== */
export const PaymentService = {
  /**
   * 🧾 Gọi PayOS để tạo thanh toán cho orderId
   * Trả về checkout URL để redirect người dùng
   */
  async createPaymentCheckout(orderId: string): Promise<PaymentCheckoutResponse> {
    console.log("📦 Gửi request tạo thanh toán PayOS cho order:", orderId);

    const res = await axios.post(`${API_BASE_URL}/payments/${orderId}/checkout`, null, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Kết quả tạo thanh toán:", res.data);
    return res.data as PaymentCheckoutResponse;
  },

  /**
   * 📩 Webhook từ PayOS → được backend gọi, 
   * FE chỉ dùng để test hoặc gửi manual mock (nếu cần)
   */
  async webhookCallback(payload: PaymentWebhookRequest): Promise<PaymentWebhookResponse> {
    console.log("📨 Gửi dữ liệu webhook:", payload);

    const res = await axios.post(`${API_BASE_URL}/payments/webhook`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Phản hồi webhook:", res.data);
    return res.data as PaymentWebhookResponse;
  },
};

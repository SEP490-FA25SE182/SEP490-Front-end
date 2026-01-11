// src/services/PaymentService.ts
import axios from "axios";
import { API_RK } from "@/config";

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
   🔁 PAYOS REDIRECT / CANCEL CALLBACK
===================================================== */
export interface PayOSRedirectCallbackParams {
  status?: string;      // ví dụ "CANCELLED"
  cancel?: string;      // "true"
  orderCode: number;    // bắt buộc (BE cần)
}

export interface PayOSRedirectCallbackResponse {
  // tuỳ BE trả gì, nếu chưa có thì để any/unknown
  success?: boolean;
  message?: string;
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

    const returnUrl = `${window.location.origin}/payment-status?success=true`;
    const cancelUrl = `${window.location.origin}/payment-status?success=false&orderId=${orderId}`;

    const res = await axios.post(`${API_RK}/payments/${orderId}/checkout`, null, {
      params: { returnUrl, cancelUrl },
      headers: { "Content-Type": "application/json" },
    });

    console.log(" Kết quả tạo thanh toán:", res.data);
    return res.data as PaymentCheckoutResponse;
  },

  /**
   * 📩 Webhook từ PayOS → được backend gọi, 
   * FE chỉ dùng để test hoặc gửi manual mock (nếu cần)
   */
  async webhookCallback(payload: PaymentWebhookRequest): Promise<PaymentWebhookResponse> {
    console.log("📨 Gửi dữ liệu webhook:", payload);

    const res = await axios.post(`${API_RK}/payments/webhook`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log(" Phản hồi webhook:", res.data);
    return res.data as PaymentWebhookResponse;
  },

    /**
   * 🚫 Callback khi user huỷ / thanh toán thất bại (PayOS redirect cancel)
   * FE gọi để BE set Transaction=CANCELED và Order=CANCELLED
   */
  async redirectCancelCallback(
    params: PayOSRedirectCallbackParams
  ): Promise<PayOSRedirectCallbackResponse> {
    console.log("🚫 Gọi callback cancel:", params);

    // Ví dụ endpoint (bạn chỉnh đúng theo controller của BE):
    // GET  /payments/redirect
    const res = await axios.get(`${API_RK}/payments/callback`, {
      params: {
        status: params.status ?? "CANCELLED",
        cancel: params.cancel ?? "true",
        orderCode: params.orderCode,
      },
    });

    console.log(" Phản hồi callback cancel:", res.data);
    return res.data as PayOSRedirectCallbackResponse;
  },

};

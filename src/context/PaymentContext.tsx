import React, { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Interface định nghĩa cấu trúc dữ liệu cho 1 giao dịch thanh toán
 */
export interface PaymentRecord {
  id: string; // UUID duy nhất
  title: string; // mô tả (VD: "Thanh toán 2 sản phẩm" hoặc "Mua ngay: Truyện A")
  method: string; // phương thức thanh toán
  status: "success" | "pending" | "failed"; // trạng thái thanh toán
  amount: number;
  date: string; // ngày giờ ghi nhận giao dịch
}

/**
 * Interface cho Context
 */
interface PaymentContextValue {
  payments: PaymentRecord[]; // danh sách giao dịch
  addPaymentRecord: (record: PaymentRecord) => void; // thêm giao dịch mới
  updatePaymentStatus: (id: string, status: PaymentRecord["status"]) => void; // cập nhật trạng thái
  clearPayments: () => void; // xoá toàn bộ lịch sử
}

/**
 * Tạo Context
 */
const PaymentContext = createContext<PaymentContextValue | null>(null);

/**
 * Provider bao quanh ứng dụng
 */
export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  /**
   * 🧾 Thêm 1 giao dịch mới
   */
  const addPaymentRecord = (record: PaymentRecord) => {
    setPayments((prev) => [record, ...prev]);
  };

  /**
   * 🔄 Cập nhật trạng thái giao dịch (VD: từ pending → success)
   */
  const updatePaymentStatus = (id: string, status: PaymentRecord["status"]) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  /**
   * 🧹 Xoá toàn bộ lịch sử giao dịch
   */
  const clearPayments = () => {
    setPayments([]);
  };

  return (
    <PaymentContext.Provider
      value={{ payments, addPaymentRecord, updatePaymentStatus, clearPayments }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

/**
 * Hook custom để dùng context
 */
export const usePayments = () => {
  const context = useContext(PaymentContext);
  if (!context) throw new Error("usePayments must be used within a PaymentProvider");
  return context;
};

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { formatVND } from "@/lib/money";
import { OrderService } from "@/services/OrderService";

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const success = query.get("success"); // ?success=true / false
  const [status, setStatus] = useState<"pending" | "success" | "failed">("pending");
  const [order, setOrder] = useState<any>(null);

  const fetchOrder = async (orderId: string) => {
  try {
    const res = await OrderService.getOrderById(orderId);
    setOrder(res);
  } catch (error) {
    console.error("❌ Lỗi khi truy vấn order:", error);
  }
};


  useEffect(() => {
  const saved = localStorage.getItem("lastOrder");
  if (saved) {
    const { orderId } = JSON.parse(saved);
    if (orderId) {
      fetchOrder(orderId);
    }
  }
}, []);


  // Gán trạng thái dựa vào query param
  useEffect(() => {
    if (success === "true") setStatus("success");
    else if (success === "false") setStatus("failed");
  }, [success]);

  // Hiệu ứng loading ngắn trước khi hiển thị kết quả
  useEffect(() => {
    if (status === "pending") {
      const timer = setTimeout(() => {
        if (success === "true") setStatus("success");
        else if (success === "false") setStatus("failed");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e] text-white">
      <CustomerHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur text-white">
          <CardHeader>
            <CardTitle className="text-center text-lg">Trạng thái thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {status === "pending" && (
              <>
                <p className="text-sm opacity-80">Đang xác nhận thanh toán...</p>
                <div className="animate-pulse text-yellow-400 font-semibold">
                  Vui lòng đợi trong giây lát ⏳
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <p className="text-green-400 font-semibold text-lg">
                  Thanh toán thành công 🎉
                </p>
                <Separator className="bg-white/10 my-4" />
                <p className="text-sm opacity-80">Cảm ơn bạn đã mua hàng ❤️</p>
                <p className="text-lg font-bold text-green-300">
                  {formatVND(order?.totalPrice ?? 0)} {/* Có thể thay bằng giá trị tạm */}
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => navigate("/transactions")}
                  >
                    Xem đơn hàng
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-gray-300 text-gray-900"
                    onClick={() => navigate("/")}
                  >
                    Về trang chủ
                  </Button>
                </div>
              </>
            )}

            {status === "failed" && (
              <>
                <p className="text-red-400 font-semibold text-lg">
                  Thanh toán thất bại ❌
                </p>
                <Separator className="bg-white/10 my-4" />
                <p className="text-sm opacity-80">
                  Giao dịch không thành công hoặc đã bị hủy.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600"
                    onClick={() => navigate("/transactions")}
                  >
                    Xem đơn hàng
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-gray-300 text-gray-900"
                    onClick={() => navigate("/")}
                  >
                    Về trang chủ
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <CustomerFooter />
    </div>
  );
}

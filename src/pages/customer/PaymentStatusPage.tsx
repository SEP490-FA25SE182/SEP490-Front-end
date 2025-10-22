import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePayments } from "@/context/PaymentContext";
import { useToast } from "@/components/ui/use-toast";
import CustomerFooter from "@/components/customer/CustomerFooter";
import CustomerHeader from "@/components/customer/CustomerHeader";
import { OrderService } from "@/services/OrderService";
import { formatVND } from "@/lib/money";

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addPaymentRecord } = usePayments();

  // 🔹 Lấy thông tin điều hướng
  const location = useLocation() as {
    state?: {
      order?: any;
      method?: string;
      fallback?: boolean;
    };
  };

  const order = location.state?.order;
  const paymentMethod = location.state?.method ?? "Không xác định";

  const [status, setStatus] = useState<"pending" | "success" | "failed">(
    order ? "pending" : "failed"
  );
  const [timeLeft, setTimeLeft] = useState(600); // 10 phút chờ thanh toán
  const [isCounting, setIsCounting] = useState(true);

  // 🕓 Đếm ngược khi đang pending
  useEffect(() => {
    if (status !== "pending") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus("failed");
          toast({
            variant: "destructive",
            title: "Giao dịch hết hạn",
            description: "Đơn hàng đã bị hủy do quá thời gian thanh toán.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, toast]);

  // 🧾 Kiểm tra trạng thái đơn hàng (PayOS callback)
  useEffect(() => {
    if (!order?.orderId) return;

    const checkOrderStatus = async () => {
  try {
    const res = await OrderService.getOrderById(order.orderId);

    // ✅ Ép kiểu về number để so sánh đúng
    const statusCode = Number(res?.status);

    if (statusCode === 4) {
      // DELIVERED / Success
      setStatus("success");
      setIsCounting(false);
      addPaymentRecord({
        id: order.orderId,
        title: `Thanh toán đơn hàng #${order.orderId}`,
        amount: order.totalPrice,
        method: paymentMethod,
        date: new Date().toLocaleString("vi-VN"),
        status: "success",
      });
      toast({
        title: "Thanh toán thành công 🎉",
        description: "Cảm ơn bạn đã mua hàng ❤️",
      });
    } else if (statusCode === 1 || statusCode === 2) {
      setStatus("pending");
    } else if (statusCode === 5) {
      setStatus("failed");
    }
  } catch (error) {
    console.error("❌ Không thể kiểm tra trạng thái đơn hàng:", error);
  }
};


    // Kiểm tra lại sau mỗi 10 giây
    const interval = setInterval(checkOrderStatus, 10000);
    return () => clearInterval(interval);
  }, [order?.orderId]);

  const handleCancel = () => {
    setStatus("failed");
    setIsCounting(false);
    toast({
      variant: "destructive",
      title: "Đã hủy giao dịch",
      description: "Giao dịch đã bị hủy theo yêu cầu của bạn.",
    });
  };

  const handleGoToOrder = () => {
    navigate("/transactions");
};

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

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
                <p className="text-sm opacity-80">Đang chờ thanh toán...</p>
                <p className="text-xl font-semibold">
                  Còn lại: {minutes}:{seconds.toString().padStart(2, "0")}
                </p>
                <Separator className="bg-white/10 my-4" />
                <p className="text-sm opacity-80">
                  Đơn hàng: #{order?.orderId || "Không xác định"}
                </p>
                <p className="text-lg font-bold text-green-300">
                  Tổng tiền: {formatVND(order?.totalPrice ?? 0)}
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="destructive"
                    className="bg-red-500 hover:bg-red-600"
                    onClick={handleCancel}
                  >
                    Hủy thanh toán
                  </Button>
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600"
                    onClick={handleGoToOrder}
                  >
                    Xem đơn hàng
                  </Button>
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <p className="text-green-400 font-semibold text-lg">
                  Thanh toán thành công 🎉
                </p>
                <Separator className="bg-white/10 my-4" />
                <p className="text-sm">Đơn hàng: #{order?.orderId}</p>
                <p className="text-lg font-bold text-green-300">
                  {formatVND(order?.totalPrice ?? 0)}
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={handleGoToOrder}
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
                <p className="text-sm">Đơn hàng: #{order?.orderId}</p>
                <p className="text-lg font-bold text-red-300">
                  {formatVND(order?.totalPrice ?? 0)}
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600"
                    onClick={handleGoToOrder}
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

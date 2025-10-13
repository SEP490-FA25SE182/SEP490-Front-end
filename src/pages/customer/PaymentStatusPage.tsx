import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePayments } from "@/context/PaymentContext";
import { useToast } from "@/components/ui/use-toast";
import CustomerFooter from "@/components/customer/CustomerFooter";
import CustomerHeader from "@/components/customer/CustomerHeader";

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addPaymentRecord } = usePayments();

  // Lấy thông tin giao dịch từ điều hướng (state)
  const location = useLocation() as {
    state?: {
      record: {
        id: string;
        title: string;
        amount: number;
        method: string;
      };
    };
  };

  const [timeLeft, setTimeLeft] = useState(600); // 10 phút = 600 giây
  const [status, setStatus] = useState<"pending" | "success" | "failed">("pending");

  useEffect(() => {
    // Đếm ngược thời gian chờ
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
  }, [toast]);

  const handleCancel = () => {
    setStatus("failed");
    toast({
      variant: "destructive",
      title: "Đã hủy giao dịch",
      description: "Giao dịch đã bị hủy theo yêu cầu của bạn.",
    });
  };

  const handleSuccess = () => {
    setStatus("success");
    toast({
      title: "Thanh toán thành công!",
      description: "Cảm ơn bạn đã mua hàng ❤️",
    });
    addPaymentRecord({
      id: location.state?.record.id ?? crypto.randomUUID(),
      title: location.state?.record.title ?? "Thanh toán không rõ",
      amount: location.state?.record.amount ?? 0,
      method: location.state?.record.method ?? "Không xác định",
      date: new Date().toLocaleString("vi-VN"),
      status: "success",
    });
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className='min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]'>
      <CustomerHeader />
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e] text-white px-4">
      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur text-white">
        <CardHeader>
          <CardTitle className="text-center text-xl">Trạng thái giao dịch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === "pending" && (
            <>
              <p className="text-sm">Đang chờ thanh toán...</p>
              <p className="text-lg font-semibold">
                Còn lại: {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
              <Separator className="bg-white/10" />
              <div className="flex justify-center gap-3">
                <Button
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={handleCancel}
                >
                  Hủy thanh toán
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSuccess}
                >
                  Giả lập thành công
                </Button>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <p className="text-green-400 font-semibold">Thanh toán thành công 🎉</p>
              <Button onClick={() => navigate("/")}>Quay lại trang chủ</Button>
            </>
          )}

          {status === "failed" && (
            <>
              <p className="text-red-400 font-semibold">Thanh toán thất bại ❌</p>
              <Button onClick={() => navigate("/")}>Thử lại / Trang chủ</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    <CustomerFooter/>
    </div>
  );
}

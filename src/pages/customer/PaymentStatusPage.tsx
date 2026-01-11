import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { OrderService } from "@/services/OrderService";
import { PaymentService } from "@/services/PaymentService"; //  thêm
import { useCart } from "@/context/CartContext";

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const success = query.get("success"); // ?success=true / false
  const cancelParam = query.get("cancel"); // "true"
  const statusParam = query.get("status"); // "CANCELLED"
  const orderCodeParam = query.get("orderCode"); // "4014666783"
  const orderIdParam = query.get("orderId");

  const [status, setStatus] = useState<"pending" | "success" | "failed">(
    "pending"
  );
  const [, setOrder] = useState<any>(null);
  const { clearUI } = useCart();

  // const [orderId] = useState<string | null>(null); //  có thể xoá (không dùng)
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const cancelCalledRef = useRef(false);

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
    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (parsed?.orderId) {
      fetchOrder(parsed.orderId);
    }

    if (parsed?.orderCode) {
      setOrderCode(Number(parsed.orderCode));
    }
  }, []);

  useEffect(() => {
    if (orderCodeParam) {
      setOrderCode(Number(orderCodeParam));
    }
  }, [orderCodeParam]);

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
  }, [status, success]); //  thêm success

  //  chỉ clear khi thanh toán thành công
  useEffect(() => {
    if (status !== "success") return; //  thêm điều kiện

    clearUI();
    localStorage.removeItem("lastOrder");
    console.log("🧹 Giỏ hàng đã được xoá sau thanh toán thành công");
  }, [status]);

  useEffect(() => {
    if (status !== "failed") return;
    if (!orderCode) return;
    if (cancelCalledRef.current) return;

    cancelCalledRef.current = true;

    (async () => {
      try {
        console.log("📌 Call cancel callback with:", {
          statusParam,
          cancelParam,
          orderCode,
        });

        await PaymentService.redirectCancelCallback({
          status: statusParam || "CANCELLED",
          cancel: cancelParam || "true",
          orderCode,
        });
        if (orderIdParam) {
          await fetchOrder(orderIdParam); // để UI cập nhật status mới
        }

        localStorage.removeItem("lastOrder");
      } catch (e) {
        console.error("❌ Gọi callback huỷ đơn thất bại:", e);
      }
    })();
  }, [status, orderCode, statusParam, cancelParam]);

  useEffect(() => {
    if (status === "pending") {
      const timer = setTimeout(() => {
        navigate("/");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e] text-white">
      <CustomerHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur text-white">
          <CardHeader>
            <CardTitle className="text-center text-lg">
              Trạng thái thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {status === "pending" && (
              <>
                <p className="text-green-400 font-semibold text-lg">
                  Tạo đơn thành công. Vui lòng chờ xác nhận 🎉
                </p>
                <div className="w-full flex justify-center mt-4">
                  <Button
                    onClick={() => navigate("/")}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Về trang chủ
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
                <p className="text-sm opacity-80">Cảm ơn bạn đã mua hàng ❤️</p>
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

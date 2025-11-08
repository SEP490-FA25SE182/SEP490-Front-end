import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail, getAddressesByUserId } from "@/services/UserService";
import { type Book } from "@/services/BookService";
import {
  PaymentService,
  type PaymentCheckoutResponse,
} from "@/services/PaymentService";

import { OrderService } from "@/services/OrderService";

/* ============================ 🧾 VALIDATION ============================ */
const schema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  phone: z.string().min(9, "SĐT không hợp lệ"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  province: z.string().min(1, "Chọn Tỉnh/TP"),
  district: z.string().min(1, "Chọn Quận/Huyện"),
  ward: z.string().min(1, "Chọn Phường/Xã"),
  address: z.string().min(5, "Địa chỉ chi tiết tối thiểu 5 ký tự"),
  note: z.string().optional(),
  shippingMethod: z.enum(["standard", "express"]),
});
type FormValues = z.infer<typeof schema>;

/* ============================ 💡 HELPERS ============================ */
function formatVND(n: number) {
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}
function getBookName(b: Book): string {
  const anyB = b as any;
  return (
    anyB.book_name ||
    anyB.bookName ||
    anyB.title ||
    anyB.name ||
    "Sách không tên"
  );
}
function getBookImage(b: Book): string | undefined {
  const anyB = b as any;
  return anyB.cover_url || anyB.image_url || anyB.thumbnail || anyB.cover;
}
function getUnit(b: Book): number {
  const anyB = b as any;
  return (anyB?.sale_price ?? anyB?.price ?? 2000) as number;
}

/* ============================ 🏁 MAIN COMPONENT ============================ */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      orderId?: string;
      buyNowLine?: { book: Book; qty: number; }
    };
  };
  const { toast } = useToast();
  const { state: cartState } = useCart();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      try {
        const userRes = await getUserByEmail(user.email);
        if (userRes?.userId) {
          const list = await getAddressesByUserId(userRes.userId);
          setAddresses(list);
          const defaultAddr = list.find((a: any) => a.isDefault === true);
          if (defaultAddr) setSelectedAddressId(defaultAddr.userAddressId);
        }
      } catch (err) {
        console.error("❌ Lỗi load danh sách địa chỉ:", err);
      }
    })();
  }, [user?.email]);


  // const lines = cartState.lines;
  const isBuyNow = !!location.state?.buyNowLine;
  const linesToPay = isBuyNow
    ? [location.state!.buyNowLine!]
    : cartState.lines.map((l) => ({ book: l.book as Book, qty: l.qty }));

  const subtotalLocal = useMemo(
    () => linesToPay.reduce((s, l) => s + getUnit(l.book) * l.qty, 0),
    [linesToPay]
  );

  const effectiveSubtotal = subtotalLocal;
  const shippingFeeMap = { standard: 0, express: 0 };

  const orderId = location.state?.orderId;

  useEffect(() => {
    if (!orderId) {
      toast({
        variant: "destructive",
        title: "Không tìm thấy mã đơn hàng",
        description: "Vui lòng quay lại giỏ hàng và thử lại.",
      });
    }
  }, [orderId]);



  /* ============================ 📝 FORM ============================ */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      province: "",
      district: "",
      ward: "",
      address: "",
      note: "",
      shippingMethod: "standard",
    },
  });

  const shippingFee = shippingFeeMap[form.watch("shippingMethod")] ?? 20000;
  const total = useMemo(
    () => effectiveSubtotal + shippingFee,
    [effectiveSubtotal, shippingFee]
  );

  

  /* ============================ 💰 PAYOS HANDLER ============================ */
  async function handlePayOS(orderId: string) {
    try {
      toast({
        title: "Đang kết nối PayOS...",
        description: "Vui lòng chờ trong giây lát.",
      });

      const currentOrder = await OrderService.getOrderById(orderId);

      const updatePayload = {
      status: Number(currentOrder.status), 
      userAddressId: selectedAddressId, 
    };

      await OrderService.updateOrder(orderId, updatePayload);
      console.log("✅ Đã cập nhật order với địa chỉ giao hàng:", updatePayload);

      const response: PaymentCheckoutResponse =
        await PaymentService.createPaymentCheckout(orderId);
      localStorage.setItem("lastOrder", JSON.stringify(orderId));
      const checkoutUrl = response?.checkoutUrl;

      if (checkoutUrl && checkoutUrl.startsWith("https")) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Không có checkoutUrl hợp lệ từ PayOS");
      }
    } catch (error: any) {
      console.error("❌ Lỗi khi tạo thanh toán PayOS:", error);
      toast({
        variant: "destructive",
        title: "Không thể khởi tạo thanh toán PayOS",
        description: error?.message || "Vui lòng thử lại sau.",
      });
    }
  }

  /* ============================ 🧾 RENDER ============================ */
  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />
      <main className="container mx-auto px-20 py-12">
        <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wide">
          Thanh Toán
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== FORM THÔNG TIN ===== */}
          <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Thông tin Checkout</CardTitle>
              <p className="text-xs text-white/60">
                Thông tin được tự động điền từ hồ sơ của bạn — vui lòng kiểm tra
                lại trước khi thanh toán.
              </p>
            </CardHeader>

            <CardContent>
              <form className="space-y-6" noValidate>

                {/* =================== SỔ ĐỊA CHỈ =================== */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Chọn địa chỉ giao hàng
                  </h3>

                  {addresses.length === 0 ? (
                    <p className="text-white/60 text-sm">
                      Bạn chưa có địa chỉ nào. Vui lòng thêm trong hồ sơ cá nhân.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((addr) => (
                        <label
                          key={addr.userAddressId}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${selectedAddressId === addr.userAddressId
                            ? "border-blue-500 bg-blue-50/10"
                            : "border-white/10 hover:bg-white/5"
                            }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={addr.userAddressId}
                            checked={selectedAddressId === addr.userAddressId}
                            onChange={() => setSelectedAddressId(addr.userAddressId)}
                          />
                          <div className="text-white">
                            <p className="font-medium">{addr.fullName}</p>
                            <p className="text-sm text-white/70">{addr.phoneNumber}</p>
                            <p className="text-sm text-white/80">{addr.addressInfor}</p>
                            {addr.isDefault && (
                              <span className="text-xs text-blue-400 font-semibold">
                                Mặc định
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </section>


                <Separator className="bg-white/10" />

                {/* =================== SHIP & PAY =================== */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">
                      Vận chuyển
                    </h3>
                    <RadioGroup
                      value={form.watch("shippingMethod")}
                      onValueChange={(v) =>
                        form.setValue("shippingMethod", v as any)
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="ship-standard" />
                        <Label htmlFor="ship-standard" className="text-white">
                          Tiết kiệm (2–4 ngày)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <RadioGroupItem value="express" id="ship-express" />
                        <Label htmlFor="ship-express" className="text-white">
                          Nhanh (1–2 ngày)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* ✅ Hai nút thanh toán */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">
                      Thanh toán
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                      <Button
                        type="button"
                        onClick={() => {
                          if (!selectedAddressId) {
                            toast({
                              variant: "destructive",
                              title: "Chưa chọn địa chỉ!",
                              description: "Vui lòng chọn địa chỉ giao hàng trước khi thanh toán.",
                            });
                            return;
                          }
                          handlePayOS(orderId!);
                        }}
                        className="bg-gradient-to-r from-[#764BA2] to-[#667EEA] text-white font-semibold py-2 rounded-lg hover:opacity-90"
                      >
                        💳 Thanh toán qua PayOS
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          toast({
                            title: "Đặt hàng thành công!",
                            description:
                              "Bạn sẽ thanh toán khi nhận hàng (COD).",
                          });
                          navigate("/payment-status", {
                            state: { paymentMethod: "COD" },
                          });
                        }}
                        className="bg-white text-[#16213E] font-semibold py-2 rounded-lg hover:bg-gray-100"
                      >
                        🧾 Thanh toán tiền mặt (COD)
                      </Button>
                    </div>
                  </div>
                </section>
              </form>
            </CardContent>
          </Card>

          {/* ===== ĐƠN HÀNG ===== */}
          <Card className="bg-white/5 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Đơn hàng của bạn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {linesToPay.map((l, idx) => {
                  const name = getBookName(l.book);
                  const unit = getUnit(l.book);
                  const img = getBookImage(l.book);
                  return (
                    <div
                      key={l.book?.bookId || `book-${idx}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {img && (
                          <img
                            src={img}
                            alt={name}
                            className="h-10 w-8 object-cover rounded"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {name}
                          </p>
                          <p className="text-xs text-white/60">SL: {l.qty}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {formatVND(unit * l.qty)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Separator className="bg-white/10" />
              <div className="space-y-2 text-sm text-white">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{formatVND(effectiveSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span>{formatVND(shippingFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Tổng cộng</span>
                  <span>{formatVND(total)}</span>
                </div>
                <p className="text-xs text-white/60">Đã bao gồm VAT nếu có.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}

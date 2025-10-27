import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail, getAddressesByUserId } from "@/services/UserService";
import { type Book } from "@/services/BookService";
import {
  PaymentService,
  type PaymentCheckoutResponse,
} from "@/services/PaymentService";

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
      buyNowLine?: { book: Book; qty: number; } };
  };
  const { toast } = useToast();
  const { state: cartState } = useCart();
  const { user } = useAuth();

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
  const shippingFeeMap = { standard: 20000, express: 40000 };

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

  /* ============================ 🗺️ LOAD ADDRESS ============================ */
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem("vn_provinces");
    if (cached) {
      setProvinces(JSON.parse(cached));
    } else {
      fetch("https://provinces.open-api.vn/api/?depth=3")
        .then((res) => res.json())
        .then((data) => {
          setProvinces(data);
          localStorage.setItem("vn_provinces", JSON.stringify(data));
        });
    }
  }, []);

  const handleProvinceChange = (provinceName: string) => {
    form.setValue("province", provinceName);
    const selected = provinces.find((p) => p.name === provinceName);
    setDistricts(selected?.districts || []);
    setWards([]);
    form.setValue("district", "");
    form.setValue("ward", "");
  };

  const handleDistrictChange = (districtName: string) => {
    form.setValue("district", districtName);
    const selected = districts.find((d) => d.name === districtName);
    setWards(selected?.wards || []);
    form.setValue("ward", "");
  };

  /* ============================ 👤 AUTOFILL USER INFO ============================ */
  useEffect(() => {
    async function autoFillUserInfo() {
      try {
        if (!user?.email) return;
        const res = await getUserByEmail(user.email);
        if (res) {
          form.setValue("fullName", res.fullName || "");
          form.setValue("phone", res.phoneNumber || "");
          form.setValue("email", res.email || "");
        }

        if (res?.userId) {
          const addresses = await getAddressesByUserId(res.userId);
          if (addresses?.length) {
            const addr =
              addresses.find((a: any) => a.isActived === "ACTIVE") ||
              addresses[0];
            if (addr?.addressInfor) {
              const parts = addr.addressInfor
                .split(",")
                .map((s: string) => s.trim());
              const province = parts.at(-1) || "";
              const district = parts.at(-2) || "";
              const ward = parts.at(-3) || "";
              const detail = parts.slice(0, -3).join(", ") || "";
              form.setValue("province", province);
              form.setValue("district", district);
              form.setValue("ward", ward);
              form.setValue("address", detail);
            }
          }
        }
      } catch (err) {
        console.error("❌ Autofill user info failed:", err);
      }
    }
    autoFillUserInfo();
  }, [user, form]);

  /* ============================ 💰 PAYOS HANDLER ============================ */
  async function handlePayOS(orderId: string) {
    try {
      toast({
        title: "Đang kết nối PayOS...",
        description: "Vui lòng chờ trong giây lát.",
      });

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
                {/* =================== LIÊN HỆ =================== */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Thông tin liên hệ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="fullName" className="text-white">
                        Họ và tên
                      </Label>
                      <Input
                        {...form.register("fullName")}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-white">
                        Số điện thoại
                      </Label>
                      <Input
                        {...form.register("phone")}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <Label htmlFor="email" className="text-white">
                        Email
                      </Label>
                      <Input
                        {...form.register("email")}
                        type="email"
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>
                </section>

                <Separator className="bg-white/10" />

                {/* =================== ĐỊA CHỈ =================== */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Địa chỉ giao hàng
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-white">Tỉnh/TP</Label>
                      <Select
                        onValueChange={handleProvinceChange}
                        value={form.watch("province")}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Chọn Tỉnh/TP" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f2a44] text-white border-white/10 max-h-64 overflow-auto">
                          {provinces.map((p) => (
                            <SelectItem key={p.code} value={p.name}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Quận/Huyện</Label>
                      <Select
                        onValueChange={handleDistrictChange}
                        value={form.watch("district")}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Chọn Quận/Huyện" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f2a44] text-white border-white/10 max-h-64 overflow-auto">
                          {districts.map((d) => (
                            <SelectItem key={d.code} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Phường/Xã</Label>
                      <Select
                        onValueChange={(v) => form.setValue("ward", v)}
                        value={form.watch("ward")}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Chọn Phường/Xã" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f2a44] text-white border-white/10 max-h-64 overflow-auto">
                          {wards.map((w) => (
                            <SelectItem key={w.code} value={w.name}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white">Địa chỉ chi tiết</Label>
                    <Input
                      {...form.register("address")}
                      placeholder="Số nhà, tên đường..."
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white">Ghi chú</Label>
                    <Textarea
                      {...form.register("note")}
                      rows={3}
                      placeholder="Ghi chú cho shipper…"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
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
                        onClick={() => handlePayOS(orderId!)}
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

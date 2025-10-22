import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";


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
import { PaymentService } from "@/services/PaymentService";
import { OrderService } from "@/services/OrderService";
import { OrderDetailService } from "@/services/OrderDetailService";
import { getWalletByUserId } from "@/services/WalletService";





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
  paymentMethod: z.enum(["payos", "cod"]),
  shippingMethod: z.enum(["standard", "express"]),
});
type FormValues = z.infer<typeof schema>;

/* ============================ 💡 HELPERS ============================ */
function formatVND(n: number) {
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}
function getBookName(b: Book): string {
  const anyB = b as any;
  return anyB.book_name || anyB.bookName || anyB.title || anyB.name || "Sách không tên";
}
function getBookImage(b: Book): string | undefined {
  const anyB = b as any;
  return anyB.cover_url || anyB.image_url || anyB.thumbnail || anyB.cover;
}
function getUnit(b: Book): number {
  const anyB = b as any;
  return (anyB?.sale_price ?? anyB?.price ?? 150000) as number;
}

/* ============================ 🏁 MAIN COMPONENT ============================ */
export default function CheckoutPage() {
  
  const navigate = useNavigate();
  const location = useLocation() as { state?: { buyNowLine?: { book: Book; qty: number } } };
  const { toast } = useToast();
  const { state: cartState, clear } = useCart();
  const { user } = useAuth();
  
  

  const lines = cartState.lines;
  const isBuyNow = !!location.state?.buyNowLine;
const linesToPay = isBuyNow
  ? [location.state!.buyNowLine!]
  : cartState.lines.map((l) => ({ book: l.book as Book, qty: l.qty }));

const subtotalLocal = useMemo(
  () => linesToPay.reduce((s, l) => s + getUnit(l.book) * l.qty, 0),
  [linesToPay]
);

const effectiveSubtotal = subtotalLocal;

  useEffect(() => {
    if (!isBuyNow && (!lines || lines.length === 0)) navigate("/cart");
  }, [isBuyNow, lines, navigate]);

  const shippingFeeMap = { standard: 20000, express: 40000 };

  

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
      paymentMethod: "payos",
      shippingMethod: "standard",
    },
    mode: "onTouched",
  });

  const shippingFee = shippingFeeMap[form.watch("shippingMethod")] ?? 20000;
  const total = useMemo(() => effectiveSubtotal + shippingFee, [effectiveSubtotal, shippingFee]);

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
              addresses.find((a: any) => a.isActived === "ACTIVE") || addresses[0];
            if (addr?.addressInfor) {
              const parts = addr.addressInfor.split(",").map((s: string) => s.trim());
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
  async function handlePayOS(orderId: string, order: any, paymentMethod: string) {
  try {
    const response = await PaymentService.createPaymentCheckout(orderId);
    if (response?.success && response?.data?.checkoutUrl) {
      window.location.href = response.data.checkoutUrl;
    } else {
      throw new Error(response?.desc || "Không có checkoutUrl từ PayOS");
    }
  } catch (error: any) {
    toast({
      variant: "destructive",
      title: "Không thể khởi tạo thanh toán PayOS",
      description: error?.message || "Vui lòng thử lại sau.",
    });

    // ✅ Chuyển sang PaymentStatusPage với trạng thái pending
    navigate("/payment-status", {
      state: {
        order,
        paymentMethod,
        fallback: true,
      },
    });
  }
}


  /* ============================ 💳 SUBMIT ============================ */
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
  try {
    // 🪪 Lấy userId từ email
    const userRes = await getUserByEmail(user!.email);
    const userId = userRes?.userId;

    // 🪙 Lấy ví người dùng theo userId
    const walletRes = await getWalletByUserId(userId);
    const wallet = Array.isArray(walletRes) ? walletRes[0] : walletRes;

    if (!cartState.cartId) throw new Error("Không tìm thấy giỏ hàng hiện tại");
    if (!wallet?.walletId) throw new Error("Không tìm thấy ví người dùng");

    // 1️⃣ Tạo Order
    const orderPayload = {
      amount: linesToPay.length,
      totalPrice: linesToPay.reduce((sum, l) => sum + getUnit(l.book) * l.qty, 0),
      status: 1, // PENDING
      cartId: cartState.cartId,
      walletId: wallet.walletId,
    };

    const order = await OrderService.createOrder(orderPayload);
    const orderId = order?.orderId;
    if (!orderId) throw new Error("Không nhận được orderId từ backend");

    // 2️⃣ Tạo Order Details
    const orderDetails = linesToPay.map((l) => ({
      quantity: l.qty,
      price: getUnit(l.book),
      orderId,
      bookId: l.book.bookId,
    }));
    await OrderDetailService.createOrderDetail(orderDetails);

    // ✅ 3️⃣ Xóa giỏ hàng NGAY SAU KHI tạo order & order detail thành công
    clear();

    // 4️⃣ Thanh toán (PayOS / COD)
    if (data.paymentMethod === "payos") {
      toast({ title: "Đang kết nối PayOS...", description: "Vui lòng chờ..." });
      await handlePayOS(orderId, order, data.paymentMethod);
      return;
    }

    // Nếu COD thì chuyển sang PaymentStatusPage
    toast({
      title: "Đặt hàng thành công!",
      description: "Thanh toán khi nhận hàng.",
    });
    navigate("/payment-status", {
      state: {
        order,
        paymentMethod: data.paymentMethod,
      },
    });
  } catch (err) {
    console.error("❌ Lỗi khi tạo đơn hàng:", err);
    toast({
      variant: "destructive",
      title: "Không thể tạo đơn hàng",
      description: "Vui lòng thử lại sau.",
    });
  }
};






  /* ============================ 🧾 RENDER ============================ */
  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="container mx-auto px-20 py-12">
        <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wide">
          Thanh Toán
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== Form thông tin ===== */}
          <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Thông tin Checkout</CardTitle>
              <p className="text-xs text-white/60">
                Thông tin được tự động điền từ hồ sơ của bạn — vui lòng kiểm tra
                lại trước khi thanh toán.
              </p>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
              >
                {/* =================== LIÊN HỆ =================== */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Thông tin liên hệ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Họ tên */}
                    <div className="space-y-3">
                      <Label htmlFor="fullName" className="text-white">
                        Họ và tên
                      </Label>
                      <Input
                        id="fullName"
                        {...form.register("fullName")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">
                        {form.formState.errors.fullName?.message}
                      </p>
                    </div>

                    {/* SĐT */}
                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-white">
                        Số điện thoại
                      </Label>
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">
                        {form.formState.errors.phone?.message}
                      </p>
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2 space-y-3">
                      <Label htmlFor="email" className="text-white">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">
                        {form.formState.errors.email?.message}
                      </p>
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
                    {/* Province */}
                    <div className="space-y-3">
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
                      <p className="text-sm text-red-400">
                        {form.formState.errors.province?.message}
                      </p>
                    </div>

                    {/* District */}
                    <div className="space-y-3">
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
                      <p className="text-sm text-red-400">
                        {form.formState.errors.district?.message}
                      </p>
                    </div>

                    {/* Ward */}
                    <div className="space-y-3">
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
                      <p className="text-sm text-red-400">
                        {form.formState.errors.ward?.message}
                      </p>
                    </div>
                  </div>

                  {/* Địa chỉ chi tiết */}
                  <div className="md:col-span-3 space-y-3">
                    <Label className="text-white">Địa chỉ chi tiết</Label>
                    <Input
                      placeholder="Số nhà, tên đường..."
                      {...form.register("address")}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                    />
                    <p className="text-sm text-red-400">
                      {form.formState.errors.address?.message}
                    </p>
                  </div>

                  {/* Ghi chú */}
                  <div className="md:col-span-3 space-y-3">
                    <Label className="text-white">Ghi chú</Label>
                    <Textarea
                      rows={3}
                      placeholder="Ghi chú cho shipper…"
                      {...form.register("note")}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
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

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Thanh toán</h3>
<RadioGroup
  value={form.watch("paymentMethod")}
  onValueChange={(v) => form.setValue("paymentMethod", v as any)}
>
  <div className="flex items-center space-x-2">
    <RadioGroupItem
      value="payos"
      id="pay-payos"
      className="peer border-gray-400 data-[state=checked]:bg-white data-[state=checked]:border-white"
    />
    <Label htmlFor="pay-payos" className="text-white">
      Chuyển khoản qua PayOS
    </Label>
  </div>
  <div className="flex items-center space-x-2 mt-2">
    <RadioGroupItem
      value="cod"
      id="pay-cod"
      className="peer border-gray-400 data-[state=checked]:bg-white data-[state=checked]:border-white"
    />
    <Label htmlFor="pay-cod" className="text-white">
      Thanh toán tiền mặt (COD)
    </Label>
  </div>
</RadioGroup>

                  </div>
                </section>

                <div className="pt-2">
                  <Button type="submit" className="w-full md:w-auto">
                    Đặt hàng / Thanh toán
                  </Button>
                </div>
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
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="110"%3E%3Crect width="80" height="110" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
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

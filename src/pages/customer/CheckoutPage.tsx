import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";

import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

import { useCart } from "@/context/CartContext";
import type { Book } from "@/types/books";

const schema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  phone: z.string().min(9, "SĐT không hợp lệ"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  province: z.string().min(1, "Chọn Tỉnh/TP"),
  district: z.string().min(1, "Chọn Quận/Huyện"),
  ward: z.string().min(1, "Chọn Phường/Xã"),
  address: z.string().min(5, "Địa chỉ chi tiết tối thiểu 5 ký tự"),
  note: z.string().optional(),
  paymentMethod: z.enum(["cod", "momo", "bank"]),
  shippingMethod: z.enum(["standard", "express"]),
});
type FormValues = z.infer<typeof schema>;

function formatVND(n: number) {
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function getBookName(b: Book): string {
  const anyB = b as any;
  const candidates = [
    "book_name",
    "bookName",
    "display_name",
    "displayName",
    "name_vi",
    "name",
    "title_vi",
    "title",
  ];
  for (const k of candidates) {
    const v = anyB?.[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return `Sách #${(b as any)?.book_id ?? "?"}`;
}

/** Lấy ảnh bìa nếu có (không bắt buộc) */
function getBookImage(b: Book): string | undefined {
  const anyB = b as any;
  const candidates = ["cover_url", "image_url", "thumbnail", "cover", "image"];
  for (const k of candidates) {
    const v = anyB?.[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

/** Lấy đơn giá (đồng bộ với logic trong CartContext) */
function getUnit(b: Book): number {
  const anyB = b as any;
  return (anyB?.sale_price ?? anyB?.price ?? 150000) as number;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { buyNowLine?: { book: Book; qty: number } } };
  const { toast } = useToast();
  const { state, clear, subtotal } = useCart();
  const lines = state.lines;

  // Xác định chế độ Buy-Now
  const isBuyNow = !!location.state?.buyNowLine;
  const linesToPay = isBuyNow ? [location.state!.buyNowLine!] : lines;

  // Subtotal cục bộ khi Buy-Now (hoặc dùng subtotal giỏ khi cart-mode)
  const subtotalLocal = useMemo(
    () => linesToPay.reduce((s, l) => s + getUnit(l.book) * l.qty, 0),
    [linesToPay]
  );
  const effectiveSubtotal = isBuyNow ? subtotalLocal : subtotal;

  useEffect(() => {
    if (!isBuyNow && (!lines || lines.length === 0)) navigate("/cart");
  }, [isBuyNow, lines, navigate]);

  const shippingFeeMap = { standard: 20000, express: 40000 };

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
      paymentMethod: "cod",
      shippingMethod: "standard",
    },
    mode: "onTouched",
  });

  const shippingFee =
    shippingFeeMap[form.watch("shippingMethod") || "standard"] ?? 20000;
  const total = useMemo(
    () => effectiveSubtotal + shippingFee,
    [effectiveSubtotal, shippingFee]
  );

  async function onSubmit(data: FormValues) {
    const payload = {
      customer: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || undefined,
      },
      shipping: {
        province: data.province,
        district: data.district,
        ward: data.ward,
        address: data.address,
        note: data.note,
        method: data.shippingMethod,
        fee: shippingFee,
      },
      payment: { method: data.paymentMethod },
      items: linesToPay.map((l) => ({
        productId: (l.book as any).book_id,
        unitPrice: getUnit(l.book),
        qty: l.qty,
      })),
      amounts: { subtotal: effectiveSubtotal, shippingFee, total },
    };

    try {
      // const res = await axios.post("/api/orders", payload);
      // const order = res.data;

      if (data.paymentMethod === "momo") {
        toast({ title: "Chuyển tới MoMo", description: "Giả lập redirect..." });
      } else if (data.paymentMethod === "bank") {
        toast({ title: "Chuyển tới trang chuyển khoản", description: "Giả lập redirect..." });
      } else {
        toast({
          title: "Đặt hàng thành công",
          description: isBuyNow
            ? "Đã tạo đơn cho sản phẩm bạn chọn."
            : "Đơn hàng COD đã được tạo.",
        });
        if (!isBuyNow) clear(); // chỉ clear giỏ khi checkout từ giỏ
        navigate("/");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Không thể tạo đơn hàng",
        description: "Vui lòng thử lại sau.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e] ">
      <CustomerHeader />

      <main className="container mx-auto px-20 py-12">
        {/* Tiêu đề trang đồng bộ kiểu homepage */}
        <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wide">
          Thanh Toán
        </h2>

        {/* Lưới nội dung giống bố cục homepage (lưới 3 cột) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form thông tin: span 2 cột */}
          <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Thông tin Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                {/* Liên hệ */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Thông tin liên hệ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="fullName" className="text-white">Họ và tên</Label>
                      <Input
                        id="fullName"
                        {...form.register("fullName")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">{form.formState.errors.fullName?.message}</p>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="phone" className="text-white">Số điện thoại</Label>
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">{form.formState.errors.phone?.message}</p>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <Label htmlFor="email" className="text-white">Email (không bắt buộc)</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">{form.formState.errors.email?.message}</p>
                    </div>
                  </div>
                </section>

                <Separator className="bg-white/10" />

                {/* Địa chỉ */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Địa chỉ giao hàng</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <Label className="text-white">Tỉnh/TP</Label>
                      <Select onValueChange={(v) => form.setValue("province", v)} defaultValue={form.getValues("province")}>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Chọn Tỉnh/TP" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1f2a44] text-white border-white/10">
                          <SelectItem value="HCM">TP. Hồ Chí Minh</SelectItem>
                          <SelectItem value="HN">Hà Nội</SelectItem>
                          <SelectItem value="DN">Đà Nẵng</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-red-400">{form.formState.errors.province?.message}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-white">Quận/Huyện</Label>
                      <Input
                        placeholder="VD: Quận 1"
                        {...form.register("district")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">{form.formState.errors.district?.message}</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-white">Phường/Xã</Label>
                      <Input
                        placeholder="VD: Phường Bến Nghé"
                        {...form.register("ward")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">{form.formState.errors.ward?.message}</p>
                    </div>
                    <div className="md:col-span-3 space-y-3">
                      <Label className="text-white">Địa chỉ chi tiết</Label>
                      <Input
                        placeholder="Số nhà, tên đường..."
                        {...form.register("address")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                      <p className="text-sm text-red-400">{form.formState.errors.address?.message}</p>
                    </div>
                    <div className="md:col-span-3 space-y-3">
                      <Label className="text-white">Ghi chú</Label>
                      <Textarea
                        rows={3}
                        placeholder="Ghi chú cho shipper…"
                        {...form.register("note")}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                </section>

                <Separator className="bg-white/10" />

                {/* Ship & Pay */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Vận chuyển</h3>
                    <RadioGroup
                      value={form.watch("shippingMethod")}
                      onValueChange={(v) => form.setValue("shippingMethod", v as any)}
                      className="text-white"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="ship-standard" />
                        <Label htmlFor="ship-standard" className="text-white">Tiết kiệm (2–4 ngày)</Label>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <RadioGroupItem value="express" id="ship-express" />
                        <Label htmlFor="ship-express" className="text-white">Nhanh (1–2 ngày)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Thanh toán</h3>
                    <RadioGroup
                      value={form.watch("paymentMethod")}
                      onValueChange={(v) => form.setValue("paymentMethod", v as any)}
                      className="text-white"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cod" id="pay-cod" />
                        <Label htmlFor="pay-cod" className="text-white">Thanh toán khi nhận hàng (COD)</Label>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <RadioGroupItem value="momo" id="pay-momo" />
                        <Label htmlFor="pay-momo" className="text-white">Ví MoMo</Label>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <RadioGroupItem value="bank" id="pay-bank" />
                        <Label htmlFor="pay-bank" className="text-white">Chuyển khoản ngân hàng</Label>
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

          {/* Tóm tắt đơn hàng: style đồng bộ với homepage */}
          <Card className="bg-white/5 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Đơn hàng của bạn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {linesToPay.map((l) => {
                  const name = getBookName(l.book);
                  const unit = getUnit(l.book);
                  const img = getBookImage(l.book);
                  return (
                    <div key={(l.book as any).book_id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {img ? (
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
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{name}</p>
                          <p className="text-xs text-white/60">SL: {l.qty}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-white">{formatVND(unit * l.qty)}</p>
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

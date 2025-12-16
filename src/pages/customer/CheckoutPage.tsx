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
import { useToast } from "@/components/ui/use-toast";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail, getAddressesByUserId, createAddress } from "@/services/UserService";
import { type Book } from "@/services/BookService";
import {
  PaymentService,
  type PaymentCheckoutResponse,
} from "@/services/PaymentService";
import { OrderService } from "@/services/OrderService";
import { GhnAddressService } from "@/services/GhnAddressService";
import { TransactionService } from "@/services/TransactionService";

/* ============================ TYPES ============================ */
interface Address {
  userAddressId: string;
  addressInfor: string;
  userId: string;
  isActived: string;
  phoneNumber?: string;
  fullName?: string;
  type?: string;
  default?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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
      buyNowLine?: { book: Book; qty: number };
      usedCoin?: boolean;
    };
  };

  const { toast } = useToast();
  const { state: cartState } = useCart();
  const { user } = useAuth();



  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const FROM_DISTRICT_ID = 1442;
  const FROM_WARD_CODE = "20501";

  const DEFAULT_ITEM_WEIGHT = 300;
  const DEFAULT_ITEM_LENGTH = 20;
  const DEFAULT_ITEM_WIDTH = 12;
  const DEFAULT_ITEM_HEIGHT = 3;

  const [shippingFee, setShippingFee] = useState<number>(0);
  const [addressInput, setAddressInput] = useState("");





  /* ======================= LOAD ADDRESS LIST (GIỮ LOGIC CŨ) ======================= */
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      try {
        const userRes = await getUserByEmail(user.email);
        if (userRes?.userId) {
          const list: Address[] = await getAddressesByUserId(userRes.userId);
          setAddresses(list);

          const defaultAddr =
            list.find((a) => a.default === true) ||
            list.find((a) => a.isActived === "ACTIVE") ||
            list[0];

          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.userAddressId);
          }
        }
      } catch (err) {
        console.error("❌ Lỗi load danh sách địa chỉ:", err);
      }
    })();
  }, [user?.email]);


  /* ======================= CART / ORDER ======================= */
  const usedCoin = location.state?.usedCoin ?? false;

  const isBuyNow = !!location.state?.buyNowLine;
  const linesToPay = isBuyNow
    ? [location.state!.buyNowLine!]
    : cartState.lines.map((l) => ({ book: l.book as Book, qty: l.qty }));

  const subtotalLocal = useMemo(
    () => linesToPay.reduce((s, l) => s + getUnit(l.book) * l.qty, 0),
    [linesToPay]
  );

  const discount = useMemo(() => {
    return usedCoin ? subtotalLocal * 0.1 : 0;
  }, [usedCoin, subtotalLocal]);

  const effectiveSubtotal = useMemo(() => {
    return subtotalLocal - discount;
  }, [subtotalLocal, discount]);


  const orderId = location.state?.orderId;

  useEffect(() => {
    if (!orderId) {
      toast({
        variant: "destructive",
        duration: 1500,
        title: "Không tìm thấy mã đơn hàng",
        description: "Vui lòng quay lại giỏ hàng và thử lại.",
      });
    }
  }, [orderId, toast]);



  /* ============================ 📌 GHN ADDRESS STATES ============================ */
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

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

  const total = effectiveSubtotal + shippingFee;


  /* ============================ 📌 GHN SELECT HANDLERS ============================ */
  async function handleProvinceSelect(id: string) {
    form.setValue("province", id);
    form.setValue("district", "");
    form.setValue("ward", "");

    const d = await GhnAddressService.getDistricts(Number(id));
    setDistricts(d);
    setWards([]);
  }


  async function handleDistrictSelect(id: string) {
    form.setValue("district", id);
    form.setValue("ward", "");

    const w = await GhnAddressService.getWards(Number(id));
    setWards(w);
  }

  useEffect(() => {
    async function updateFee() {
      if (!form.watch("province") || !form.watch("district") || !form.watch("ward")) return;

      const fee = await GhnAddressService.calculateShippingFee({
        length: DEFAULT_ITEM_LENGTH,
        width: DEFAULT_ITEM_WIDTH,
        height: DEFAULT_ITEM_HEIGHT,
        weight: DEFAULT_ITEM_WEIGHT,
        service_type_id: 2,
        from_district_id: FROM_DISTRICT_ID,
        from_ward_code: FROM_WARD_CODE,
        to_district_id: Number(form.watch("district")),
        to_ward_code: form.watch("ward"),
        insurance_value: subtotalLocal
      });

      setShippingFee(fee.total || 0);
    }

    updateFee();
  }, [
    form.watch("province"),
    form.watch("district"),
    form.watch("ward"),
    subtotalLocal
  ]);

  /* ============================ 🤖 AUTOFILL FROM USER + ADDRESS ============================ */
  useEffect(() => {
    async function loadAndAutofill() {
      const pro = await GhnAddressService.getProvinces();
      setProvinces(pro);

      if (!user?.email) return;
      const u = await getUserByEmail(user.email);
      if (!u?.userId) return;

      const addrList = await getAddressesByUserId(u.userId);
      if (!addrList.length) return;

      const addr =
        addrList.find(a => a.default) ||
        addrList.find(a => a.isActived === "ACTIVE") ||
        addrList[0];

      const parts = addr.addressInfor.split(",").map(p => p.trim());
      const len = parts.length;

      const provinceName = parts[len - 1] || "";
      const districtName = parts[len - 2] || "";
      const wardName = parts[len - 3] || "";
      const detail = parts.slice(0, len - 3).join(", ") || "";

      form.setValue("fullName", addr.fullName || u.fullName || "");
      form.setValue("phone", addr.phoneNumber || u.phoneNumber || "");
      form.setValue("email", u.email || "");
      form.setValue("address", detail);
      setAddressInput(detail);

      const cleanProvince = provinceName.replace(/^Tỉnh\s+|^Thành phố\s+/i, "").toLowerCase();
      const p = pro.find((x: any) => x.ProvinceName.toLowerCase() === cleanProvince);
      if (!p) return;

      form.setValue("province", String(p.ProvinceID));
      const dists = await GhnAddressService.getDistricts(p.ProvinceID);
      setDistricts(dists);

      const cleanDistrict = districtName.replace(/^Quận\s+|^Huyện\s+/i, "").toLowerCase();
      const d = dists.find((x: any) => x.DistrictName.toLowerCase().includes(cleanDistrict));
      if (!d) return;

      form.setValue("district", String(d.DistrictID));
      const ws = await GhnAddressService.getWards(d.DistrictID);
      setWards(ws);

      const cleanWard = wardName.replace(/^Xã\s+|^Phường\s+|^Thị trấn\s+/i, "").toLowerCase();
      const w = ws.find((x: any) => x.WardName.toLowerCase().includes(cleanWard));
      if (!w) return;

      form.setValue("ward", String(w.WardCode));
    }

    loadAndAutofill().catch(console.error);
  }, [user, form]);

  function extractDetailAddress(addressInfor: string) {
    const parts = addressInfor.split(",").map(p => p.trim());
    return parts.slice(0, parts.length - 3).join(", ");
  }

  function buildAddressLabel(a: Address) {
    return extractDetailAddress(a.addressInfor);
  }



  async function handleAddressInputChange(value: string) {
    // 🔹 luôn cập nhật form.address
    form.setValue("address", value);

    const matched = addresses.find(
      a => extractDetailAddress(a.addressInfor) === value
    );

    // ❌ Không match → user đang nhập địa chỉ mới
    if (!matched) {
      setSelectedAddressId(null);
      return;
    }

    // ✅ Match địa chỉ đã lưu → autofill
    setSelectedAddressId(matched.userAddressId);

    const parts = matched.addressInfor.split(",").map(p => p.trim());
    const len = parts.length;

    const provinceName = parts[len - 1];
    const districtName = parts[len - 2];
    const wardName = parts[len - 3];
    const detail = parts.slice(0, len - 3).join(", ");

    // 🔹 set lại cho chắc (phòng trim khác nhau)
    if (detail !== addressInput) {
      form.setValue("address", detail);
      setAddressInput(detail);
    }
    form.setValue("fullName", matched.fullName || "");
    form.setValue("phone", matched.phoneNumber || "");

    // --- GHN ---
    const normalize = (s: string) =>
      s
        .replace(
          /^tỉnh\s+|^thành phố\s+|^quận\s+|^huyện\s+|^xã\s+|^phường\s+/i,
          ""
        )
        .trim()
        .toLowerCase();

    const p = provinces.find(
      (x: any) => normalize(x.ProvinceName) === normalize(provinceName)
    );
    if (!p) return;

    form.setValue("province", String(p.ProvinceID));
    const dists = await GhnAddressService.getDistricts(p.ProvinceID);
    setDistricts(dists);

    const d = dists.find(
      (x: any) =>
        normalize(x.DistrictName).includes(normalize(districtName))
    );
    if (!d) return;

    form.setValue("district", String(d.DistrictID));
    const ws = await GhnAddressService.getWards(d.DistrictID);
    setWards(ws);

    const w = ws.find(
      (x: any) => normalize(x.WardName).includes(normalize(wardName))
    );
    if (!w) return;

    form.setValue("ward", String(w.WardCode));
  }





  /* ============================ 💰 PAYOS HANDLER ============================ */
  async function handlePayOS(orderId: string) {
    try {
      toast({
        title: "Đang kết nối PayOS...",
        description: "Vui lòng chờ trong giây lát.",
        duration: 1500,
      });

      const currentOrder = await OrderService.getOrderById(orderId);

      let finalAddressId = selectedAddressId;

      /* ======================================================
       🟦 1. Kiểm tra xem user có chỉnh sửa form hay không
       ====================================================== */
      const selectedAddress = addresses.find(a => a.userAddressId === selectedAddressId);

      const formFullName = form.watch("fullName");
      const formPhone = form.watch("phone");
      const formProvince = form.watch("province");
      const formDistrict = form.watch("district");
      const formWard = form.watch("ward");
      const formDetail = form.watch("address");

      // Tìm lại tên từ provinces / districts / wards
      const provinceObj = provinces.find(p => String(p.ProvinceID) === String(formProvince));
      const districtObj = districts.find(d => String(d.DistrictID) === String(formDistrict));
      const wardObj = wards.find(w => String(w.WardCode) === String(formWard));

      const provinceName = provinceObj?.ProvinceName || "";
      const districtName = districtObj?.DistrictName || "";
      const wardName = wardObj?.WardName || "";

      // Build lại addressInfor từ form
      const formAddressInfor = `${formDetail}, ${wardName}, ${districtName}, ${provinceName}`.trim();

      const isEdited =
        !selectedAddress ||
        selectedAddress.fullName !== formFullName ||
        selectedAddress.phoneNumber !== formPhone ||
        selectedAddress.addressInfor !== formAddressInfor;

      /* ======================================================
       🟩 2. Nếu FORM BỊ CHỈNH SỬA → tạo địa chỉ mới
       ====================================================== */
      if (isEdited) {

        const userRes = await getUserByEmail(user!.email!);

        const newAddressPayload = {
          userId: userRes.userId,
          fullName: formFullName,
          phoneNumber: formPhone,
          addressInfor: formAddressInfor,
          type: "HOME",
          isActived: "ACTIVE",
          default: false,
        };

        const createdAddr = await createAddress(newAddressPayload);

        finalAddressId = createdAddr.userAddressId;
        console.log("🎉 Đã tạo địa chỉ mới:", createdAddr);
      }

      const updatePayload = {
        totalPrice: total,
        status: Number(currentOrder.status),
        userAddressId: finalAddressId,
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
        duration: 1500,
      });
    }
  }

  async function handleCOD() {
    if (!orderId) {
      toast({
        variant: "destructive",
        title: "Không tìm thấy mã đơn hàng",
        description: "Vui lòng quay lại giỏ hàng.",
        duration: 1500,
      });
      return;
    }

    if (
      !form.watch("province") ||
      !form.watch("district") ||
      !form.watch("ward")
    ) {
      toast({
        variant: "destructive",
        title: "Thiếu thông tin địa chỉ",
        description: "Vui lòng chọn đủ tỉnh / huyện / xã.",
        duration: 1500,
      });
      return;
    }

    try {
      let finalAddressId = selectedAddressId;

      const selectedAddress = addresses.find(
        (a) => a.userAddressId === selectedAddressId
      );

      const provinceObj = provinces.find(
        (p) => String(p.ProvinceID) === form.watch("province")
      );
      const districtObj = districts.find(
        (d) => String(d.DistrictID) === form.watch("district")
      );
      const wardObj = wards.find(
        (w) => String(w.WardCode) === form.watch("ward")
      );

      const formAddressInfor = `${form.watch("address")}, ${wardObj?.WardName
        }, ${districtObj?.DistrictName}, ${provinceObj?.ProvinceName
        }`.trim();

      const isEdited =
        !selectedAddress ||
        selectedAddress.addressInfor !== formAddressInfor;

      if (isEdited && user?.email) {
        const userRes = await getUserByEmail(user.email);
        const created = await createAddress({
          userId: userRes.userId,
          fullName: form.watch("fullName"),
          phoneNumber: form.watch("phone"),
          addressInfor: formAddressInfor,
          type: "HOME",
          isActived: "ACTIVE",
          default: false,
        });

        finalAddressId = created.userAddressId;
      }

      // ✅ Update order (bao gồm phí ship)
      const updatePayload = {
        totalPrice: total,
        status: 1,
        userAddressId: finalAddressId,
      };

      await OrderService.updateOrder(orderId, updatePayload);

      //
      await TransactionService.createCOD({
        orderId,
        totalPrice: total,
        transType: "PAYMENT",
        paymentMethodId: "COD",
        status: 0,
        isActived: "ACTIVE",
      });


      toast({
        title: "Đặt hàng thành công!",
        description: "Bạn sẽ thanh toán khi nhận hàng (COD).",
        duration: 1500,
      });

      navigate("/payment-status", {
        state: { paymentMethod: "COD", orderId },
      });
    } catch (err: any) {
      console.error("❌ COD error:", err);
      toast({
        variant: "destructive",
        title: "Lỗi COD",
        description: err?.message || "Không thể đặt hàng COD.",
        duration: 1500,
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
          {/* ====================== FORM ====================== */}
          <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Thông tin Checkout</CardTitle>
              <p className="text-xs text-white/60">
                Thông tin được tự động điền — vui lòng kiểm tra trước khi thanh toán.
              </p>
            </CardHeader>

            <CardContent>
              <form className="space-y-6" noValidate>
                {/* =================== THÔNG TIN GIAO HÀNG =================== */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Thông tin giao hàng</h3>

                  {/* Full name */}
                  <div className="grid gap-2">
                    <Label className="text-white">Họ và tên</Label>
                    <input
                      {...form.register("fullName")}
                      className="w-full p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Họ và tên"
                    />
                  </div>

                  {/* Email + Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-white">Email</Label>
                      <input
                        {...form.register("email")}
                        className="w-full p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Email"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-white">Số điện thoại</Label>
                      <input
                        {...form.register("phone")}
                        className="w-full p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Số điện thoại"
                      />
                    </div>
                  </div>

                  {/* =================== CHỌN / NHẬP ĐỊA CHỈ =================== */}
                  {addresses.length > 0 && (
                    <div className="grid gap-2">
                      <Label className="text-white">Địa chỉ</Label>

                      <input
                        list="saved-addresses"
                        value={addressInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAddressInput(value);
                          form.setValue("address", value);
                        }}
                        onBlur={(e) => {
                          handleAddressInputChange(e.target.value);
                        }}
                        onFocus={() => {
                          setAddressInput("");
                          setSelectedAddressId(null);
                        }}
                        className="w-full p-3 rounded-lg bg-white text-gray-900 border border-gray-300"
                        placeholder="Chọn hoặc nhập địa chỉ"
                      />


                      <datalist id="saved-addresses">
                        {addresses.map((a) => (
                          <option
                            key={a.userAddressId}
                            value={buildAddressLabel(a)}
                          />
                        ))}
                      </datalist>
                    </div>
                  )}





                  {/* Province - District - Ward */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Province */}
                    <div className="grid gap-2">
                      <Label className="text-white">Tỉnh / thành</Label>
                      <select
                        value={form.watch("province")}
                        onChange={(e) => handleProvinceSelect(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Chọn tỉnh / thành</option>
                        {provinces.map((p: any) => (
                          <option key={p.ProvinceID} value={p.ProvinceID}>
                            {p.ProvinceName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* District */}
                    <div className="grid gap-2">
                      <Label className="text-white">Quận / huyện</Label>
                      <select
                        value={form.watch("district")}
                        onChange={(e) => handleDistrictSelect(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Chọn quận / huyện</option>
                        {districts.map((d: any) => (
                          <option key={d.DistrictID} value={d.DistrictID}>
                            {d.DistrictName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ward */}
                    <div className="grid gap-2">
                      <Label className="text-white">Phường / xã</Label>
                      <select
                        value={form.watch("ward")}
                        onChange={(e) => form.setValue("ward", e.target.value)}
                        className="w-full p-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Chọn phường / xã</option>
                        {wards.map((w: any) => (
                          <option key={w.WardCode} value={w.WardCode}>
                            {w.WardName}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>
                </section>


                <Separator className="bg-white/10" />
              </form>
            </CardContent>
          </Card>

          {/* ====================== ĐƠN HÀNG ====================== */}
          <Card className="bg-white/5 border-white/10 backdrop-blur ">
            <CardHeader>
              <CardTitle className="text-white">Đơn hàng của bạn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-auto pr-1
              [scrollbar-width:none]
              [-ms-overflow-style:none]
              [&::-webkit-scrollbar]:hidden">
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
                {usedCoin && (
                  <div className="flex justify-between text-green-400 text-sm mt-2">
                    <span>Đã áp dụng xu (-10%)</span>
                    <span>-{formatVND(discount)}</span>
                  </div>
                )}

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

              <Separator className="bg-white/10" />

              <div className="space-y-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    if (!orderId) {
                      toast({
                        variant: "destructive",
                        title: "Không tìm thấy mã đơn hàng",
                        description: "Vui lòng quay lại giỏ hàng.",
                      });
                      return;
                    }
                    if (
                      !form.watch("province") ||
                      !form.watch("district") ||
                      !form.watch("ward")
                    ) {
                      toast({
                        variant: "destructive",
                        title: "Thiếu thông tin địa chỉ",
                        description: "Vui lòng chọn đủ tỉnh / huyện / xã.",
                        duration: 1500,
                      });
                      return;
                    }
                    handlePayOS(orderId);
                  }}
                  className="w-full bg-gradient-to-r from-[#764BA2] to-[#667EEA] text-white font-semibold py-3 rounded-lg hover:opacity-90"
                >
                  Thanh toán qua PayOS
                </Button>

                <Button
                  type="button"
                  onClick={handleCOD}
                  className="w-full bg-white text-[#16213E] font-semibold py-3 rounded-lg"
                >
                  Thanh toán tiền mặt (COD)
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}

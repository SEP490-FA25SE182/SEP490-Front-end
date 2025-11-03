import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Save, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail, updateUser, type User ,
  getAddressesByUserId,
  createAddress,
  updateAddress,
  deleteAddress,
  type Address,
} from "@/services/UserService";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* --------------------------------------------------
 🧩 ProfilePage Component
-------------------------------------------------- */
export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /* ---------------------------------------------
   🟢 Fetch User Info
  --------------------------------------------- */
  useEffect(() => {
    const fetchUser = async () => {
      if (!authUser?.email) return;
      try {
        setIsLoading(true);
        const data = await getUserByEmail(authUser.email);
        setUser({
          ...data,
          password: data.password || "stringst",
          roleId: data.roleId || "customer",
          isActived: data.isActived || "ACTIVE",
        });
      } catch {
        toast.error("Không thể tải thông tin người dùng.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [authUser?.email]);

  /* ---------------------------------------------
   🏠 Fetch Address List
  --------------------------------------------- */
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user?.userId) return;
      try {
        const data = await getAddressesByUserId(user.userId);
        setAddresses(data);
      } catch {
        toast.error("Không thể tải danh sách địa chỉ.");
      }
    };
    fetchAddresses();
  }, [user?.userId]);

  /* ---------------------------------------------
   ✏️ Update User Info
  --------------------------------------------- */
  const handleSave = async () => {
    if (!user?.userId) return;
    try {
      const payload = {
        userId: user.userId,
        fullName: user.fullName,
        birthDate: user.birthDate,
        gender: user.gender,
        email: user.email,
        password: user.password || "stringst",
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        roleId: user.roleId || "customer",
        isActived: user.isActived || "ACTIVE",
      };
      await updateUser(user.userId, payload);
      toast.success("Cập nhật thông tin thành công!");
      setIsEditing(false);
    } catch {
      toast.error("Cập nhật thất bại!");
    }
  };

  /* ---------------------------------------------
   🏠 Address Handlers (Add / Update / Delete)
  --------------------------------------------- */
  // const handleUpdateAddress = async (addr: Address) => {
  //   try {
  //     await updateAddress(addr.userAddressId, {
  //       addressInfor: addr.addressInfor,
  //       isActived: "ACTIVE",
  //     });
  //     toast.success("Cập nhật địa chỉ thành công!");
  //   } catch {
  //     toast.error("Cập nhật địa chỉ thất bại!");
  //   }
  // };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.userAddressId !== id));
      toast.success("Đã xóa địa chỉ!");
    } catch {
      toast.error("Xóa địa chỉ thất bại!");
    }
  };

  // const handleAddressChange = (id: string, value: string) => {
  //   setAddresses((prev) =>
  //     prev.map((addr) =>
  //       addr.userAddressId === id ? { ...addr, addressInfor: value } : addr
  //     )
  //   );
  // };

  if (isLoading || !user)
    return <p className="text-gray-500">Đang tải thông tin...</p>;

  /* ---------------------------------------------
   🧾 Render
  --------------------------------------------- */
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">
          THÔNG TIN KHÁCH HÀNG
        </h1>
        <Button
          variant="outline"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="flex items-center gap-2"
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4" /> Lưu thay đổi
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" /> Sửa thông tin
            </>
          )}
        </Button>
      </div>

      {/* Thông tin cá nhân */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Avatar */}
        <div className="flex flex-col items-center space-y-4">
          <img
            src={user.avatarUrl || authUser?.avatarUrl}
            alt="Avatar"
            className="w-28 h-28 rounded-full object-cover border-2 border-gray-300 shadow"
          />
          <p className="text-gray-600 text-sm">{user.email}</p>
        </div>

        {/* Thông tin chi tiết */}
        <div className="space-y-3">
          <InfoField
            label="Họ và tên"
            value={user.fullName}
            editable={isEditing}
            onChange={(v) => setUser({ ...user, fullName: v })}
          />

          <InfoField
            label="Ngày sinh"
            type="date"
            value={user.birthDate?.split("T")[0] || ""}
            editable={isEditing}
            onChange={(v) => setUser({ ...user, birthDate: v })}
          />

          <div>
            <Label>Giới tính</Label>
            {isEditing ? (
              <Select
                value={user.gender || ""}
                onValueChange={(value) => setUser({ ...user, gender: value })}
              >
                <SelectTrigger className="bg-white text-gray-800 border border-gray-300">
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Nam</SelectItem>
                  <SelectItem value="Female">Nữ</SelectItem>
                  <SelectItem value="Other">Khác</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-gray-800">
                {user.gender === "Male"
                  ? "Nam"
                  : user.gender === "Female"
                  ? "Nữ"
                  : "Khác"}
              </p>
            )}
          </div>

          <InfoField
            label="Số điện thoại"
            value={user.phoneNumber}
            editable={isEditing}
            onChange={(v) => setUser({ ...user, phoneNumber: v })}
          />
        </div>
      </div>

     {/* 🏠 SỔ ĐỊA CHỈ */}
<div className="mt-8">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
      <MapPin className="w-5 h-5" /> Sổ địa chỉ
    </h2>

    {/* ➕ Nút Thêm địa chỉ */}
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm địa chỉ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm địa chỉ mới</DialogTitle>
        </DialogHeader>
        <AddOrEditAddressForm
          userId={user.userId}
          onSuccess={async () => {
            const updated = await getAddressesByUserId(user.userId);
            setAddresses(updated);
          }}
        />
      </DialogContent>
    </Dialog>
  </div>

  {/* 📋 Danh sách địa chỉ */}
  <div className="space-y-4">
    {addresses.length === 0 ? (
      <p className="text-gray-500 italic">Chưa có địa chỉ nào.</p>
    ) : (
      <div className="space-y-3">
        {addresses.map((addr) => (
          <div
            key={addr.userAddressId}
            className={`p-4 rounded-xl border ${
              addr.default ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
            } flex justify-between items-start`}
          >
            <div className="flex flex-col gap-1">
              <p className="text-gray-800">{addr.addressInfor}</p>

              {addr.fullName && (
                <p className="text-sm text-gray-600">👤 {addr.fullName}</p>
              )}
              {addr.phoneNumber && (
                <p className="text-sm text-gray-600">📞 {addr.phoneNumber}</p>
              )}
              {addr.type && (
                <p className="text-sm text-gray-500 italic">🏷️ {addr.type}</p>
              )}

              {addr.default && (
                <span className="text-xs text-white bg-blue-500 px-2 py-0.5 rounded mt-1 w-fit">
                  Mặc định
                </span>
              )}
            </div>

            {/* Nút hành động */}
            <div className="flex items-center gap-2">
              {/* 🔘 Radio: chọn làm mặc định */}
              {!addr.default && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      // Gửi toàn bộ thông tin hiện tại, chỉ thêm default=true
                      const payload = {
                        addressInfor: addr.addressInfor,
                        userId: addr.userId,
                        isActived: "ACTIVE",
                        phoneNumber: addr.phoneNumber || "",
                        fullName: addr.fullName || "",
                        type: addr.type || "",
                        isDefault: true, // ✅ đây là key BE yêu cầu
                      };
                      console.log("📦 Payload gửi BE:", payload);
                      await updateAddress(addr.userAddressId, payload);
                      toast.success("✅ Đã đặt làm địa chỉ mặc định!");
                      const updated = await getAddressesByUserId(user.userId);
                      setAddresses(updated);
                    } catch (error) {
                      console.error(error);
                      toast.error("Không thể đặt mặc định!");
                    }
                  }}
                >
                  🔘 Đặt mặc định
                </Button>
              )}

              {/* ✏️ Sửa */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Chỉnh sửa địa chỉ</DialogTitle>
                  </DialogHeader>
                  <AddOrEditAddressForm
                    userId={user.userId}
                    defaultAddress={addr}
                    onSuccess={async () => {
                      const updated = await getAddressesByUserId(user.userId);
                      setAddresses(updated);
                    }}
                  />
                </DialogContent>
              </Dialog>

              {/* 🗑️ Xóa */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteAddress(addr.userAddressId)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</div>




    </div>
  );
}

/* --------------------------------------------------
 🔸 Subcomponents
-------------------------------------------------- */
function InfoField({
  label,
  value,
  onChange,
  editable,
  type = "text",
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {editable ? (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className="text-gray-800">{value}</p>
      )}
    </div>
  );
}

function AddOrEditAddressForm({
  userId,
  userDefaultInfo,
  defaultAddress,
  onSuccess,
}: {
  userId: string;
  userDefaultInfo?: User;
  defaultAddress?: Address;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  // 🧩 Dữ liệu
  const [fullName, setFullName] = useState(defaultAddress?.fullName || userDefaultInfo?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(defaultAddress?.phoneNumber || userDefaultInfo?.phoneNumber || "");
  const [type, setType] = useState(defaultAddress?.type || "");
  const [isDefault, setIsDefault] = useState(defaultAddress?.default || false);
  const [addressDetail, setAddressDetail] = useState(defaultAddress?.addressInfor || "");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // 🌍 Fetch danh sách tỉnh/huyện/xã
  useEffect(() => {
    fetch("http://provinces.open-api.vn/api/p/")
      .then((res) => res.json())
      .then(setProvinces)
      .catch(() => toast.error("Không tải được danh sách tỉnh/thành!"));
  }, []);

  useEffect(() => {
    if (!province) return;
    fetch(`http://provinces.open-api.vn/api/p/${province}?depth=2`)
      .then((res) => res.json())
      .then((data) => setDistricts(data.districts || []))
      .catch(() => toast.error("Không tải được danh sách quận/huyện!"));
  }, [province]);

  useEffect(() => {
    if (!district) return;
    fetch(`http://provinces.open-api.vn/api/d/${district}?depth=2`)
      .then((res) => res.json())
      .then((data) => setWards(data.wards || []))
      .catch(() => toast.error("Không tải được danh sách phường/xã!"));
  }, [district]);

  // 💾 Submit
  const handleSubmit = async () => {
    if (!addressDetail) {
      toast.error("Vui lòng nhập địa chỉ!");
      return;
    }

    try {
      setLoading(true);

      const provinceName = provinces.find((p) => p.code === Number(province))?.name || "";
      const districtName = districts.find((d) => d.code === Number(district))?.name || "";
      const wardName = wards.find((w) => w.code === Number(ward))?.name || "";
      const fullAddress = [addressDetail, wardName, districtName, provinceName]
        .filter(Boolean)
        .join(", ");

      const payload = {
        addressInfor: fullAddress,
        userId,
        isActived: "ACTIVE" as const,
        phoneNumber: phoneNumber || userDefaultInfo?.phoneNumber || "",
        fullName: fullName || userDefaultInfo?.fullName || "",
        type,
        default: isDefault,
      };
      

      if (defaultAddress) {
        await updateAddress(defaultAddress.userAddressId, payload);
        toast.success("Cập nhật địa chỉ thành công!");
      } else {
        await createAddress(payload);
        toast.success("Thêm địa chỉ thành công!");
      }

      onSuccess();
      document.querySelector<HTMLElement>("[data-radix-dialog-close]")?.click();
    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu địa chỉ!");
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Render
  return (
    <div className="space-y-4">
      {/* Họ tên (readonly nếu đã có) */}
      <div>
        <Label>Người nhận</Label>
        <Input
          placeholder="VD: Nguyễn Văn A"
          value={fullName}
          readOnly={!!userDefaultInfo}
          onChange={(e) => setFullName(e.target.value)}
          className={userDefaultInfo ? "bg-gray-100" : ""}
        />
      </div>

      {/* Số điện thoại (readonly nếu đã có) */}
      <div>
        <Label>Số điện thoại</Label>
        <Input
          placeholder="VD: 0909123456"
          value={phoneNumber}
          readOnly={!!userDefaultInfo}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className={userDefaultInfo ? "bg-gray-100" : ""}
        />
      </div>

      {/* Loại địa chỉ */}
      <div>
        <Label>Loại địa chỉ</Label>
        <Input
          placeholder="VD: Nhà riêng, Cơ quan..."
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
      </div>

      {/* Địa chỉ chi tiết */}
      <div>
        <Label>Địa chỉ chi tiết</Label>
        <Input
          placeholder="VD: 123 Nguyễn Văn Cừ"
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
        />
      </div>

      {/* Tỉnh / Thành phố */}
      <div>
        <Label>Tỉnh / Thành phố</Label>
        <select
          className="w-full border border-gray-300 rounded-md p-2"
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            setDistrict("");
            setWard("");
          }}
        >
          <option value="">-- Chọn tỉnh / thành phố --</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quận / Huyện */}
      <div>
        <Label>Quận / Huyện</Label>
        <select
          className="w-full border border-gray-300 rounded-md p-2"
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setWard("");
          }}
          disabled={!province}
        >
          <option value="">-- Chọn quận / huyện --</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Phường / Xã */}
      <div>
        <Label>Phường / Xã</Label>
        <select
          className="w-full border border-gray-300 rounded-md p-2"
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          disabled={!district}
        >
          <option value="">-- Chọn phường / xã --</option>
          {wards.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* Radio Mặc định */}
      <div>
        <Label>Đặt làm địa chỉ mặc định</Label>
        <div className="flex gap-6 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="isDefault"
              checked={isDefault === true}
              onChange={() => setIsDefault(true)}
            />
            <span>Có</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="isDefault"
              checked={isDefault === false}
              onChange={() => setIsDefault(false)}
            />
            <span>Không</span>
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Đang lưu..." : defaultAddress ? "Lưu thay đổi" : "Thêm địa chỉ"}
        </Button>
      </DialogFooter>
    </div>
  );
}







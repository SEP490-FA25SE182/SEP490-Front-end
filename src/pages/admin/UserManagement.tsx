import { useEffect, useState, useRef } from "react";
import { Menu, X, Search, Trash2, Loader2 } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllUsers,
  createUser,
  deleteUser,
  getRoleById,
  type User,
} from "@/services/UserService";
import { useGetAllRoles } from "@/services/RoleService";
import { ContractService } from "@/services/ContractService";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { resolveFirebaseUrl } from "@/firebase";
import { UploadService } from "@/services/FirebaseService";
import { updateUser } from "@/services/UserService";


export default function UserManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [, setUsers] = useState<User[]>([]);
  const [roleNames, setRoleNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [currentRoleName, setCurrentRoleName] = useState("");
  const [openRoyaltyModal, setOpenRoyaltyModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [royaltyValue, setRoyaltyValue] = useState<number>(0);
  const [savingRoyalty, setSavingRoyalty] = useState(false);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  const [contract, setContract] = useState<any>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractHttpUrl, setContractHttpUrl] = useState<string>("");

  const [contractPreviewUrl, setContractPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    roleId: "",
    gender: "",
    birthDate: "",
  });

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    phoneNumber?: string;
    gender?: string;
    birthDate?: string;
    roleId?: string;
  }>({});

  const [creating, setCreating] = useState(false);

  const { data: roleList } = useGetAllRoles();

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.email) return;

    const fetchRole = async () => {
      try {
        // 1. Tìm user theo email
        const allUsers = await getAllUsers();
        const currentUser = allUsers.find((u) => u.email === user.email);

        if (!currentUser?.roleId) return;

        // 2. Lấy role name
        const role = await getRoleById(currentUser.roleId);
        setCurrentRoleName(role.roleName?.toLowerCase().trim() || "");
      } catch {
        setCurrentRoleName("");
      }
    };

    fetchRole();
  }, [user?.email]);

  // 🔹 Lấy toàn bộ user
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await getAllUsers();
        setAllUsers(res); // ✅ thêm
        setUsers(res); // ✅ thêm (list đang hiển thị)
      } catch (err) {
        console.error("❌ Lỗi khi tải user:", err);
        toast.error("Không thể tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    async function resolveAvatars() {
      const map: Record<string, string> = {};

      await Promise.all(
        allUsers.map(async (u) => {
          if (!u.avatarUrl) return;

          try {
            map[u.userId] = await resolveFirebaseUrl(u.avatarUrl);
          } catch {
            map[u.userId] = "";
          }
        })
      );

      setAvatarMap(map);
    }

    if (allUsers.length > 0) {
      resolveAvatars();
    }
  }, [allUsers]);

  // 🔹 Lấy tên role tương ứng cho từng user
  useEffect(() => {
    async function fetchRoleNames() {
      const map: Record<string, string> = {};
      await Promise.all(
        allUsers.map(async (u) => {
          if (u.roleId && !map[u.roleId]) {
            try {
              const role = await getRoleById(u.roleId);
              map[u.roleId] = role.roleName;
            } catch {
              map[u.roleId] = "Không xác định";
            }
          }
        })
      );
      setRoleNames(map);
    }
    if (allUsers.length > 0) fetchRoleNames();
  }, [allUsers]);
  //hepler

  useEffect(() => {
    (async () => {
      if (!contract?.documentUrl) {
        setContractHttpUrl("");
        setContractPreviewUrl("");
        return;
      }

      try {
        const url = await resolveFirebaseUrl(contract.documentUrl);
        setContractHttpUrl(url);

        // ✅ nếu là ảnh thì cho preview
        if (url.match(/\.(png|jpg|jpeg|webp)$/i)) {
          setContractPreviewUrl(url);
        } else {
          setContractPreviewUrl("");
        }
      } catch {
        setContractHttpUrl("");
        setContractPreviewUrl("");
      }
    })();
  }, [contract?.documentUrl]);

  const isAuthor = (roleId?: string) => {
    const roleName = (roleNames[roleId || ""] || "").trim().toLowerCase();

    return roleName === "author" || roleName === "role_author";
  };
  console.log(roleNames);

  const isCurrentUserAdmin = currentRoleName === "admin";

  // 🗑️ Xóa user
  const handleDelete = async (userId: string) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    try {
      await deleteUser(userId);
      toast.success("Đã xóa người dùng thành công");
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
      setAllUsers((prev) => prev.filter((u) => u.userId !== userId)); // ✅ thêm
    } catch (err) {
      toast.error("Không thể xóa người dùng");
    }
  };

  // 🔎 Lọc theo role / status
  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.trim().toLowerCase();

    const matchSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);

    const roleName = roleNames[u.roleId] || "";
    const matchRole =
      filterRole === "all" ||
      roleName.toLowerCase().includes(filterRole.toLowerCase());

    const matchStatus = filterStatus === "all" || u.isActived === filterStatus;

    return matchSearch && matchRole && matchStatus;
  });

  const handleRoyaltyUpdate = async (u: User) => {
    setOpenRoyaltyModal(true);
    setSelectedUser(u);
    setContract(null);
    setContractPreviewUrl(""); // ✅ thêm dòng này
    setContractFile(null);

    try {
      const contracts = await ContractService.search();
      console.log("ALL CONTRACTS FROM API:", contracts);
      const found = contracts.find((c) => c.userId === u.userId);
      setContract(found ?? null);
    } catch {
      setContract(null);
    }
  };


  const handleSaveRoyalty = async () => {
    if (!selectedUser?.userId) return;

    if (royaltyValue < 0 || royaltyValue > 100) {
      toast.error("Royalty phải từ 0 - 100%");
      return;
    }

    try {
      setSavingRoyalty(true);

      // ✅ 1. UPDATE ROYALTY USER (GIỮ NGUYÊN CÁCH CŨ)
      await updateUser(selectedUser.userId, {
        ...selectedUser,
        royalty: royaltyValue,
      });

      // ✅ 2. UPLOAD FILE NẾU CÓ
      let documentUrl = contract?.documentUrl;

      if (contractFile) {
        documentUrl = await UploadService.uploadImageToFirebase(
          contractFile,
          "contracts"
        );
      }

      // ✅ 3. UPDATE / CREATE CONTRACT (THÊM NHẸ)
      if (documentUrl) {
        if (contract?.contractId) {
          await ContractService.update(contract.contractId, {
            userId: selectedUser.userId,
            documentUrl,
            title: contract.title,
            status: "DRAFT",
          });
        } else {
          await ContractService.create({
            contractNumber: `CT-${Date.now()}`,
            title: `Hợp đồng tác giả ${selectedUser.fullName}`,
            documentUrl,
            userId: selectedUser.userId,
          });
        }
      }

      // ✅ 4. UPDATE UI LOCAL (KHỎI LOAD LẠI)
      setUsers(prev =>
        prev.map(u =>
          u.userId === selectedUser.userId
            ? { ...u, royalty: royaltyValue }
            : u
        )
      );

      toast.success("Cập nhật royalty & hợp đồng thành công ✅");
      setOpenRoyaltyModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Cập nhật royalty thất bại");
    } finally {
      setSavingRoyalty(false);
    }
  };


  const validateNewUser = () => {
    const newErrors: typeof errors = {};

    if (!newUser.fullName.trim()) {
      newErrors.fullName = "Họ tên không được để trống";
    }

    if (!newUser.email.trim()) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!newUser.password.trim()) {
      newErrors.password = "Mật khẩu không được để trống";
    } else if (newUser.password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    }

    if (
      newUser.phoneNumber &&
      !/^(0|\+84)[0-9]{9}$/.test(newUser.phoneNumber)
    ) {
      newErrors.phoneNumber = "Số điện thoại không hợp lệ";
    }

    if (newUser.birthDate && new Date(newUser.birthDate) > new Date()) {
      newErrors.birthDate = "Ngày sinh không hợp lệ";
    }

    if (!newUser.roleId) {
      newErrors.roleId = "Vui lòng chọn vai trò";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleCreateUser = async () => {
    const isValid = validateNewUser();
    if (!isValid) return;

    try {
      setCreating(true);

      const body = {
        ...newUser,
        isActived: "ACTIVE",
        avatarUrl: "",
        royalty: 0,
      };
      await createUser(body);

      toast.success("Tạo tài khoản thành công!");

      // refresh list
      const resUsers = await getAllUsers();
      setAllUsers(resUsers);
      setUsers(resUsers);

      // đóng modal
      setOpenCreateModal(false);

      // reset form
      setNewUser({
        fullName: "",
        email: "",
        password: "",
        phoneNumber: "",
        roleId: "",
        gender: "",
        birthDate: "",
      });
    } catch (err) {
      console.error(err);
      toast.error("Tạo tài khoản thất bại");
    } finally {
      setCreating(false);
    }
  };

  //--------------------------------RENDER--------------------------------
  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AdminSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
        pl-10 
        bg-transparent 
        border-white/20 
        text-white 
        placeholder:text-gray-400
        focus:border-purple-500
        focus:ring-purple-500
      "
            />
          </div>

          {isCurrentUserAdmin && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setOpenCreateModal(true)}
            >
              + Tạo tài khoản
            </Button>
          )}

          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[160px] border-white/20 text-white bg-transparent">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] border-white/20 text-white bg-transparent">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="ACTIVE">Hoạt động</SelectItem>
              <SelectItem value="INACTIVE">Ngừng</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang tải...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                    <TableHead className="text-white font-medium">
                      Ảnh
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Họ tên
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Email
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Vai trò
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Trạng thái
                    </TableHead>

                    {isCurrentUserAdmin && (
                      <TableHead className="text-white font-medium text-right">
                        Hành động
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.userId} className="hover:bg-gray-50">
                      <TableCell>
                        <img
                          src={
                            avatarMap[u.userId] ||
                            "https://avatar.iran.liara.run/public/boy"
                          }
                          alt={u.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://avatar.iran.liara.run/public/boy";
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-gray-900 font-medium">
                        {u.fullName}
                      </TableCell>
                      <TableCell className="text-gray-600">{u.email}</TableCell>
                      <TableCell>
                        <span className="text-purple-600 font-semibold">
                          {roleNames[u.roleId] || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${u.isActived === "ACTIVE"
                            ? "text-green-600"
                            : "text-gray-500"
                            }`}
                        >
                          {u.isActived === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                        </span>
                      </TableCell>
                      {isCurrentUserAdmin && (
                        <TableCell className="flex justify-end gap-2">
                          {/* ✍️ Nếu user là AUTHOR → hiện nút Royalty */}
                          {isAuthor(u.roleId) && (
                            <Button
                              className="bg-yellow-500 hover:bg-yellow-600 text-white"
                              onClick={() => handleRoyaltyUpdate(u)}
                            >
                              Hợp đồng
                            </Button>
                          )}

                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(u.userId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Royalty Modal*/}
      {openRoyaltyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[420px] p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Cập nhật phần trăm tác quyền
            </h2>

            <div className="mb-6">
              <label className="block text-sm text-gray-600 mb-2">
                Phần trăm tác quyền (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={royaltyValue}
                onChange={(e) => setRoyaltyValue(Number(e.target.value))}
                className="text-black bg-white"
                disabled={false}
              />
              {/* CONTRACT */}
              <div className="mb-4">
                <label className="text-sm text-gray-600 mb-2 block">
                  Hợp đồng
                </label>

                {contractHttpUrl ? (
                  <a
                    href={contractHttpUrl}
                    target="_blank"
                    className="text-blue-600 underline text-sm"
                  >
                    Xem hợp đồng hiện tại
                  </a>
                ) : (
                  <p className="text-sm text-gray-400">Chưa có hợp đồng</p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setContractFile(file);

                    // ✅ preview nếu là ảnh
                    if (file && file.type.startsWith("image/")) {
                      setContractPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setContractPreviewUrl("");
                    }
                  }}
                />
              </div>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Cập nhật hợp đồng
              </Button>
              {/* PREVIEW IMAGE */}
              {contractPreviewUrl && (
                <div className="mt-3">
                  <img
                    src={contractPreviewUrl}
                    alt="Contract preview"
                    className="w-full max-h-[300px] object-contain border rounded-md"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenRoyaltyModal(false)}
                disabled={savingRoyalty}
              >
                Hủy
              </Button>

              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSaveRoyalty}
                disabled={savingRoyalty}
              >
                {savingRoyalty ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal*/}
      {openCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[420px] p-6 relative text-gray-900">
            {/* Close button */}
            <button
              className="absolute right-4 top-4 text-gray-600 hover:text-black"
              onClick={() => setOpenCreateModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-4">Tạo tài khoản mới</h2>

            {/* Fullname */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Họ tên</label>
              <Input
                value={newUser.fullName}
                onChange={(e) => {
                  setNewUser({ ...newUser, fullName: e.target.value });
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                className={`mt-1 ${errors.fullName ? "border-red-500 focus:border-red-500" : ""
                  }`}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Email</label>
              <Input
                value={newUser.email}
                onChange={(e) => {
                  setNewUser({ ...newUser, email: e.target.value });
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`mt-1 ${errors.email ? "border-red-500 focus:border-red-500" : ""
                  }`}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Mật khẩu</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => {
                  setNewUser({ ...newUser, password: e.target.value });
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`mt-1 ${errors.password ? "border-red-500 focus:border-red-500" : ""
                  }`}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Phone */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Số điện thoại</label>
              <Input
                value={newUser.phoneNumber}
                onChange={(e) => {
                  setNewUser({ ...newUser, phoneNumber: e.target.value });
                  setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                }}
                className={`mt-1 ${errors.phoneNumber
                  ? "border-red-500 focus:border-red-500"
                  : ""
                  }`}
              />

              {errors.phoneNumber && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Giới tính</label>
              <Select
                value={newUser.gender}
                onValueChange={(v) => setNewUser({ ...newUser, gender: v })}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Nam</SelectItem>
                  <SelectItem value="FEMALE">Nữ</SelectItem>
                  <SelectItem value="OTHER">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Birthdate */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Ngày sinh</label>
              <Input
                type="date"
                value={newUser.birthDate}
                onChange={(e) =>
                  setNewUser({ ...newUser, birthDate: e.target.value })
                }
                className="mt-1"
              />
            </div>

            {/* Role dropdown */}
            <div className="mb-4">
              <label className="text-sm text-gray-600">Vai trò</label>
              <Select
                value={newUser.roleId}
                onValueChange={(v) => {
                  setNewUser({ ...newUser, roleId: v });
                  setErrors((prev) => ({ ...prev, roleId: undefined }));
                }}
              >
                <SelectTrigger
                  className={`w-full mt-1 ${errors.roleId ? "border-red-500" : ""
                    }`}
                >
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {roleList?.map((r) => (
                    <SelectItem key={r.roleId} value={r.roleId}>
                      {r.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && (
                <p className="text-sm text-red-500 mt-1">{errors.roleId}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenCreateModal(false)}
              >
                Hủy
              </Button>

              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleCreateUser}
                disabled={creating}
              >
                {creating ? "Đang tạo..." : "Tạo tài khoản"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
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
  updateUser,
  deleteUser,
  searchUsers,
  getRoleById,
  type User,
} from "@/services/UserService";
import { toast } from "sonner";

export default function UserManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [users, setUsers] = useState<User[]>([]);
  const [roleNames, setRoleNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // 🔹 Lấy toàn bộ user
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await getAllUsers();
        setUsers(res);
      } catch (err) {
        console.error("❌ Lỗi khi tải user:", err);
        toast.error("Không thể tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // 🔹 Lấy tên role tương ứng cho từng user
  useEffect(() => {
    async function fetchRoleNames() {
      const map: Record<string, string> = {};
      await Promise.all(
        users.map(async (u) => {
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
    if (users.length > 0) fetchRoleNames();
  }, [users]);

  // 🔍 Tìm kiếm user theo tên/email
  const handleSearch = async () => {
    try {
      if (!searchQuery.trim()) {
        const res = await getAllUsers();
        setUsers(res);
      } else {
        const res = await searchUsers(searchQuery);
        setUsers(res);
      }
    } catch (err) {
      toast.error("Không thể tìm kiếm người dùng");
    }
  };

  // ✏️ Cập nhật trạng thái (ACTIVE / INACTIVE)
  const handleToggleActive = async (user: User) => {
    try {
      const newStatus = user.isActived === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await updateUser(user.userId, { isActived: newStatus });
      toast.success(
        `Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu"} ${user.fullName}`
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === user.userId ? { ...u, isActived: newStatus } : u
        )
      );
    } catch (err) {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  // 🗑️ Xóa user
  const handleDelete = async (userId: string) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    try {
      await deleteUser(userId);
      toast.success("Đã xóa người dùng thành công");
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (err) {
      toast.error("Không thể xóa người dùng");
    }
  };

  // 🔎 Lọc theo role / status
  const filteredUsers = users.filter((u) => {
    const matchRole =
      filterRole === "all" ||
      roleNames[u.roleId]?.toLowerCase().includes(filterRole.toLowerCase());
    const matchStatus =
      filterStatus === "all" || u.isActived === filterStatus;
    return matchRole && matchStatus;
  });

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
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <Button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700">
            Tìm kiếm
          </Button>

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
                    <TableHead className="text-white font-medium">Ảnh</TableHead>
                    <TableHead className="text-white font-medium">Họ tên</TableHead>
                    <TableHead className="text-white font-medium">Email</TableHead>
                    <TableHead className="text-white font-medium">Vai trò</TableHead>
                    <TableHead className="text-white font-medium">Trạng thái</TableHead>
                    <TableHead className="text-white font-medium text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.userId} className="hover:bg-gray-50">
                      <TableCell>
                        <img
                          src={u.avatarUrl || "https://avatar.iran.liara.run/public/boy"}
                          alt={u.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </TableCell>
                      <TableCell className="text-gray-900 font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-gray-600">{u.email}</TableCell>
                      <TableCell>
                        <span className="text-purple-600 font-semibold">
                          {roleNames[u.roleId] || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            u.isActived === "ACTIVE" ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {u.isActived === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                        </span>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.isActived === "ACTIVE" ? "Vô hiệu" : "Kích hoạt"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(u.userId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

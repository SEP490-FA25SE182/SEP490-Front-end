import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

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
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethod,
} from "@/services/PaymentMethodService";

import { toast } from "sonner";

export default function PaymentMethodManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ACTIVE" | "INACTIVE">("all");

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const [form, setForm] = useState({
    methodName: "",
    provider: "",
    decription: "",
    isActived: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });
  const [saving, setSaving] = useState(false);

  // ========== LOAD DATA ==========
  const loadMethods = async () => {
    setLoading(true);
    try {
      const data = await getAllPaymentMethods();
      setMethods(data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách phương thức thanh toán");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  // ========== FILTERED LIST ==========
  const filteredMethods = methods.filter((m) => {
    const q = searchQuery.toLowerCase().trim();

    const matchSearch =
      !q ||
      m.methodName.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q) ||
      (m.decription || "").toLowerCase().includes(q);

    const matchStatus =
      filterStatus === "all" || m.isActived === filterStatus;

    return matchSearch && matchStatus;
  });

  // ========== OPEN MODAL ==========
  const handleOpenAdd = () => {
    setModalMode("add");
    setSelectedMethod(null);
    setForm({
      methodName: "",
      provider: "",
      decription: "",
      isActived: "ACTIVE",
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (m: PaymentMethod) => {
    setModalMode("edit");
    setSelectedMethod(m);
    setForm({
      methodName: m.methodName,
      provider: m.provider,
      decription: m.decription,
      isActived: m.isActived,
    });
    setOpenModal(true);
  };

  // ========== SAVE (CREATE / UPDATE) ==========
  const handleSave = async () => {
    if (!form.methodName.trim()) {
      toast.error("Tên phương thức không được để trống");
      return;
    }
    if (!form.provider.trim()) {
      toast.error("Nhà cung cấp không được để trống");
      return;
    }

    try {
      setSaving(true);

      if (modalMode === "add") {
        await createPaymentMethod(form);
        toast.success("Tạo phương thức thanh toán thành công");
      } else if (modalMode === "edit" && selectedMethod) {
        await updatePaymentMethod(selectedMethod.paymentMethodId, form);
        toast.success("Cập nhật phương thức thanh toán thành công");
      }

      setOpenModal(false);
      await loadMethods();
    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu phương thức thanh toán");
    } finally {
      setSaving(false);
    }
  };

  // ========== DELETE ==========
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa phương thức thanh toán này?")) return;

    try {
      await deletePaymentMethod(id);
      toast.success("Đã xoá phương thức thanh toán");
      await loadMethods();
    } catch (err) {
      console.error(err);
      toast.error("Không thể xóa phương thức thanh toán");
    }
  };

  // ========== RENDER ==========
  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AdminSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <h1 className="text-lg font-semibold">Quản lý phương thức thanh toán</h1>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo tên, nhà cung cấp, mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <Select
            value={filterStatus}
            onValueChange={(v) =>
              setFilterStatus(v as "all" | "ACTIVE" | "INACTIVE")
            }
          >
            <SelectTrigger className="w-[180px] border-white/20 text-white bg-transparent">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
              <SelectItem value="INACTIVE">Ngừng</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleOpenAdd}
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm phương thức
          </Button>
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
                      Tên phương thức
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Nhà cung cấp
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Mô tả
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Ngày tạo
                    </TableHead>
                    <TableHead className="text-white font-medium text-right">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredMethods.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-600 py-8"
                      >
                        Không có phương thức thanh toán nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMethods.map((m) => (
                      <TableRow key={m.paymentMethodId} className="hover:bg-gray-50">
                        <TableCell className="text-gray-900 font-medium">
                          {m.methodName}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {m.provider}
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-xs truncate">
                          {m.decription}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              m.isActived === "ACTIVE"
                                ? "text-green-600 font-semibold"
                                : "text-gray-500 font-semibold"
                            }
                          >
                            {m.isActived === "ACTIVE" ? "Hoạt động" : "Ngừng"}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleDateString("vi-VN")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-yellow-600 border-yellow-400"
                            onClick={() => handleOpenEdit(m)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDelete(m.paymentMethodId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[480px] p-6 relative text-gray-900">
            {/* Close button */}
            <button
              className="absolute right-4 top-4 text-gray-600 hover:text-black"
              onClick={() => setOpenModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-4">
              {modalMode === "add"
                ? "Thêm phương thức thanh toán"
                : "Cập nhật phương thức thanh toán"}
            </h2>

            {/* Method name */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Tên phương thức</label>
              <Input
                value={form.methodName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, methodName: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            {/* Provider */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Nhà cung cấp</label>
              <Input
                value={form.provider}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, provider: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="text-sm text-gray-600">Mô tả</label>
              <Input
                value={form.decription}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, decription: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="text-sm text-gray-600">Trạng thái</label>
              <Select
                value={form.isActived}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, isActived: v as "ACTIVE" | "INACTIVE" }))
                }
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                  <SelectItem value="INACTIVE">Ngừng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenModal(false)}
                disabled={saving}
              >
                Hủy
              </Button>

              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

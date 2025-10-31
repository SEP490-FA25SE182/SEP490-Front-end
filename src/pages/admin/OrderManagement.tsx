import { useEffect, useState } from "react";
import { Menu, X, Loader2, Trash2, RefreshCw } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { OrderService, type OrderResponse } from "@/services/OrderService";
import { toast } from "sonner";

export default function OrderManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Map trạng thái từ Enum backend
  const mapOrderStatus = (status: number) => {
    switch (status) {
      case 0: return "Chưa đặt hàng";
      case 1: return "Chờ xác nhận";
      case 2: return "Đang xử lý";
      case 3: return "Đang vận chuyển";
      case 4: return "Đã giao thành công";
      case 5: return "Đã hủy";
      case 6: return "Đã trả hàng";
      default: return "Không xác định";
    }
  };

  // 🔹 Màu trạng thái
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-gray-100 text-gray-600";
      case 1: return "bg-yellow-100 text-yellow-600";
      case 2: return "bg-blue-100 text-blue-600";
      case 3: return "bg-indigo-100 text-indigo-600";
      case 4: return "bg-green-100 text-green-600";
      case 5: return "bg-red-100 text-red-600";
      case 6: return "bg-purple-100 text-purple-600";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  // 🔹 Lấy tất cả order
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await OrderService.getAllOrders();
      setOrders(res);
    } catch (err) {
      console.error("❌ Lỗi khi tải orders:", err);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 🔍 Lọc và tìm kiếm
  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      filterStatus === "all" || String(order.status) === filterStatus;
    const matchSearch =
      !searchQuery ||
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ✏️ Cập nhật trạng thái đơn hàng
  const handleUpdateStatus = async (order: OrderResponse, newStatus: number) => {
    try {
      await OrderService.updateOrder(order.orderId, { status: newStatus });
      toast.success("Đã cập nhật trạng thái đơn hàng");
      // ⚙️ Cập nhật local state với kiểu string (đồng bộ với BE)
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === order.orderId
            ? { ...o, status: String(newStatus) }
            : o
        )
      );
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  // 🗑️ Xóa đơn hàng
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      await OrderService.deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.orderId !== id));
      toast.success("Đã xóa đơn hàng thành công");
    } catch {
      toast.error("Không thể xóa đơn hàng");
    }
  };

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

            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/30"
              onClick={fetchOrders}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex gap-4 items-center">
          <Input
            placeholder="Tìm kiếm mã đơn hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-white/20 text-white placeholder:text-gray-400 flex-1"
          />

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[220px] border-white/20 text-white bg-transparent">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {[0, 1, 2, 3, 4, 5, 6].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {mapOrderStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang tải dữ liệu...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                    <TableHead className="text-white font-medium">Mã đơn</TableHead>
                    <TableHead className="text-white font-medium">Tổng tiền</TableHead>
                    <TableHead className="text-white font-medium">Trạng thái</TableHead>
                    <TableHead className="text-white font-medium">Ngày tạo</TableHead>
                    <TableHead className="text-white font-medium text-right">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-600 py-8">
                        Không có đơn hàng nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const statusNum = Number(order.status);

                      return (
                        <TableRow key={order.orderId} className="hover:bg-gray-50 text-gray-800">
                          <TableCell>{order.orderId}</TableCell>
                          <TableCell>{order.totalPrice.toLocaleString("vi-VN")}₫</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={String(statusNum)}
                                onValueChange={(value) =>
                                  handleUpdateStatus(order, parseInt(value))
                                }
                              >
                                <SelectTrigger className="w-[200px] bg-white/10 border-gray-300">
                                  <SelectValue>
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${getStatusColor(
                                        statusNum
                                      )}`}
                                    >
                                      {mapOrderStatus(statusNum)}
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5, 6].map((s) => (
                                    <SelectItem key={s} value={String(s)}>
                                      {mapOrderStatus(s)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleString("vi-VN")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDelete(order.orderId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

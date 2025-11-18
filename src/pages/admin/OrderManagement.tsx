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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { OrderService, type OrderResponse } from "@/services/OrderService";
import { OrderDetailService } from "@/services/OrderDetailService";
import { getBookById } from "@/services/BookService";
import { TransactionService } from "@/services/TransactionService";
import { getWalletById, updateWallet } from "@/services/WalletService";

import { formatVND } from "@/lib/money";
import { toast } from "sonner";

export default function OrderManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundOrder, setRefundOrder] = useState<OrderResponse | null>(null);
  const [refundDetails, setRefundDetails] = useState<any[]>([]);

  // ===============================
  //  STATUS MAP
  // ===============================
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

  // ===============================
  //  FETCH ALL ORDERS
  // ===============================
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await OrderService.getAllOrders();
      setOrders(res);
    } catch {
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ===============================
  //  OPEN REFUND DIALOG
  // ===============================
  const openRefundDialog = async (order: OrderResponse) => {
    setRefundOrder(order);
    setRefundDetails([]); // tránh hiển thị dữ liệu cũ
    setRefundOpen(true);

    const details = await OrderDetailService.getOrderDetailsByOrderId(order.orderId);

    const enriched = await Promise.all(
      details.map(async (d) => ({
        ...d,
        book: await getBookById(d.bookId).catch(() => null),
      }))
    );

    setRefundDetails(enriched);
  };

  // ===============================
  //  GET REFUND TRANSACTION
  // ===============================
  async function getRefundTransaction(orderId: string) {
    const res = await TransactionService.search({ orderId });

    const list = Array.isArray((res as any)?.content)
      ? (res as any).content
      : res;

    return (
      list.find((t: any) => t.transType === "REFUND") ||
      list.find((t: any) => t.type === "REFUND") ||
      null
    );
  }

  // ===============================
  //  APPROVE REFUND
  // ===============================
  async function approveRefund() {
    if (!refundOrder) return;

    try {
      toast.loading("Đang duyệt hoàn tiền...");

      // 1️⃣ Lấy REFUND transaction
      const refundTrans = await getRefundTransaction(refundOrder.orderId);

      if (!refundTrans) {
        toast.error("Không tìm thấy giao dịch REFUND!");
        return;
      }

      // 2️⃣ Cập nhật REFUND → SETTLEMENT + PAID (3)
      await TransactionService.update(refundTrans.transactionId, {
        transType: "SETTLEMENT",
        status: 3, // PAID
      });

      // 3️⃣ Lấy ví user
      const walletId = refundOrder.walletId;  // CHUẨN NHẤT

      const wallet = await getWalletById(walletId);

      // 4️⃣ Cộng tiền hoàn vào ví
      await updateWallet(walletId, {
        balance: wallet.balance + refundOrder.totalPrice,
      });

      // 5️⃣ Đổi order status → 5 (Đã hoàn tiền)
      await OrderService.updateOrder(refundOrder.orderId, { status: 5 });

      // 6️⃣ Update UI local ngay lập tức
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === refundOrder.orderId
            ? { ...o, status: "5" }
            : o
        )
      );

      toast.success("Duyệt hoàn tiền thành công!");

      // 7️⃣ Đóng modal
      setRefundOpen(false);
      setRefundOrder(null);

    } catch (error) {
      console.error("❌ Lỗi duyệt hoàn tiền:", error);
      toast.error("Không thể duyệt hoàn tiền.");
    } finally {
      toast.dismiss();
    }
  }

  

  // ===============================
  //  FILTERED LIST
  // ===============================
  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      filterStatus === "all" || String(order.status) === filterStatus;
    const matchSearch =
      !searchQuery ||
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ===============================
  //  UPDATE STATUS
  // ===============================
  const handleUpdateStatus = async (order: OrderResponse, newStatus: number) => {
    try {
      await OrderService.updateOrder(order.orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === order.orderId
            ? { ...o, status: String(newStatus) }
            : o
        )
      );
      toast.success("Đã cập nhật trạng thái");
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  // ===============================
  //  DELETE ORDER
  // ===============================
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      await OrderService.deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.orderId !== id));
      toast.success("Đã xóa đơn hàng");
    } catch {
      toast.error("Không thể xóa đơn hàng");
    }
  };

  // ===============================
  //  RENDER UI
  // ===============================
  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AdminSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X /> : <Menu />}
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

        {/* FILTERS */}
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

        {/* TABLE */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Đang tải dữ liệu...
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#1a2332]">
                      <TableHead className="text-white">Mã đơn</TableHead>
                      <TableHead className="text-white">Tổng tiền</TableHead>
                      <TableHead className="text-white">Trạng thái</TableHead>
                      <TableHead className="text-white">Ngày tạo</TableHead>
                      <TableHead className="text-white text-right">
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
                              <Select
                                value={String(statusNum)}
                                onValueChange={(v) => handleUpdateStatus(order, parseInt(v))}
                              >
                                <SelectTrigger className="w-[200px] bg-white/10 border-gray-300">
                                  <SelectValue>
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(
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
                            </TableCell>

                            <TableCell>
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleString("vi-VN")
                                : "-"}
                            </TableCell>

                            <TableCell className="text-right flex gap-2 justify-end">
                              {Number(order.status) === 6 && (
                                <Button
                                  size="sm"
                                  className="bg-purple-600 text-white"
                                  onClick={() => openRefundDialog(order)}
                                >
                                  Duyệt hoàn tiền
                                </Button>
                              )}

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
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===============================
          REFUND DIALOG (ĐƯA RA NGOÀI TABLE)
      =============================== */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-lg bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>Duyệt hoàn tiền</DialogTitle>
          </DialogHeader>

          {refundOrder && (
            <div className="space-y-4">
              <p><b>Mã đơn:</b> {refundOrder.orderId}</p>
              <p><b>Số tiền hoàn:</b> {formatVND(refundOrder.totalPrice)}</p>

              <h4 className="font-semibold">Sản phẩm trong đơn:</h4>

              <div className="space-y-2">
                {refundDetails.map((item) => (
                  <div key={item.orderDetailId} className="flex justify-between text-sm border-b py-3">
                    <span>{item.book?.bookName ?? item.bookId}</span>
                    <span>{item.quantity} × {formatVND(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" onClick={() => setRefundOpen(false)}>
                  Đóng
                </Button>
                <Button className="bg-purple-600 text-white" onClick={approveRefund}>
                  Chấp nhận hoàn tiền
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

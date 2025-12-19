import { useEffect, useState } from "react";
import { Menu, X, Loader2, Trash2 } from "lucide-react";
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
import { resolveFirebaseUrl } from "@/firebase";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
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
  const [convertedImageUrl, setConvertedImageUrl] = useState("");
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [selectedDeleteOrderId, setSelectedDeleteOrderId] = useState<string | null>(null);
  const [openApproveConfirm, setOpenApproveConfirm] = useState(false);

  const TRANS_STATUS = {
    NOT_PAID: 0,
    PROCESSING: 1,
    CANCELED: 2,
    PAID: 3,
  } as const;

  const ORDER_STATUS = {
    UNORDERED: 0,
    PENDING: 1,
    PROCESSING: 2,
    SHIPPING: 3,
    DELIVERED: 4,
    RECEIVED: 5,
    CANCELLED: 6,
    RETURNED: 7,
  } as const;

  const mapOrderStatus = (status: number) => {
    switch (status) {
      case ORDER_STATUS.UNORDERED: return "Chưa đặt hàng";
      case ORDER_STATUS.PENDING: return "Chờ xác nhận";
      case ORDER_STATUS.PROCESSING: return "Đang xử lý";
      case ORDER_STATUS.SHIPPING: return "Đang vận chuyển";
      case ORDER_STATUS.DELIVERED: return "Đã giao (chờ xác nhận)";
      case ORDER_STATUS.RECEIVED: return "Đã nhận hàng";
      case ORDER_STATUS.CANCELLED: return "Đã hủy";
      case ORDER_STATUS.RETURNED: return "Trả hàng";
      default: return "Không xác định";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case ORDER_STATUS.UNORDERED: return "bg-gray-100 text-gray-600";
      case ORDER_STATUS.PENDING: return "bg-yellow-100 text-yellow-600";
      case ORDER_STATUS.PROCESSING: return "bg-blue-100 text-blue-600";
      case ORDER_STATUS.SHIPPING: return "bg-indigo-100 text-indigo-600";
      case ORDER_STATUS.DELIVERED: return "bg-emerald-100 text-emerald-600";
      case ORDER_STATUS.RECEIVED: return "bg-green-100 text-green-600";
      case ORDER_STATUS.CANCELLED: return "bg-red-100 text-red-600";
      case ORDER_STATUS.RETURNED: return "bg-purple-100 text-purple-600";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const getAllowedStatuses = (current: number) => {
    switch (current) {
      case ORDER_STATUS.PENDING: return [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED];
      case ORDER_STATUS.PROCESSING: return [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED];
      case ORDER_STATUS.SHIPPING: return [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];
      case ORDER_STATUS.DELIVERED: return [ORDER_STATUS.RECEIVED]; // thường user xác nhận, nhưng admin vẫn có thể set nếu cần
      default: return []; // 0,5,6,7 không cho đổi
    }
  };

  const [refundTrans, setRefundTrans] = useState<any | null>(null);
  const [loadingRefundTrans, setLoadingRefundTrans] = useState(false);

  const normalizeTransType = (t: any) =>
    String(t?.transType ?? t?.trans_type ?? t?.type ?? "").toUpperCase();

  const isRefundAlreadyPaid =
    !!refundTrans &&
    normalizeTransType(refundTrans) === "REFUND" &&
    Number(refundTrans.status) === TRANS_STATUS.PAID;

  // ===============================
  //  FETCH ALL ORDERS
  // ===============================
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await OrderService.getAllOrders();
      const formatted = res.map(o => ({
        ...o,
        status: Number(o.status),
      }));
      setOrders(formatted);
    } catch {
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (refundOrder?.imageUrl) {
      resolveFirebaseUrl(refundOrder.imageUrl).then((url) => {
        setConvertedImageUrl(url);
      });
    }
  }, [refundOrder]);


  // ===============================
  //  OPEN REFUND DIALOG
  // ===============================
  const openRefundDialog = async (order: OrderResponse) => {
    setRefundOrder(order);
    setRefundDetails([]);
    setRefundOpen(true);

    // reset trước khi load
    setRefundTrans(null);
    setLoadingRefundTrans(true);

    try {
      const [details, trans] = await Promise.all([
        OrderDetailService.getOrderDetailsByOrderId(order.orderId),
        getRefundTransaction(order.orderId).catch(() => null),
      ]);

      setRefundTrans(trans);

      const enriched = await Promise.all(
        details.map(async (d) => ({
          ...d,
          book: await getBookById(d.bookId).catch(() => null),
        }))
      );

      setRefundDetails(enriched);
    } finally {
      setLoadingRefundTrans(false);
    }
  };


  // ===============================
  //  GET REFUND TRANSACTION
  // ===============================
  async function getRefundTransaction(orderId: string) {
    const res = await TransactionService.search({ orderId });

    const list = Array.isArray((res as any)?.content) ? (res as any).content : [];

    const normalizeType = (t: any) =>
      String(t?.transType ?? t?.trans_type ?? t?.type ?? "").toUpperCase();

    const found = list.find((t: any) => normalizeType(t) === "REFUND") || null;

    return found;
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
        totalPrice: refundTrans.totalPrice,
        status: TRANS_STATUS.PAID,          // 3
        orderId: refundTrans.orderId,
        paymentMethodId: refundTrans.paymentMethodId,
        walletId: refundTrans.walletId,
        transType: "REFUND",                // ✅ ép giữ REFUND
        isActived: refundTrans.isActived ?? "ACTIVE",
      });

      console.log("refundTrans:", refundTrans);

      // 3️⃣ Lấy ví user
      const walletId = refundOrder.walletId;  // CHUẨN NHẤT

      const wallet = await getWalletById(walletId);

      // 4️⃣ Cộng tiền hoàn vào ví
      await updateWallet(walletId, {
        balance: wallet.balance + refundOrder.totalPrice,
      });

      await OrderService.updateOrder(refundOrder.orderId, { status: ORDER_STATUS.RETURNED });

      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === refundOrder.orderId
            ? { ...o, status: ORDER_STATUS.RETURNED }
            : o
        )
      );

      toast.success("Duyệt hoàn tiền thành công!");

      // 7️⃣ Đóng modal
      setRefundOpen(false);
      setRefundOrder(null);
      setRefundTrans(null);

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
  const filteredOrders = orders
    .slice() // tránh mutate state gốc
    .sort((a, b) => {
      const t1 = new Date(b.createdAt ?? "").getTime();
      const t2 = new Date(a.createdAt ?? "").getTime();
      return t1 - t2; // mới nhất lên đầu
    })
    .filter((order) => {
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
            ? { ...o, status: newStatus }
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
              {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
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
                    <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
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
                        const allowed = getAllowedStatuses(statusNum);

                        return (
                          <TableRow key={order.orderId} className="hover:bg-gray-50 text-gray-800">
                            <TableCell>{order.orderId}</TableCell>

                            <TableCell>{order.totalPrice.toLocaleString("vi-VN")}₫</TableCell>

                            <TableCell>
                              <Select
                                disabled={allowed.length === 0}
                                value={String(statusNum)}
                                onValueChange={(v) => handleUpdateStatus(order, parseInt(v))}
                              >
                                <SelectTrigger className="w-[200px] bg-white/10 border-gray-300">
                                  <SelectValue>
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(statusNum)}`}>
                                      {mapOrderStatus(statusNum)}
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>

                                <SelectContent>
                                  {allowed.map((s) => (
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
                              {Number(order.status) === ORDER_STATUS.RETURNED && (
                                <Button
                                  size="sm"
                                  className="bg-purple-600 text-white"
                                  onClick={() => openRefundDialog(order)}
                                >
                                  Chi tiết
                                </Button>
                              )}

                              <AlertDialog
                                open={openDeleteConfirm && selectedDeleteOrderId === order.orderId}
                                onOpenChange={(open) => {
                                  setOpenDeleteConfirm(open);
                                  if (!open) setSelectedDeleteOrderId(null);
                                }}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    disabled={statusNum === 4 || statusNum === 5}
                                    onClick={() => {
                                      setSelectedDeleteOrderId(order.orderId);
                                      setOpenDeleteConfirm(true);
                                      window.location.reload();
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Xác nhận xoá đơn hàng</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Bạn có chắc chắn muốn xoá đơn hàng{" "}
                                      <b>{order.orderId}</b>?
                                      <br />
                                      <span className="text-red-600 font-medium">
                                        Hành động này không thể hoàn tác.
                                      </span>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Huỷ</AlertDialogCancel>

                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                      onClick={async () => {
                                        if (!selectedDeleteOrderId) return;
                                        await handleDelete(selectedDeleteOrderId);
                                        setOpenDeleteConfirm(false);
                                        setSelectedDeleteOrderId(null);
                                      }}
                                    >
                                      Xoá
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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

              {/* ⭐ HIỂN THỊ LÝ DO TRẢ HÀNG */}
              {refundOrder.reason && (
                <div className="bg-gray-100 p-3 rounded-lg border">
                  <p className="font-semibold text-gray-700">Lý do trả hàng:</p>
                  <p className="text-gray-800 whitespace-pre-wrap mt-1">
                    {refundOrder.reason}
                  </p>
                </div>
              )}

              {/* ⭐ HIỂN THỊ ẢNH TRẢ HÀNG */}
              {refundOrder.imageUrl && (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">Ảnh minh chứng:</p>
                  <img
                    src={convertedImageUrl}
                    alt="Ảnh trả hàng"
                    className="w-full max-h-80 object-contain rounded-lg border"
                  />
                </div>
              )}

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

                {/* Nếu đang load transaction thì tạm ẩn/disable nút */}
                {loadingRefundTrans ? null : (
                  <>
                    {/* ✅ Nếu REFUND đã PAID thì ẩn nút Chấp nhận hoàn tiền */}
                    {!isRefundAlreadyPaid ? (
                      <AlertDialog open={openApproveConfirm} onOpenChange={setOpenApproveConfirm}>
                        <AlertDialogTrigger asChild>
                          <Button className="bg-purple-600 text-white">
                            Chấp nhận hoàn tiền
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận duyệt hoàn tiền</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc chắn muốn duyệt hoàn tiền cho đơn hàng{" "}
                              <b>{refundOrder?.orderId}</b>?
                              <br />
                              <span className="text-red-600 font-medium">
                                Thao tác này sẽ cộng tiền vào ví người dùng và không thể hoàn tác.
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Huỷ</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={async () => {
                                await approveRefund();
                                setOpenApproveConfirm(false);
                              }}
                            >
                              Xác nhận
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <div className="text-sm font-medium text-green-600 flex items-center">
                        Đơn này đã được duyệt hoàn tiền (REFUND: PAID).
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

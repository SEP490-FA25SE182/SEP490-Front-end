import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail } from "@/services/UserService";
import { CartService } from "@/services/CartService";
import { OrderService, type OrderResponse } from "@/services/OrderService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { formatVND } from "@/lib/money";
import { toast } from "sonner";
import { OrderDetailService } from "@/services/OrderDetailService";
import { getBookById } from "@/services/BookService";
import {
  FeedbackService,
  type CreateFeedbackRequest,
  type Feedback,
} from "@/services/FeedbackService";
import { Star } from "lucide-react";
import {
  TransactionService,
  type TransactionRequest,
} from "@/services/TransactionService";
import { UploadService } from "@/services/FirebaseService";
import { resolveFirebaseUrl } from "@/firebase";

export default function TransactionPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [openFeedback, setOpenFeedback] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [rating, setRating] = useState("5");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [userFeedbackMap, setUserFeedbackMap] = useState<
    Record<string, boolean>
  >({});
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnImageUrl, setReturnImageUrl] = useState("");
  const [selectedReturnOrder, setSelectedReturnOrder] =
    useState<OrderResponse | null>(null);
  const [isReturnSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewReturnImageUrl, setPreviewReturnImageUrl] = useState("");
  const [openRefundDetail, setOpenRefundDetail] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundTrans, setRefundTrans] = useState<any | null>(null);
  const [openReturnConfirm, setOpenReturnConfirm] = useState(false);

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
      case ORDER_STATUS.UNORDERED:
        return "Chưa đặt hàng";
      case ORDER_STATUS.PENDING:
        return "Chờ xác nhận";
      case ORDER_STATUS.PROCESSING:
        return "Đang xử lý";
      case ORDER_STATUS.SHIPPING:
        return "Đang vận chuyển";
      case ORDER_STATUS.DELIVERED:
        return "Đã giao (chờ xác nhận)";
      case ORDER_STATUS.RECEIVED:
        return "Đã nhận hàng";
      case ORDER_STATUS.CANCELLED:
        return "Đã hủy";
      case ORDER_STATUS.RETURNED:
        return "Đã trả hàng";
      default:
        return "Không xác định";
    }
  };

  const getStatusBadgeClass = (status: number) => {
    switch (status) {
      case ORDER_STATUS.UNORDERED:
        return "bg-gray-100 text-gray-600";
      case ORDER_STATUS.PENDING:
        return "bg-yellow-100 text-yellow-600";
      case ORDER_STATUS.PROCESSING:
        return "bg-blue-100 text-blue-600";
      case ORDER_STATUS.SHIPPING:
        return "bg-indigo-100 text-indigo-600";
      case ORDER_STATUS.DELIVERED:
        return "bg-emerald-100 text-emerald-700";
      case ORDER_STATUS.RECEIVED:
        return "bg-green-100 text-green-700";
      case ORDER_STATUS.CANCELLED:
        return "bg-red-100 text-red-700";
      case ORDER_STATUS.RETURNED:
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const TRANS_STATUS = {
    NOT_PAID: 0,
    PROCESSING: 1,
    CANCELED: 2,
    PAID: 3,
  } as const;

  const mapTransactionStatus = (status: number) => {
    switch (status) {
      case TRANS_STATUS.NOT_PAID:
        return "Chưa thanh toán";
      case TRANS_STATUS.PROCESSING:
        return "Đang xử lý";
      case TRANS_STATUS.CANCELED:
        return "Đã huỷ";
      case TRANS_STATUS.PAID:
        return "Đã thanh toán";
      default:
        return "Không xác định";
    }
  };

  const shortOrderCode = (orderId?: string) => {
    if (!orderId) return "-";
    return orderId.split("-")[0];
  };

  function getRefundStep(status: number) {
    // 0 NOT_PAID -> step 1 (mới gửi)
    // 1 PROCESSING -> step 2 (đang hoàn)
    // 2 CANCELED -> step 3 (kết thúc - huỷ)
    // 3 PAID -> step 3 (kết thúc - đã hoàn)
    if (status === TRANS_STATUS.NOT_PAID) return 1;
    if (status === TRANS_STATUS.PROCESSING) return 2;
    if (status === TRANS_STATUS.CANCELED) return 3;
    if (status === TRANS_STATUS.PAID) return 3;
    return 1;
  }

  function getRefundEndLabel(status: number) {
    return status === TRANS_STATUS.CANCELED ? "Đã huỷ" : "Đã hoàn tiền";
  }

  function getRefundMessage(status: number) {
    if (status === TRANS_STATUS.NOT_PAID) {
      return "Yêu cầu huỷ đơn hàng/hoàn tiền của bạn đã được ghi nhận và đang chờ xử lý.";
    }
    if (status === TRANS_STATUS.PROCESSING) {
      return "Yêu cầu huỷ đơn hàng/hoàn tiền của bạn đang được Rookies xử lý. Với đơn hàng hoàn tiền sẽ cần thời gian xử lý từ 3 - 14 ngày để ngân hàng cập nhật tiền hoàn. Bạn có thể liên hệ ngân hàng để kiểm tra ngày cập nhật cụ thể nhé.";
    }
    if (status === TRANS_STATUS.CANCELED) {
      return "Yêu cầu huỷ đơn hàng/hoàn tiền của bạn đã bị huỷ hoặc không thể xử lý.";
    }
    // PAID
    return "Yêu cầu huỷ đơn hàng/hoàn tiền của bạn đã được xử lý. Tiền hoàn sẽ được cập nhật vào ví theo giao dịch hoàn tiền.";
  }

  // 🧩 Fetch danh sách order theo cartId
  useEffect(() => {
    async function fetchOrders() {
      try {
        if (!user?.email) return;

        // 1️⃣ Lấy userId
        const userRes = await getUserByEmail(user.email);
        const userId = userRes?.userId;
        if (!userId) {
          toast("Không tìm thấy người dùng.");
          return;
        }

        // 2️⃣ Lấy cartId theo userId
        const cart = await CartService.getCartByUserId(userId);
        const cartId = Array.isArray(cart) ? cart[0]?.cartId : cart?.cartId;
        if (!cartId) {
          toast("Không tìm thấy giỏ hàng của bạn.");
          return;
        }

        // 3️⃣ Gọi BE lấy danh sách order theo cartId
        const res = await OrderService.getOrderByCartId(cartId);
        if (Array.isArray(res)) {
          const now = new Date();

          // Sắp xếp mới nhất lên đầu
          const sorted = [...res].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Lọc theo thời gian
          const filtered = sorted.filter((order) => {
            const created = new Date(order.createdAt);
            const diffDays =
              (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            if (filter === "7days") return diffDays <= 7;
            if (filter === "30days") return diffDays <= 30;
            return true;
          });

          setOrders(filtered.map((o) => ({ ...o, status: Number(o.status) })));
        } else {
          toast("Không tìm thấy đơn hàng nào.");
        }
      } catch (error) {
        console.error(error);
        toast("Lỗi khi tải danh sách đơn hàng.");
      }
    }

    fetchOrders();
  }, [user, filter]); // 🆕 Thêm filter vào dependency

  useEffect(() => {
    if (!returnImageUrl) {
      setPreviewReturnImageUrl("");
      return;
    }

    resolveFirebaseUrl(returnImageUrl).then((url) => {
      setPreviewReturnImageUrl(url);
    });
  }, [returnImageUrl]);

  const handleReturnImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      toast.loading("Đang tải ảnh...");

      const gsUrl = await UploadService.uploadImageToFirebase(file, "return");
      // folder “return” để tách biệt với “blog”

      setReturnImageUrl(gsUrl);

      toast.success("Tải ảnh thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải ảnh!");
    } finally {
      toast.dismiss();
      setIsUploadingImage(false);
    }
  };

  async function getPaymentTransaction(orderId: string) {
    const res = await TransactionService.search({ orderId });

    console.log("RAW TRANSACTION SEARCH:", res);

    // ⚡ CASE 1: BE trả về dạng { content: [...] }
    const list = Array.isArray(res?.content) ? res.content : [];

    // Tìm transaction PAYMENT
    return list.find((t) => t.transType === "PAYMENT") || null;
  }

  async function fetchRefundTransaction(orderId: string) {
    setRefundLoading(true);
    try {
      const res = await TransactionService.searchTransactions({
        orderId,
        transType: "REFUND",
        page: 0,
        size: 10,
      });

      const list = Array.isArray(res?.content) ? res.content : [];
      const found = list.find((t: any) => t.transType === "REFUND") || null;

      setRefundTrans(found);
      setOpenRefundDetail(true);
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải chi tiết hoàn tiền.");
    } finally {
      setRefundLoading(false);
    }
  }

  async function handleReturn(
    order: OrderResponse,
    reason: string,
    imageUrl: string,
    onSuccess?: () => void
  ) {
    try {
      toast.loading("Đang xử lý trả hàng & tạo hoàn tiền...");

      // ✅ 1) Update ORDER -> RETURNED (7) + reason + imageUrl
      await OrderService.updateOrder(order.orderId, {
        status: ORDER_STATUS.RETURNED,
        reason,
        imageUrl,
      });

      // Update UI ngay
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === order.orderId
            ? { ...o, status: ORDER_STATUS.RETURNED, reason, imageUrl }
            : o
        )
      );

      // ✅ 2) Lấy PAYMENT transaction để lấy paymentMethodId + walletId
      const paymentTrans = await getPaymentTransaction(order.orderId);
      if (!paymentTrans) {
        toast.error(
          "Không tìm thấy giao dịch thanh toán (PAYMENT) để tạo hoàn tiền!"
        );
        return;
      }

      // ✅ 3) Create REFUND transaction (NOT_PAID)
      const payload: TransactionRequest = {
        totalPrice: order.totalPrice,
        status: TRANS_STATUS.NOT_PAID, // 0
        orderId: order.orderId,
        paymentMethodId: paymentTrans.paymentMethodId,
        walletId: paymentTrans.walletId,
        transType: "REFUND",
        isActived: "ACTIVE",
      };

      await TransactionService.create(payload);

      toast.success("Đã gửi yêu cầu trả hàng & tạo giao dịch hoàn tiền!");
      onSuccess?.();
    } catch (err) {
      console.error("❌ Lỗi trả hàng/hoàn tiền:", err);
      toast.error("Không thể xử lý yêu cầu trả hàng & hoàn tiền.");
    } finally {
      toast.dismiss();
    }
  }

  async function handleConfirmReceived(
    order: OrderResponse,
    onSuccess?: () => void
  ) {
    try {
      toast.loading("Đang xác nhận...");

      // DELIVERED (4) -> RECEIVED (5)
      await OrderService.updateOrder(order.orderId, {
        status: ORDER_STATUS.RECEIVED,
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === order.orderId
            ? { ...o, status: ORDER_STATUS.RECEIVED }
            : o
        )
      );

      toast.success("Cảm ơn bạn! Đã xác nhận nhận hàng.");
      onSuccess?.();
    } catch (err) {
      console.error("❌ Lỗi xác nhận đơn:", err);
      toast.error("Không thể xác nhận đơn hàng.");
    } finally {
      toast.dismiss();
    }
  }

  // 🧾 Xem chi tiết
  const handleOpenDetail = async (payment: any) => {
    setSelected(payment);
    setIsLoading(true);
    setOrderDetails([]); // reset trước

    try {
      const details = await OrderDetailService.getOrderDetailsByOrderId(
        payment.orderId
      );

      const enrichedDetails = await Promise.all(
        details.map(async (d: any) => {
          try {
            const book = await getBookById(d.bookId);
            return { ...d, book };
          } catch {
            return { ...d, book: null };
          }
        })
      );

      setOrderDetails(enrichedDetails);
      try {
        // Lấy userId từ email
        const userRes = await getUserByEmail(user?.email || "");
        const userId = userRes?.userId;

        if (userId) {
          // Gọi API lấy feedback của user này
          const feedbacks = await FeedbackService.getAll({ userId });

          // Tạo map { bookId: true } để biết sách nào đã đánh giá
          const feedbackMap: Record<string, boolean> = {};
          feedbacks.forEach((fb: any) => {
            feedbackMap[fb.bookId] = true;
          });

          setUserFeedbackMap(feedbackMap);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải feedback của user:", err);
      }
    } catch (err) {
      console.error("❌ Lỗi khi lấy order details:", err);
      toast("Không thể tải chi tiết đơn hàng!");
    } finally {
      setIsLoading(false);
    }
  };

  function RefundTimeline({
    step,
    endLabel,
  }: {
    step: number; // 1..3
    endLabel: string;
  }) {
    const activeText = "text-gray-800";
    const inactiveText = "text-gray-400";

    const dotActive = "bg-purple-600 border-purple-600";
    const dotInactive = "bg-white border-gray-300";

    const lineActive = "bg-purple-600";
    const lineInactive = "bg-gray-200";

    return (
      <div className="w-full">
        <div className="flex items-center justify-between">
          {/* Dot 1 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                step >= 1 ? dotActive : dotInactive
              }`}
            >
              <span className="text-white font-bold">
                {step >= 1 ? "✓" : ""}
              </span>
            </div>
            <p
              className={`mt-2 text-sm ${
                step >= 1 ? activeText : inactiveText
              }`}
            >
              Gửi yêu cầu
            </p>
          </div>

          {/* Line 1 */}
          <div
            className={`h-1 flex-1 mx-3 rounded ${
              step >= 2 ? lineActive : lineInactive
            }`}
          />

          {/* Dot 2 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                step >= 2 ? dotActive : dotInactive
              }`}
            >
              <span className="text-white font-bold">
                {step >= 2 ? "✓" : ""}
              </span>
            </div>
            <p
              className={`mt-2 text-sm ${
                step >= 2 ? activeText : inactiveText
              }`}
            >
              Đang hoàn tiền
            </p>
          </div>

          {/* Line 2 */}
          <div
            className={`h-1 flex-1 mx-3 rounded ${
              step >= 3 ? lineActive : lineInactive
            }`}
          />

          {/* Dot 3 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                step >= 3 ? dotActive : dotInactive
              }`}
            >
              <span className="text-white font-bold">
                {step >= 3 ? "✓" : ""}
              </span>
            </div>
            <p
              className={`mt-2 text-sm ${
                step >= 3 ? activeText : inactiveText
              }`}
            >
              {endLabel}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 🆕 Bộ lọc */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">LỊCH SỬ ĐƠN HÀNG</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="all">Tất cả</option>
          <option value="7days">7 ngày gần nhất</option>
          <option value="30days">30 ngày gần nhất</option>
        </select>
      </div>

      {/* Danh sách đơn hàng */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.orderId}
            onClick={() => handleOpenDetail(order)}
            className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-800">
                Đơn hàng #{shortOrderCode(order.orderId)}
              </h3>
              <p className="text-gray-500 text-sm">
                Tổng tiền: {formatVND(order.totalPrice)}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Ngày tạo: {new Date(order.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full inline-block mt-1 ${getStatusBadgeClass(
                  Number(order.status)
                )}`}
              >
                {mapOrderStatus(Number(order.status))}
              </span>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <p className="text-gray-400 text-center py-8 italic">
            Không có đơn hàng trong khoảng thời gian này.
          </p>
        )}
      </div>

      {/* Modal chi tiết */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg bg-white text-gray-800">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <p className="text-center text-gray-500 py-4">
              Đang tải chi tiết...
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <p>
                  <b>Mã đơn hàng:</b> #{shortOrderCode(selected?.orderId)}
                </p>
                <p>
                  <b>Trạng thái:</b> {mapOrderStatus(Number(selected?.status))}
                </p>
                {selected?.shippingFee != null && (
                  <p>
                    <b>Phí giao hàng:</b>{" "}
                    {formatVND(Number(selected.shippingFee))}
                  </p>
                )}
                <p>
                  <b>Tổng tiền:</b> {formatVND(selected?.totalPrice)}
                </p>
                <p>
                  <b>Ngày tạo:</b>{" "}
                  {new Date(selected?.createdAt).toLocaleString("vi-VN")}
                </p>
                {selected?.updatedAt && (
                  <p>
                    <b>Cập nhật lúc:</b>{" "}
                    {new Date(selected.updatedAt).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              <h4 className="font-semibold text-gray-700 mb-2">
                Sản phẩm trong đơn hàng
              </h4>
              <div className="space-y-2">
                {orderDetails.length > 0 ? (
                  orderDetails.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm border-b py-2"
                    >
                      <div className="flex items-center gap-3">
                        {item.book?.coverUrl && (
                          <img
                            src={item.book.coverUrl}
                            alt={item.book.bookName}
                            className="w-10 h-14 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">
                            {item.book?.bookName || `Sách #${item.bookId}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            SL: {item.quantity} × {formatVND(item.price)}
                          </p>

                          {/* ✅ Nút đánh giá (chỉ hiện khi đơn đã nhận) */}
                          {selected?.status === 5 &&
                            !userFeedbackMap[item.bookId] && (
                              <Button
                                className="bg-linear-to-l from-[#764BA2] to-[#667EEA] text-white hover:text-white cursor-pointer"
                                onClick={async () => {
                                  setSelectedBook(item);
                                  setOpenFeedback(true);
                                  setIsEditing(false);
                                  setExistingFeedback(null);
                                  setContent("");
                                  setRating("5");
                                }}
                              >
                                ✍️ Đánh giá
                              </Button>
                            )}
                        </div>
                      </div>
                      <span className="font-semibold">
                        {formatVND(item.price * item.quantity)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center italic py-4">
                    Không có sản phẩm trong đơn này.
                  </p>
                )}
              </div>
              <p className="text-xs text-red-400">
                Chỉ có thể trả hàng trước 7 ngày kể từ khi nhận.
              </p>
              <p className="text-xs text-red-400">
              (Các đơn trả sau 7 ngày sẽ tự động từ chối trừ trường hợp đặc biệt)
              </p>
              <div className="flex justify-between mt-6 items-center">
                {/* 🟦 Nút “ĐÃ NHẬN HÀNG” khi status = 3 (Đang vận chuyển) */}
                {Number(selected?.status) === ORDER_STATUS.DELIVERED && (
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() =>
                      handleConfirmReceived(selected as OrderResponse, () =>
                        setSelected(null)
                      )
                    }
                  >
                    Đã nhận hàng
                  </Button>
                )}

                {/*  Nút “Trả hàng” khi status = 5 (Đã nhận) */}
                {Number(selected?.status) === ORDER_STATUS.RECEIVED && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedReturnOrder(selected);
                      setReturnReason("");
                      setReturnImageUrl("");
                      setOpenReturnDialog(true);
                    }}
                  >
                    Trả hàng
                  </Button>
                )}

                {Number(selected?.status) === ORDER_STATUS.RETURNED && (
                  <Button
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    onClick={() => fetchRefundTransaction(selected.orderId)}
                  >
                    Chi tiết hoàn tiền
                  </Button>
                )}

                <Button variant="outline" onClick={() => setSelected(null)}>
                  Đóng
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openRefundDetail} onOpenChange={setOpenRefundDetail}>
        <DialogContent className="max-w-md bg-white text-gray-800">
          <DialogHeader>
            <DialogTitle>Chi tiết hoàn tiền</DialogTitle>
          </DialogHeader>

          {refundLoading ? (
            <p className="text-center text-gray-500 py-6">Đang tải...</p>
          ) : !refundTrans ? (
            <p className="text-center text-gray-500 py-6">
              Không tìm thấy giao dịch hoàn tiền (REFUND).
            </p>
          ) : (
            (() => {
              const tStatus = Number(refundTrans.status);
              const step = getRefundStep(tStatus);
              const endLabel = getRefundEndLabel(tStatus);
              const message = getRefundMessage(tStatus);

              return (
                <div className="space-y-5">
                  {/* ✅ Timeline giống ảnh */}
                  <RefundTimeline step={step} endLabel={endLabel} />

                  {/* ✅ Text mô tả dưới timeline */}
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {message}
                  </p>

                  {/* Thông tin hoàn tiền */}
                  <div className="rounded-xl border p-4 bg-gray-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Tổng tiền hoàn
                      </span>
                      <span className="font-bold">
                        {formatVND(refundTrans.totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Hoàn tiền vào
                      </span>
                      <span className="font-semibold">Ví tiền Rookies</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Yêu cầu bởi</span>
                      <span className="font-semibold">Người mua</span>
                    </div>

                    <div className="pt-2 border-t">
                      <span className="text-sm text-gray-500">Lý do</span>
                      <p className="font-medium whitespace-pre-wrap mt-1">
                        {selected?.reason || "Không có"}
                      </p>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-sm text-gray-500">Thời gian</span>
                      <span className="font-medium">
                        {refundTrans.updatedAt
                          ? new Date(refundTrans.updatedAt).toLocaleString(
                            "vi-VN"
                          )
                          : refundTrans.createdAt
                            ? new Date(refundTrans.createdAt).toLocaleString(
                              "vi-VN"
                            )
                            : "-"}
                      </span>
                    </div>

                    {/* optional: show raw transaction status */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Trạng thái giao dịch
                      </span>
                      <span className="font-semibold">
                        {mapTransactionStatus(tStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpenRefundDetail(false)}
                    >
                      Đóng
                    </Button>
                  </div>
                </div>
              );
            })()
          )}
        </DialogContent>
      </Dialog>

      {/* 🔹 DIALOG FEEDBACK HOÀN CHỈNH */}
      <Dialog open={openFeedback} onOpenChange={setOpenFeedback}>
        <DialogContent className="max-w-md bg-white text-gray-800">
          <DialogHeader>
            <DialogTitle>
              {selectedBook?.book?.bookName
                ? `Đánh giá cho "${selectedBook.book.bookName}"`
                : "Đánh giá sách"}
            </DialogTitle>
          </DialogHeader>

          {/* ⭐ Khu vực chọn số sao */}
          <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                onClick={() => {
                  if (!isEditing && existingFeedback) return; // Chỉ cho chọn khi đang tạo mới hoặc đang edit
                  setRating(String(star));
                }}
                className={`w-7 h-7 cursor-pointer transition-all ${
                  Number(rating) >= star
                    ? "fill-yellow-500 text-yellow-500 scale-110"
                    : "text-gray-300 hover:text-yellow-400"
                }`}
              />
            ))}
            <span className="text-sm text-gray-500 ml-2 select-none">
              {rating === "1" && "Tệ"}
              {rating === "2" && "Không hài lòng"}
              {rating === "3" && "Bình thường"}
              {rating === "4" && "Hài lòng"}
              {rating === "5" && "Tuyệt vời"}
            </span>
          </div>

          {/* ✍️ Nội dung đánh giá */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Nội dung</label>
            <textarea
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#764BA2] text-sm"
              rows={3}
              placeholder="Hãy chia sẻ cảm nhận của bạn..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={!!existingFeedback && !isEditing}
            />
          </div>

          {/* ⚙️ Các nút hành động */}

          <div className="flex justify-end gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => {
                // Blur focus trước khi đóng để tránh warning aria-hidden
                if (document.activeElement instanceof HTMLElement)
                  document.activeElement.blur();
                setOpenFeedback(false);
              }}
            >
              Đóng
            </Button>

            {/* ✅ Nếu chưa có feedback → gửi mới */}
            {!existingFeedback ? (
              <Button
                className="bg-linear-to-l from-[#764BA2] to-[#667EEA] text-white hover:opacity-90"
                onClick={async () => {
                  if (!user?.email || !selectedBook) return;
                  try {
                    setIsSubmitting(true);
                    const userRes = await getUserByEmail(user.email);
                    const userId = userRes?.userId;

                    const payload: CreateFeedbackRequest = {
                      content,
                      rating,
                      userId,
                      bookId: selectedBook.bookId,
                      orderDetailId: selectedBook.orderDetailId,
                    };

                    await FeedbackService.create(payload);
                    toast.success("🎉 Cảm ơn bạn đã đánh giá!");
                    setUserFeedbackMap((prev) => ({
                      ...prev,
                      [selectedBook.bookId]: true,
                    }));
                    if (document.activeElement instanceof HTMLElement)
                      document.activeElement.blur();
                    setOpenFeedback(false);
                    setContent("");
                    setRating("5");
                  } catch (err) {
                    console.error("❌ Lỗi khi gửi feedback:", err);
                    toast.error("Không thể gửi đánh giá.");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
            ) : (
              /* ✏️ Nếu đã có feedback → xem hoặc chỉnh sửa */
              <Button
                className={`${
                  isEditing
                    ? "bg-linear-to-l from-[#764BA2] to-[#667EEA]"
                    : "bg-[#3B2A66]"
                } text-white hover:opacity-90`}
                onClick={async () => {
                  if (!isEditing) {
                    // bật chế độ chỉnh sửa
                    setIsEditing(true);
                  } else {
                    try {
                      setIsSubmitting(true);
                      await FeedbackService.update(
                        existingFeedback.feedbackId,
                        {
                          content,
                          rating,
                        }
                      );
                      toast.success("✅ Đã cập nhật đánh giá!");
                      setIsEditing(false);
                    } catch (err) {
                      console.error("❌ Lỗi khi cập nhật feedback:", err);
                      toast.error("Không thể cập nhật đánh giá.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
                disabled={isSubmitting}
              >
                {isEditing
                  ? isSubmitting
                    ? "Đang lưu..."
                    : "💾 Lưu thay đổi"
                  : "✏️ Chỉnh sửa"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔹 DIALOG TRẢ HÀNG */}
      <Dialog open={openReturnDialog} onOpenChange={setOpenReturnDialog}>
        <DialogContent className="max-w-md bg-white text-gray-800">
          <DialogHeader>
            <DialogTitle>Yêu cầu trả hàng</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            {/* Lý do trả hàng */}
            <div>
              <label className="text-sm font-medium">Lý do</label>
              <textarea
                className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-400"
                rows={3}
                placeholder="Vui lòng nhập lý do trả hàng..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
              {!returnReason.trim() && (
                <p className="text-xs text-red-500 mt-1">
                  Vui lòng nhập lý do trả hàng
                </p>
              )}
            </div>

            {/* Hình ảnh */}
            <div>
              <label className="text-sm font-medium">Ảnh minh chứng</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleReturnImageUpload}
                className="border rounded px-3 py-2 w-full text-sm bg-white"
              />

              {isUploadingImage && (
                <p className="text-sm text-gray-500 mt-1">
                  Đang tải ảnh lên...
                </p>
              )}

              {returnImageUrl && (
                <img
                  src={previewReturnImageUrl}
                  alt="Ảnh tải lên"
                  className="w-32 h-auto mt-2 rounded border"
                />
              )}

              {/* Nếu bạn dùng upload Firebase → mình có thể viết giúp ngay */}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => setOpenReturnDialog(false)}
            >
              Huỷ
            </Button>

            <AlertDialog
              open={openReturnConfirm}
              onOpenChange={setOpenReturnConfirm}
            >
              <AlertDialogTrigger asChild>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={
                    isReturnSubmitting ||
                    !returnReason.trim() ||
                    isUploadingImage
                  }
                >
                  {isReturnSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Xác nhận trả hàng & hoàn tiền
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn trả hàng và yêu cầu hoàn tiền cho đơn
                    hàng này?
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
                      if (!selectedReturnOrder) return;

                      await handleReturn(
                        selectedReturnOrder,
                        returnReason,
                        returnImageUrl,
                        () => {
                          setSelected(null);
                          setOpenReturnDialog(false);
                        }
                      );

                      setOpenReturnConfirm(false);
                    }}
                  >
                    Xác nhận
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

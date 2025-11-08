import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail } from "@/services/UserService";
import { CartService } from "@/services/CartService";
import { OrderService } from "@/services/OrderService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatVND } from "@/lib/money";
import { toast } from "sonner";
import { OrderDetailService } from "@/services/OrderDetailService";
import { getBookById } from "@/services/BookService";
import { FeedbackService, type CreateFeedbackRequest, type Feedback } from "@/services/FeedbackService";
import { Star } from "lucide-react";



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
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userFeedbackMap, setUserFeedbackMap] = useState<Record<string, boolean>>({});





  // 🔹 Map status enum (BE trả byte)
  const mapOrderStatus = (status: number) => {
    switch (status) {
      case 0:
        return "Chưa đặt hàng";
      case 1:
        return "Chờ xác nhận";
      case 2:
        return "Đang xử lý";
      case 3:
        return "Đang vận chuyển";
      case 4:
        return "Đã giao thành công";
      case 5:
        return "Đã hủy";
      case 6:
        return "Đã trả hàng";
      default:
        return "Không xác định";
    }
  };



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

          setOrders(filtered);
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

  return (
    <div className="p-6">
      {/* 🆕 Bộ lọc */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">
          LỊCH SỬ ĐƠN HÀNG
        </h1>
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
                Đơn hàng #{order.orderId}
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
                className={`text-xs font-semibold px-2 py-1 rounded-full inline-block mt-1 ${order.status === 4
                  ? "bg-green-100 text-green-600"
                  : order.status === 1
                    ? "bg-yellow-100 text-yellow-600"
                    : order.status === 5
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
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
                  <b>Mã đơn hàng:</b> {selected?.orderId}
                </p>
                <p>
                  <b>Trạng thái:</b> {mapOrderStatus(Number(selected?.status))}
                </p>
                <p>
                  <b>Tổng tiền:</b> {formatVND(selected?.totalPrice)}
                </p>
                <p>
                  <b>Ngày tạo:</b>{" "}
                  {new Date(selected?.createdAt).toLocaleString("vi-VN")}
                </p>
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

                          {/* ✅ Nút đánh giá (chỉ hiện khi đơn đã giao thành công) */}
                          {selected?.status === 4 && !userFeedbackMap[item.bookId] && (
                            <Button
                              className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white hover:text-white cursor-pointer"
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

              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Đóng
                </Button>
              </div>
            </>
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
                className={`w-7 h-7 cursor-pointer transition-all ${Number(rating) >= star
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
                className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white hover:opacity-90"
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
                className={`${isEditing
                  ? "bg-gradient-to-l from-[#764BA2] to-[#667EEA]"
                  : "bg-[#3B2A66]"
                  } text-white hover:opacity-90`}
                onClick={async () => {
                  if (!isEditing) {
                    // bật chế độ chỉnh sửa
                    setIsEditing(true);
                  } else {
                    try {
                      setIsSubmitting(true);
                      await FeedbackService.update(existingFeedback.feedbackId, {
                        content,
                        rating,
                      });
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


    </div>
  );
}

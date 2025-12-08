import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatVND } from "@/lib/money";
import { getAllBooks, getBookById, type Book } from "@/services/BookService";
import { useCart } from "@/context/CartContext";

import { FeedbackService, type Feedback } from "@/services/FeedbackService";
import { getUserById } from "@/services/UserService";
import { getAllGenres, type Genre } from "@/services/GenreService";
import { useAuth } from "@/context/AuthContext";


/* ---------------------------
 🧩 Review và StarRating
--------------------------- */
const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-5 h-5 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
      />
    ))}
  </div>
);

/* ---------------------------
 📘 BookCard cho sách liên quan
--------------------------- */
const BookCard: React.FC<{ book: Book }> = ({ book }) => (
  <Link to={`/book/${book.bookId}`}>
    <div className="cursor-pointer group">
      <div className="aspect-[3/4] overflow-hidden rounded-xl mb-3 shadow-xl">
        <img
          src={book.coverUrl}
          alt={book.bookName}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%23667eea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='white'%3ENo Image%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>
      <h3 className="text-white font-medium text-base line-clamp-2 mb-1">
        {book.bookName}
      </h3>
      <p className="text-white/50 text-sm line-clamp-1">
        {book.decription || "Không có mô tả"}
      </p>
    </div>
  </Link>
);

/* ---------------------------
 🌟 BookDetail chính
--------------------------- */
export const BookDetail = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [showPreview, setShowPreview] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);


  const [book, setBook] = useState<Book | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // 🩵 Feedback state
  interface FeedbackWithUser extends Feedback {
    userName?: string;
  }
  const [feedbacks, setFeedbacks] = useState<FeedbackWithUser[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);

  /* ---------------------------
   📡 Fetch book detail & feedbacks
  --------------------------- */
  useEffect(() => {
    const fetchBookData = async () => {
      try {
        if (!bookId) return;

        // 1️⃣ Lấy thông tin sách
        const bookData = await getBookById(bookId);
        setBook(bookData);

        // 🔹 Lấy danh sách thể loại theo bookId
        const genresData = await getAllGenres(bookId);
        setGenres(genresData ?? []);


        // 2️⃣ Lấy feedback thật từ API
        const allFeedbacks = await FeedbackService.getAll();
        const filtered = allFeedbacks.filter(
          (f) => f.bookId === bookId && f.isActived === "ACTIVE"
        );

        // 3️⃣ Gắn tên người dùng song song
        const feedbacksWithUser = await Promise.all(
          filtered.map(async (f) => {
            try {
              const user = await getUserById(f.userId);
              return { ...f, userName: user.fullName || "Người dùng ẩn danh" };
            } catch {
              return { ...f, userName: "Người dùng ẩn danh" };
            }
          })
        );
        setFeedbacks(feedbacksWithUser);

        // 4️⃣ Tính trung bình rating
        if (feedbacksWithUser.length > 0) {
          const total = feedbacksWithUser.reduce(
            (sum, f) => sum + parseFloat(f.rating),
            0
          );
          setAverageRating(total / feedbacksWithUser.length);
        } else {
          setAverageRating(0);
        }

        // 5️⃣ Lấy sách liên quan
        const allBooks = await getAllBooks();
        const related = allBooks
          .filter(
            (b) =>
              b.bookId !== bookData.bookId &&
              b.publicationStatus === bookData.publicationStatus
          )
          .slice(0, 4);
        setRelatedBooks(related);
      } catch (err) {
        console.error("❌ Lỗi khi lấy dữ liệu sách:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookData();
  }, [bookId]);

  /* ---------------------------
   🧾 Format ngày
  --------------------------- */
  const formatDate = (dateString?: string | null) =>
    dateString
      ? new Date(dateString).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "Không rõ";

  /* ---------------------------
   🛒 Thêm vào giỏ hàng
  --------------------------- */
  const handleAddToCart = async () => {
    if (!book) return;
    await addToCart(book, 1);
    toast({
      title: "Đã thêm vào giỏ hàng",
      duration: 1500,
      description: `“${book.bookName}” đã được thêm vào giỏ.`,
      action: (
        <ToastAction altText="Xem giỏ hàng" onClick={() => navigate("/cart")}>
          Xem giỏ
        </ToastAction>
      ),
    });
  };


  /* ---------------------------
   🖼 Giao diện chính
  --------------------------- */
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Đang tải dữ liệu sách...
      </div>
    );

  if (!book)
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Không tìm thấy sách.
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left side - Book Cover */}
          <div className="w-full md:w-[35%] lg:w-[30%]">
            <div className="aspect-[3/4] overflow-hidden rounded-xl shadow-xl">
              <img
                src={book.coverUrl}
                alt={book.bookName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right side - Book Info */}
          <div className="w-full md:w-[60%] lg:w-[55%] xl:w-[50%]">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-white">{book.bookName}</h1>
            </div>

            <div className="space-y-3 text-white/80">
              <p className="text-lg">
                <span className="font-semibold">Mô tả:</span>{" "}
                {book.decription || "Không có mô tả"}
              </p>

              {genres.length > 0 && (
                <p className="flex items-start gap-2">
                  <span className="font-semibold text-white">Thể loại:</span>
                  <span className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
                      <span
                        key={genre.genreId}
                        onClick={() => navigate(`/genre/${genre.genreId}`)}
                        className="cursor-pointer bg-white/10 hover:bg-white/20 
                     text-white text-sm px-3 py-1 rounded-full 
                     transition-all border border-white/20"
                      >
                        {genre.genreName}
                      </span>
                    ))}
                  </span>
                </p>
              )}


              <p>
                <span className="font-semibold">Ngày xuất bản:</span>{" "}
                {formatDate(book.publishedDate)}
              </p>
              <p>
                <span className="font-semibold">Cập nhật:</span>{" "}
                {formatDate(book.updatedAt)}
              </p>

              <div className="pt-3">
                <h3 className="text-xl font-bold text-white mb-4">
                  Giá: {formatVND(book.price)}
                </h3>

                <div className="flex gap-4">
                  {isAuthenticated && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white hover:text-white rounded-full cursor-pointer"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Thêm vào giỏ
                  </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 border-t border-white/20 pt-8">
          <h2 className="text-2xl font-bold text-white mb-2">Đánh giá</h2>

          {/* ⭐ Filter & Summary */}
          {feedbacks.length > 0 ? (
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              <span className="text-white text-lg font-semibold">
                {averageRating.toFixed(1)} / 5
              </span>
              <span className="text-white/60 text-sm">
                ({feedbacks.length} lượt đánh giá)
              </span>
            </div>
          ) : (
            <p className="text-white/60 mb-6">
              Chưa có đánh giá nào cho cuốn sách này.
            </p>
          )}

          {/* Danh sách feedback */}
          {feedbacks.length > 0 && (
            <div className="space-y-6">
              {feedbacks.map((fb) => (
                <div key={fb.feedbackId} className="bg-white/5 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-white font-semibold">
                        {fb.userName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <StarRating rating={parseInt(fb.rating)} />
                        <span className="text-white/60 text-sm">
                          {new Date(fb.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-white/80 mt-2">{fb.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Books */}
        <div className="mt-16 border-t border-white/20 pt-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wide">
            Có thể bạn cũng thích
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedBooks.map((related) => (
              <BookCard key={related.bookId} book={related} />
            ))}
          </div>
        </div>
      </main>

      {/* Dialog đọc thử */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-[#1a1a2e] text-white border-white/20 rounded-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Đọc thử: {book.bookName}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-white/80 text-base leading-relaxed">
              Đây là phần tóm tắt ngắn gọn của cuốn sách. Nội dung xoay quanh
              hành trình của nhân vật chính khám phá thế giới và những bài học
              sâu sắc về cuộc sống, tình bạn và lòng dũng cảm.
            </p>
            <div className="bg-white/5 p-4 rounded-lg">
              <audio
                controls
                className="w-full"
                src="https://www2.cs.uic.edu/~i101/SoundFiles/PinkPanther30.wav"
              >
                Trình duyệt của bạn không hỗ trợ phát audio.
              </audio>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerFooter />
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { getAllBooks, updateBookStatusFull, type Book } from "@/services/BookService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ModeratorBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  /* 🧠 Lấy danh sách sách có publicationStatus = 3 (PENDING) */
  useEffect(() => {
    const fetchPendingBooks = async () => {
      try {
        const data = await getAllBooks();
        const pending = data.filter((b) => b.publicationStatus === 3);
        setBooks(pending);
      } catch (err) {
        console.error("❌ Lỗi khi tải sách:", err);
        toast.error("Không thể tải danh sách sách chờ duyệt");
      } finally {
        setLoading(false);
      }
    };
    fetchPendingBooks();
  }, []);

  const handleReasonChange = (bookId: string, value: string) => {
    setReasons((prev) => ({ ...prev, [bookId]: value }));
  };

  /* ✅ Hàm xử lý duyệt / từ chối (FE clone JSON đầy đủ, chỉ đổi status) */
  const handleModerate = async (
  book: Book,
  newStatus: number,
  options?: {
    reasons?: Record<string, string>;
    setBooks?: React.Dispatch<React.SetStateAction<Book[]>>;
  }
) => {
  const { reasons = {}, setBooks } = options ?? {};
  const message = reasons[book.bookId] ?? "";
  const action = newStatus === 1 ? "Duyệt" : "Từ chối";

  if (
    !window.confirm(
      `Bạn có chắc chắn muốn ${action.toLowerCase()} sách "${book.bookName}" không?`
    )
  ) {
    return;
  }

  try {
    // Log gọn: không còn body, chỉ gửi query param
    console.groupCollapsed(
      `📤 Gọi PATCH khi ${action.toLowerCase()} "${book.bookName}"`
    );
    console.table({
      endpoint: `/api/rookie/users/books/${book.bookId}/publication-status`,
      publicationStatus: newStatus,
      note: "Gửi dạng query param; không có request body",
      uiMessage: message || "(không gửi lên BE)",
    });
    console.groupEnd();

    await updateBookStatusFull(book, newStatus, message);

    toast.success(
      newStatus === 1
        ? `✅ Đã duyệt "${book.bookName}" thành công!`
        : `🚫 Đã từ chối "${book.bookName}".`
    );

    if (setBooks) {
      setBooks((prev) => prev.filter((b) => b.bookId !== book.bookId));
    }
  } catch (error: any) {
    console.error("❌ Lỗi khi cập nhật:", error);
    if (error?.response) {
      console.error("📥 BE trả về:", error.response.data);
    }
    toast.error(
      error?.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại."
    );
  }
  };



  if (loading) {
    return <p className="text-center text-white mt-12">Đang tải danh sách...</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#16213E] via-[#1A1A2E] to-[#0F3460] text-white p-10 relative">
      {/* 🔹 Đăng xuất */}
      <div className="absolute top-6 right-6">
        <Button
          variant="destructive"
          className="bg-red-500 hover:bg-red-600 text-white font-semibold"
          onClick={() => {
            if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }
          }}
        >
          🚪 Đăng xuất
        </Button>
      </div>

      <h1 className="text-3xl font-bold text-center mb-10">
        🛠️ Kiểm duyệt sách chờ phê duyệt
      </h1>

      {books.length === 0 ? (
        <p className="text-center text-white/70">🎉 Không có sách nào đang chờ duyệt.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {books.map((book) => (
            <Card key={book.bookId} className="bg-white/10 border border-white/10">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">
                  {book.bookName}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="aspect-[3/4] overflow-hidden rounded-xl mb-3">
                  <img
                    src={book.coverUrl}
                    alt={book.bookName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <p className="text-sm text-white/70 mb-3 line-clamp-3">
                  {book.decription || "Không có mô tả"}
                </p>

                <Textarea
                  placeholder="Nhập lý do hoặc ghi chú (nếu cần)"
                  className="mb-4 text-black"
                  value={reasons[book.bookId] || ""}
                  onChange={(e) =>
                    handleReasonChange(book.bookId, e.target.value)
                  }
                />

                <div className="flex justify-between">
                  <Button
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => handleModerate(book, 1)}
                  >
                    ✅ Duyệt
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => handleModerate(book, 0)}
                  >
                    ❌ Từ chối
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

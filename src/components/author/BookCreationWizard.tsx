import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateBook } from "@/services/BookManageService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function BookCreationWizard() {
  const [step, setStep] = useState(1);

  const [book, setBook] = useState({
    bookName: "",
    coverUrl: "",
    decription: "",
    authorId: "",
  });
  const [chapters, setChapters] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);

  const createBook = useCreateBook();
  const { user } = useAuth();

  useEffect(() => {
    // cố gắng lấy id từ context user, hoặc từ localStorage fallback
    const candidateId =
      (user && ((user.userId as string) || (user.userId as string) || (user.userId as string))) ||
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      "";

    if (candidateId) {
      setBook((prev) => ({ ...prev, authorId: candidateId }));
    } else {
      // không có author id — hiển thị cảnh báo (nếu cần) nhưng không chặn UI
      console.warn("Không tìm thấy authorId từ AuthContext hoặc localStorage.");
    }
  }, [user]);

  const next = () => setStep(step + 1);
  const back = () => setStep(step - 1);

  const handleCreateBook = async () => {
    // kiểm tra required fields (authorId đã tự gán)
    if (!book.bookName?.trim() || !book.decription?.trim()) {
      toast.error("Vui lòng nhập tên sách và mô tả.");
      return;
    }

    if (!book.authorId) {
      toast.error("Không tìm thấy thông tin tác giả. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      const res = await createBook.mutateAsync(book);
      toast.success("Tạo sách thành công!");
      if (res) next();
    } catch (err) {
      console.error("Tạo sách thất bại:", err);
      toast.error("Tạo sách thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {step === 1 && "Tạo bìa sách"}
          {step === 2 && "Thêm chương"}
          {step === 3 && "Thêm trang"}
          {step === 4 && "Hoàn tất"}
        </h2>
      </div>

      {/* STEP 1: Create Book / Cover */}
      {step === 1 && (
        <div className="space-y-3">
          <Input
            placeholder="Tên sách"
            value={book.bookName}
            onChange={(e) => setBook({ ...book, bookName: e.target.value })}
            className="bg-transparent border-white/20 text-white"
          />

          <Input
            placeholder="Link ảnh bìa (coverUrl)"
            value={book.coverUrl}
            onChange={(e) => setBook({ ...book, coverUrl: e.target.value })}
            className="bg-transparent border-white/20 text-white"
          />

          {book.coverUrl && (
            <div className="flex justify-center">
              <img
                src={book.coverUrl}
                alt="Book Cover"
                className="w-40 h-56 object-cover rounded-lg border border-gray-600"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='224'%3E%3Crect width='100%25' height='100%25' fill='%23667eea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='white'%3EInvalid URL%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          )}

          <Input
            placeholder="Mô tả"
            value={book.decription}
            onChange={(e) => setBook({ ...book, decription: e.target.value })}
            className="bg-transparent border-white/20 text-white"
          />

          {/* Hiển thị authorId readonly (informational) */}
          <div className="text-sm text-gray-300">
            <div>Tác giả: {user?.fullName || user?.email || "Unknown"}</div>
            <div className="text-xs text-gray-500">ID: {book.authorId || "chưa có"}</div>
          </div>

          <Button
            onClick={handleCreateBook}
            className="bg-purple-600 hover:bg-purple-700 w-full"
          >
            Lưu & Tiếp tục
          </Button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <p className="text-gray-400 mb-3">Thêm chương cho sách</p>
          <Button
            onClick={() =>
              setChapters([...chapters, { chapterName: `Chapter ${chapters.length + 1}` }])
            }
            className="bg-purple-600 hover:bg-purple-700 mb-3"
          >
            + Thêm chương
          </Button>
          <ul className="space-y-2">
            {chapters.map((ch, i) => (
              <li key={i} className="bg-white/10 p-2 rounded">
                {ch.chapterName}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between">
            <Button onClick={back} variant="outline">Quay lại</Button>
            <Button onClick={next} className="bg-purple-600">Tiếp tục</Button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <p className="text-gray-400 mb-3">Tạo trang truyện</p>
          <Button
            onClick={() =>
              setPages([...pages, { pageNumber: pages.length + 1, content: "Trang mới" }])
            }
            className="bg-purple-600 hover:bg-purple-700 mb-3"
          >
            + Thêm trang
          </Button>
          <ul className="space-y-2">
            {pages.map((pg, i) => (
              <li key={i} className="bg-white/10 p-2 rounded">
                Trang {pg.pageNumber}: {pg.content}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between">
            <Button onClick={back} variant="outline">Quay lại</Button>
            <Button onClick={next} className="bg-purple-600">Hoàn tất</Button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="text-center space-y-4">
          <p>🎉 Đã hoàn tất tạo sách!</p>
          <Button className="bg-purple-600 hover:bg-purple-700 w-full">
            Về danh sách sách
          </Button>
        </div>
      )}
    </div>
  );
}

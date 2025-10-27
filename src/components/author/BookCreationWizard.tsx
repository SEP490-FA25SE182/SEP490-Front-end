import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateBook } from "@/services/BookManageService";
import { useAuth } from "@/context/AuthContext";
import { useGetAllRoles } from "@/services/RoleService";
import { getUserByEmail } from "@/services/UserService";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function BookCreationWizard() {
  const [book, setBook] = useState({
    bookName: "",
    coverUrl: "",
    decription: "",
    authorId: "",
  });

  const createBook = useCreateBook();
  const { user } = useAuth();
  const { data: allRoles } = useGetAllRoles();

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAuthorId = async () => {
      try {
        if (user?.userId) {
          setBook((prev) => ({ ...prev, authorId: user.userId || "" }));
          return;
        }

        // Fallback: try fetch user by email from backend
        if (!user?.email) {
          console.warn("No user email available in AuthContext");
          return;
        }

        const currentUser = await getUserByEmail(user.email);

        if (!currentUser) {
          toast({
            title: "Không tìm thấy tác giả",
            description:
              "Không tìm thấy thông tin tác giả trong hệ thống. Vui lòng đăng nhập lại.",
          });
          console.warn("Không tìm thấy user khớp với email:", user?.email);
          return;
        }

        setBook((prev) => ({ ...prev, authorId: currentUser.userId }));
      } catch (error) {
        console.error("❌ Lỗi khi fetch thông tin authorId:", error);
        toast({
          title: "Lỗi",
          description:
            "Không thể lấy thông tin tác giả. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      }
    };

    fetchAuthorId();
  }, [user, allRoles, toast]);

  const handleCreateBook = async () => {
    if (!book.bookName?.trim() || !book.decription?.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập tên sách và mô tả.",
      });
      return;
    }

    if (!book.authorId) {
      toast({
        title: "Không tìm thấy tác giả",
        description: "Không tìm thấy thông tin tác giả. Vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await createBook.mutateAsync(book);
      toast({
        title: "Tạo sách thành công",
        description: `“${book.bookName}” đã được tạo.`
      });
      if (res) {
        navigate("/author/authorbooklist");
      }
    } catch (err) {
      console.error("Tạo sách thất bại:", err);
      toast({
        title: "Tạo sách thất bại",
        description: "Đã xảy ra lỗi khi tạo sách. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Tạo bìa sách</h2>
      </div>

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
        <Button
          onClick={handleCreateBook}
          className="bg-purple-600 hover:bg-purple-700 w-full"
        >
          Lưu
        </Button>
      </div>
    </div>
  );
}

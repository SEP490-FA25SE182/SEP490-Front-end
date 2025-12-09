import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateBook } from "@/services/BookManageService";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail } from "@/services/UserService";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUserId } from "@/utils/authStorage";
import { UploadService } from "@/services/FirebaseService";

type WizardProps = { onCreated?: (bookId: string) => void };

export default function BookCreationWizard(props: WizardProps) {
  // --- limits
  const MAX_TITLE = 50;
  const MAX_COVER = 100;
  const MAX_DESC = 250;

  const [book, setBook] = useState({
    bookName: "",
    coverUrl: "",
    decription: "",
    authorId: "", // sẽ được set tự động
  });


  const [selectedCoverPreview, setSelectedCoverPreview] = useState<string | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const createBook = useCreateBook();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ✅ Lấy authorId từ currentUserId (localStorage) -> user.userId -> getUserByEmail
  useEffect(() => {
    const fetchAuthorId = async () => {
      try {
        // 1) Ưu tiên lấy từ localStorage (authStorage)
        const uidFromStorage = getCurrentUserId();
        if (uidFromStorage) {
          setBook((prev) => ({ ...prev, authorId: uidFromStorage }));
          return;
        }

        // 2) từ AuthContext
        if (user?.userId) {
          const uid: string = user.userId; // 👈 thu hẹp kiểu tại đây
          setBook((prev) => ({ ...prev, authorId: uid }));
          return;
        }

        // 3) fallback theo email
        if (user?.email) {
          const currentUser = await getUserByEmail(user.email);
          if (currentUser?.userId) {
            const uid: string = currentUser.userId; // 👈 cũng thu hẹp
            setBook((prev) => ({ ...prev, authorId: uid }));
            return;
          }
        }

        // Không tìm được authorId
        toast({
          title: "Không tìm thấy tác giả",
          description:
            "Không xác định được tài khoản hiện tại. Vui lòng đăng nhập lại.",
          variant: "destructive",
        });
      } catch (error) {
        console.error("❌ Lỗi khi xác định authorId:", error);
        toast({
          title: "Lỗi",
          description: "Không thể lấy thông tin tác giả. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      }
    };

    fetchAuthorId();
    // chỉ phụ thuộc vào user (không còn roles)
  }, [user, toast]);

  const getDisplayImageUrl = (url: string | undefined | null) => {
    if (!url) return "";
    if (url.startsWith("gs://")) {
      const parts = url.split("/");
      const bucket = parts[2];
      const path = parts.slice(3).join("/");
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
    }
    return url;
  };

  const validateLengths = () => {
    const errors: string[] = [];
    if ((book.bookName ?? "").length > MAX_TITLE) {
      errors.push(`Tên sách (max ${MAX_TITLE} ký tự)`);
    }
    if ((book.coverUrl ?? "").length > MAX_COVER) {
      errors.push(`Link ảnh bìa (max ${MAX_COVER} ký tự)`);
    }
    if ((book.decription ?? "").length > MAX_DESC) {
      errors.push(`Mô tả (max ${MAX_DESC} ký tự)`);
    }
    return errors;
  };

  const handleCreateBook = async () => {
    if (!book.bookName?.trim() || !book.decription?.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập tên sách và mô tả.",
      });
      return;
    }

    const lengthErrors = validateLengths();
    if (lengthErrors.length > 0) {
      toast({
        title: "Vượt giới hạn ký tự",
        description: `Các trường sau vượt giới hạn: ${lengthErrors.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    // If user selected a cover file, upload it first to Firebase (folder: book)
    let payload: any = { ...book };
    if (selectedCoverFile) {
      setIsUploadingCover(true);
      try {
        toast({ title: "Đang upload ảnh bìa..." });
        const gsUrl = await UploadService.uploadImageToFirebase(selectedCoverFile, "book");
        payload = { ...payload, coverUrl: gsUrl };
        toast({ title: "Upload ảnh bìa thành công" });
      } catch (err) {
        console.error("Upload cover failed:", err);
        toast({ title: "Upload thất bại", description: "Không thể upload ảnh bìa.", variant: "destructive" });
        setIsUploadingCover(false);
        return;
      } finally {
        setIsUploadingCover(false);
      }
    }

    try {
      const res = await createBook.mutateAsync(payload);
      toast({
        title: "Tạo sách thành công",
        description: `“${book.bookName}” đã được tạo.`,
      });
      if (res?.bookId) {
        // clear selection
        setSelectedCoverFile(null);
        setSelectedCoverPreview(null);
        const createdId = res.bookId;
        props.onCreated?.(createdId);
        navigate("/author/authorbooklist");
      } else {
        console.error("Tạo sách thất bại: thiếu bookId trong phản hồi", res);
        toast({
          title: "Tạo sách thất bại",
          description: "Không nhận được ID sách từ server. Vui lòng thử lại.",
          variant: "destructive",
        });
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

  const titleTooLong = (book.bookName ?? "").length > MAX_TITLE;
  const coverTooLong = (book.coverUrl ?? "").length > MAX_COVER;
  const descTooLong = (book.decription ?? "").length > MAX_DESC;

  const disableSave =
    !book.bookName?.trim() ||
    !book.decription?.trim() ||
    titleTooLong ||
    coverTooLong ||
    descTooLong ||
    isUploadingCover;


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
        <div className="flex justify-between text-xs mt-1">
          <div
            className={`text-gray-400 ${titleTooLong ? "text-red-400" : ""
              }`}
          >
            {" "}
            {(book.bookName ?? "").length} / {MAX_TITLE}
          </div>
          {titleTooLong && (
            <div className="text-red-400">
              Vượt tối đa {MAX_TITLE} ký tự
            </div>
          )}
        </div>

        {/* Cover uploader (upload to Firebase storage -> gs://) */}
        <div className="flex items-center gap-4">
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center"
            onClick={() => document.getElementById("coverFileInput")?.click()}
            disabled={isUploadingCover}
          >
            Chọn ảnh bìa
          </Button>

          <input
            type="file"
            id="coverFileInput"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f) {
                setSelectedCoverFile(f);
                setSelectedCoverPreview(URL.createObjectURL(f));
              }
            }}
          />
        </div>

        <div className="flex justify-between text-xs mt-1">
          <div className={`text-gray-400 ${coverTooLong ? "text-red-400" : ""}`}>
            {(book.coverUrl ?? "").length} / {MAX_COVER}
          </div>
          {coverTooLong && <div className="text-red-400">Vượt tối đa {MAX_COVER} ký tự</div>}
        </div>

        {selectedCoverPreview && (
          <div className="flex justify-center">
            <img
              src={selectedCoverPreview}
              alt="Selected cover"
              className="w-40 h-56 object-cover rounded-lg border border-gray-600"
            />
          </div>
        )}

        {book.coverUrl && !selectedCoverPreview && (
          <div className="flex justify-center">
            <img
              src={getDisplayImageUrl(book.coverUrl)}
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

        <textarea
          placeholder="Mô tả"
          value={book.decription}
          onChange={(e) => setBook({ ...book, decription: e.target.value })}
          rows={4}
          className="w-full bg-transparent border border-white/20 text-white rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="flex justify-between text-xs mt-1">
          <div
            className={`text-gray-400 ${descTooLong ? "text-red-400" : ""
              }`}
          >
            {" "}
            {(book.decription ?? "").length} / {MAX_DESC}
          </div>
          {descTooLong && (
            <div className="text-red-400">
              Vượt tối đa {MAX_DESC} ký tự
            </div>
          )}
        </div>

        <Button
          onClick={handleCreateBook}
          className="bg-purple-600 hover:bg-purple-700 w-full"
          disabled={disableSave}
        >
          Lưu
        </Button>
      </div>
    </div>
  );
}

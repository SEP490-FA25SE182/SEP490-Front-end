import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBookById, updateBook, deleteBook } from "@/services/BookService";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogDescription } from "@/components/ui/alert-dialog";

export default function AuthorEditBook() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<any>({
    bookName: "",
    coverUrl: "",
    decription: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    const load = async () => {
      try {
        const res = await getBookById(bookId);
        setBook({
          bookName: res.bookName ?? res.book_name ?? "",
          coverUrl: res.coverUrl ?? res.cover_url ?? "",
          decription: res.decription ?? res.description ?? "",
        });
      } catch (err) {
        console.error("Lỗi khi tải sách:", err);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin sách.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookId, toast]);

  const MAX_TITLE = 50;
  const MAX_COVER = 100;
  const MAX_DESC = 250;

  const titleTooLong = (book.bookName ?? "").length > MAX_TITLE;
  const coverTooLong = (book.coverUrl ?? "").length > MAX_COVER;
  const descTooLong = (book.decription ?? "").length > MAX_DESC;

  const disableSave =
    !book.bookName?.trim() ||
    !book.decription?.trim() ||
    titleTooLong ||
    coverTooLong ||
    descTooLong;

  const handleSave = async () => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      await updateBook(bookId, {
        bookName: book.bookName,
        coverUrl: book.coverUrl,
        decription: book.decription,
      });
      toast({
        title: "Cập nhật thành công",
        description: `Sách "${book.bookName}" đã được cập nhật.`,
      });
      navigate("/author/authorbooklist");
    } catch (err) {
      console.error("Cập nhật thất bại:", err);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật sách. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!bookId) return;
    setIsDeleting(true);
    try {
      await deleteBook(bookId);
      toast({
        title: "Xóa thành công",
        description: `Sách "${book.bookName}" đã được xóa.`,
      });
      navigate("/author/authorbooklist");
    } catch (err) {
      console.error("Xóa thất bại:", err);
      toast({
        title: "Lỗi",
        description: "Không thể xóa sách.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOpenDeleteAlert(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AuthorSidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-white">Chỉnh sửa sách</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={() => setOpenDeleteAlert(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Xóa
            </Button>
          </div>
        </header>

        <div className="flex flex-1">
          <div className="flex-1 bg-[#1a2332] p-6 overflow-y-auto">
            {loading ? (
              <div>Đang tải...</div>
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Chỉnh sửa bìa sách</h2>
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder="Tên sách"
                    value={book.bookName}
                    onChange={(e) => setBook({ ...book, bookName: e.target.value })}
                    className="bg-transparent border-white/20 text-white"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <div className={`text-gray-400 ${titleTooLong ? "text-red-400" : ""}`}>
                      {(book.bookName ?? "").length} / {MAX_TITLE}
                    </div>
                    {titleTooLong && <div className="text-red-400">Vượt tối đa {MAX_TITLE} ký tự</div>}
                  </div>

                  <Input
                    placeholder="Link ảnh bìa (coverUrl)"
                    value={book.coverUrl}
                    onChange={(e) => setBook({ ...book, coverUrl: e.target.value })}
                    className="bg-transparent border-white/20 text-white"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <div className={`text-gray-400 ${coverTooLong ? "text-red-400" : ""}`}>
                      {(book.coverUrl ?? "").length} / {MAX_COVER}
                    </div>
                    {coverTooLong && <div className="text-red-400">Vượt tối đa {MAX_COVER} ký tự</div>}
                  </div>

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
                  <div className="flex justify-between text-xs mt-1">
                    <div className={`text-gray-400 ${descTooLong ? "text-red-400" : ""}`}>
                      {(book.decription ?? "").length} / {MAX_DESC}
                    </div>
                    {descTooLong && <div className="text-red-400">Vượt tối đa {MAX_DESC} ký tự</div>}
                  </div>

                  <Button
                    onClick={handleSave}
                    className="bg-purple-600 hover:bg-purple-700 w-full"
                    disabled={disableSave || isSaving}
                  >
                    {isSaving ? "Đang lưu..." : "Lưu"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sách</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa sách "{book?.bookName}"? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setOpenDeleteAlert(false)}>Huỷ</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
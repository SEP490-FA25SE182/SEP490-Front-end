import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBookById, updateBook } from "@/services/BookService";
import { useToast } from "@/components/ui/use-toast";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { getAllChapters } from "@/services/BookManageService";
import { UploadService } from "@/services/FirebaseService";


export default function AuthorEditBook() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<any>({
    bookName: "",
    coverUrl: "",
    decription: "",
  });

  const [originalBook, setOriginalBook] = useState<any>(null);

  const [meta, setMeta] = useState({
    publicationStatus: 0,
    chapterCount: 0,
  });


  // New states for cover uploader
  const [selectedCoverPreview, setSelectedCoverPreview] = useState<string | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    const load = async () => {
      try {
        const res = await getBookById(bookId);
        const chapters = await getAllChapters({ bookId });


        setBook({
          bookName: res.bookName ?? res.book_name ?? "",
          coverUrl: res.coverUrl ?? res.cover_url ?? "",
          decription: res.decription ?? res.description ?? "",
        });
        let chapterCount = 0;

        // Trường hợp 1: API trả về mảng trực tiếp
        if (Array.isArray(chapters)) {
          chapterCount = chapters.length;
        }
        // Trường hợp 2: API dạng page: { content: [...] }
        else if (Array.isArray((chapters as any).content)) {
          chapterCount = (chapters as any).content.length;
        }
        // Trường hợp 3: API dạng { data: [...] }
        else if (Array.isArray((chapters as any).data)) {
          chapterCount = (chapters as any).data.length;
        }

        setMeta({
          publicationStatus: res.publicationStatus ?? 0,
          chapterCount,
        });
        setOriginalBook({
          bookName: res.bookName ?? "",
          coverUrl: res.coverUrl ?? "",
          decription: res.decription ?? "",
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
  const MAX_DESC = 250;

  const titleTooLong = (book.bookName ?? "").length > MAX_TITLE;
  const descTooLong = (book.decription ?? "").length > MAX_DESC;

  const disableSave =
    !book.bookName?.trim() ||
    !book.decription?.trim() ||
    titleTooLong ||
    descTooLong ||
    isUploadingCover;

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

  const handleSave = async () => {
    if (!bookId) return;
    setIsSaving(true);
    try {
      let payload: any = {};

      if (book.bookName?.trim()) payload.bookName = book.bookName;
      if (book.decription?.trim()) payload.decription = book.decription;

      // If user selected a new cover file, upload it first
      if (selectedCoverFile) {
        setIsUploadingCover(true);
        try {
          toast({ title: "Đang upload ảnh bìa..." });
          const gsUrl = await UploadService.uploadImageToFirebase(selectedCoverFile, "book");
          payload.coverUrl = gsUrl;
          toast({ title: "Upload ảnh bìa thành công" });
        } catch (err) {
          console.error("Upload cover failed:", err);
          toast({ title: "Upload thất bại", description: "Không thể upload ảnh bìa.", variant: "destructive" });
          setIsUploadingCover(false);
          setIsSaving(false);
          return;
        } finally {
          setIsUploadingCover(false);
        }
      } else if (book.coverUrl?.trim()) {
        payload.coverUrl = book.coverUrl;
      }

      if (isChanged) {
        payload.publicationStatus = "3";
      }

      console.log("Payload gửi đi:", payload);
      console.log("bookId =", bookId);


      await updateBook(bookId, payload);



      toast({
        title: isChanged ? "Đã gửi kiểm duyệt" : "Cập nhật thành công",
        description: isChanged
          ? "Sách đã được gửi lên hệ thống để chờ duyệt."
          : `Sách "${book.bookName}" đã được cập nhật.`,
      });

      navigate("/author/authorbooklist");
    } catch (err: any) {
      console.error("Cập nhật thất bại:", err);
      console.log("Response data:", err?.response?.data);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật sách. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };



  const isChanged =
    originalBook &&
    (
      book.bookName !== originalBook.bookName ||
      book.coverUrl !== originalBook.coverUrl ||
      book.decription !== originalBook.decription ||
      selectedCoverFile !== null
    );


  const publicationMap: Record<number, string> = {
    0: "BẢN THẢO",
    1: "ĐÃ XUẤT BẢN",
    2: "LƯU TRỮ",
    3: "CHỜ KIỂM DUYỆT",
  };


  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AuthorSidebar isOpen={sidebarOpen} />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`
          absolute z-50 top-4
          h-9 w-9 rounded-full
          bg-[#0b1220]/70 backdrop-blur
          border border-white/10
          text-white hover:bg-white/10
          transition-all
          ${sidebarOpen ? "left-64 -translate-x-1/2" : "left-2 translate-x-0"}
        `}
      >
        {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
      </Button>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">Chỉnh sửa sách</h1>
          </div>

          {/* header right removed - back button moved to footer */}
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

                  {/* Cover uploader (replaces cover URL input) */}
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

                  {/* Preview: selected file preview takes precedence, otherwise existing coverUrl */}
                  {(selectedCoverPreview || book.coverUrl) && (
                    <div className="flex justify-center">
                      <img
                        src={selectedCoverPreview ?? getDisplayImageUrl(book.coverUrl)}
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

                  <div className="mt-6 space-y-2 text-sm bg-white/5 p-4 rounded-lg border border-white/10">
                    <div>
                      <span className="text-gray-400">Trạng thái xuất bản:</span>{" "}
                      <span className="font-semibold text-purple-400">
                        {publicationMap[meta.publicationStatus]}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400">Số chương:</span>{" "}
                      <span className="font-semibold text-green-400">
                        {meta.chapterCount}
                      </span>
                    </div>
                  </div>


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

                  {/* Footer buttons */}
                  <div className="flex gap-4 mt-8">
                    <Button
                      variant="outline"
                      className="flex-1 text-gray-600 hover:bg-gray-100"
                      onClick={() => navigate("/author/authorbooklist")}
                    >
                      Quay về
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={disableSave || isSaving}
                    >
                      {isSaving
                        ? "Đang lưu..."
                        : isChanged
                          ? "Gửi kiểm duyệt"
                          : "Lưu"}
                    </Button>

                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
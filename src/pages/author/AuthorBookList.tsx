import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Plus, MoreVertical, Edit, Trash2, CircleCheck, Eye } from 'lucide-react';
import { getBooks, deleteBook as apiDeleteBook, updateBookStatusFull } from "@/services/BookService";
import AuthorSidebar from '@/components/author/AuthorSidebar';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import BookCreateDialog from "@/components/dialog/CreateBookDialog";

export default function AuthorBookList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus] = useState('all');
  const [selectedPublication, setSelectedPublication] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 12;

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [books, setBooks] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  // delete dialog state
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [deletingBook, setDeletingBook] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // send-for-review dialog state
  const [openSendAlert, setOpenSendAlert] = useState(false);
  const [sendReviewBook, setSendReviewBook] = useState<any | null>(null);
  const [isSendingReview, setIsSendingReview] = useState(false);

  // create book dialog state
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  // helper: sort by updatedAt desc (newest first)
  const sortBooksByUpdatedDesc = (list: any[]) => {
    return [...list].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.updated_at ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.updated_at ?? 0).getTime();
      return bTime - aTime;
    });
  };

  // fetch books (callable so we can refresh after create)
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await getBooks({
        authorId: user?.userId ?? undefined,
        page: 0,
        size: 200,
      });
      // sắp xếp theo updatedAt (mới nhất trước)
      setBooks(sortBooksByUpdatedDesc(res?.content ?? []));
    } catch (err) {
      console.error("Lỗi khi tải sách:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // helper: map publicationStatus -> label + class
  const getPublicationLabel = (publication: any) => {
    const p = String(publication ?? "").toUpperCase();

    const map: Record<string, { text: string; className: string }> = {
      "0": { text: "Nháp (đang làm)", className: "bg-gray-500/20 text-gray-300" },
      "1": { text: "Đã xuất bản", className: "bg-green-500/20 text-green-300" },
      "2": { text: "Đã được duyệt", className: "bg-blue-500/20 text-blue-300" },
      "3": { text: "Chờ duyệt", className: "bg-yellow-500/20 text-yellow-300" },
      "DRAFT": { text: "Nháp (đang làm)", className: "bg-gray-500/20 text-gray-300" },
      "PENDING": { text: "Chờ duyệt", className: "bg-yellow-500/20 text-yellow-300" },
      "PUBLISHED": { text: "Đã xuất bản", className: "bg-green-500/20 text-green-300" },
      "ARCHIVED": { text: "Đã được duyệt", className: "bg-blue-500/20 text-blue-300" },
      "ACTIVE": { text: "Hoạt động", className: "bg-green-500/20 text-green-300" },
      "INACTIVE": { text: "Không hoạt động", className: "bg-gray-500/20 text-gray-300" },
    };

    return map[p] ?? { text: publication ?? "-", className: "bg-gray-500/20 text-gray-300" };
  };

  // helper to match publication filter (supports numeric or token forms)
  const PUB_TOKEN: Record<string, string> = { "0": "DRAFT", "1": "PUBLISHED", "2": "ARCHIVED", "3": "PENDING" };

  // helper: chỉ lấy sách đang ACTIVE
  const isBookActive = (book: any) => {
    const rawStatus =
      book.status ??
      book.bookStatus ??
      book.isActived ??
      book.is_active ??
      book.isActive ??
      book.publicationStatus ??
      book.publication_status;

    // Nếu backend chưa có field trạng thái thì coi như ACTIVE để không ẩn nhầm
    if (rawStatus == null) return true;

    const val = String(rawStatus).toUpperCase().trim();

    // Các giá trị coi là active
    if (["ACTIVE", "1", "TRUE"].includes(val)) return true;

    // Các giá trị coi là inactive
    if (["INACTIVE", "0", "FALSE"].includes(val)) return false;

    // Giá trị lạ thì mặc định cho qua (tránh ẩn nhầm)
    return true;
  };


  const publicationMatches = (publication: any, selected: string) => {
    if (selected === "all") return true;
    const pubStr = String(publication ?? "").trim();
    if (!pubStr) return false;
    if (pubStr === selected) return true;
    if (pubStr.toUpperCase() === selected.toUpperCase()) return true;
    const mapped = PUB_TOKEN[pubStr];
    if (mapped && mapped.toUpperCase() === selected.toUpperCase()) return true;
    // also allow selected being numeric string and publication token present
    if (Object.values(PUB_TOKEN).includes(pubStr.toUpperCase()) && String(Object.keys(PUB_TOKEN).find(k => PUB_TOKEN[k] === pubStr.toUpperCase())) === selected) return true;
    return false;
  };

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      if (!isBookActive(book)) return false;
      const name = book.bookName ?? book.book_name ?? '';
      const progress = (book.progressStatus ?? book.progress_status) as any;
      const publication = (book.publicationStatus ?? book.publication_status) as any;

      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || String(progress) === selectedStatus;
      const matchesPublication = publicationMatches(publication, selectedPublication);

      return matchesSearch && matchesStatus && matchesPublication;
    });
  }, [books, searchQuery, selectedStatus, selectedPublication]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage) || 1;
  const startIndex = (currentPage - 1) * booksPerPage;
  const currentBooks = filteredBooks.slice(startIndex, startIndex + booksPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedPublication]);

  const confirmDeleteBook = (book: any) => {
    setDeletingBook(book);
    setOpenDeleteAlert(true);
  };

  const handleDelete = async () => {
    if (!deletingBook) return;
    setIsDeleting(true);
    try {
      await apiDeleteBook(deletingBook.bookId ?? deletingBook.book_id);
      // lọc rồi sắp xếp lại để giữ thứ tự updatedAt
      setBooks(prev =>
        sortBooksByUpdatedDesc(
          prev.filter(
            b =>
              String(b.bookId ?? b.book_id) !==
              String(deletingBook.bookId ?? deletingBook.book_id)
          )
        )
      );
      toast({
        title: "Xóa thành công",
        description: `Đã xóa sách "${deletingBook.bookName ?? deletingBook.book_name}".`,
      });
    } catch (err) {
      console.error("Xóa sách thất bại:", err);
      toast({
        title: "Xóa thất bại",
        description: "Không thể xóa sách. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOpenDeleteAlert(false);
      setDeletingBook(null);
    }
  };

  // -------- SEND FOR REVIEW --------
  const handleSendForReviewConfirmed = async () => {
    const book = sendReviewBook;
    if (!book) return;
    setIsSendingReview(true);

    try {
      // 3 = PENDING (chờ duyệt)
      await updateBookStatusFull({ ...book } as any, 3);

      setBooks(prev =>
        prev.map(b => {
          const idB = b.bookId ?? b.book_id;
          const id = book.bookId ?? book.book_id;
          if (String(idB) === String(id)) {
            return { ...b, publicationStatus: 3 };
          }
          return b;
        })
      );

      toast({
        title: "Đã gửi duyệt",
        description: `Sách "${book.bookName ?? book.book_name}" đã được gửi đi duyệt.`,
      });
    } catch (err) {
      console.error("Gửi duyệt thất bại:", err);
      toast({
        title: "Gửi duyệt thất bại",
        description: "Không thể gửi sách đi duyệt. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReview(false);
      setOpenSendAlert(false);
      setSendReviewBook(null);
    }
  };

  const confirmSendForReview = (book: any) => {
    const publication = book.publicationStatus ?? book.publication_status;
    if (String(publication) === "3" || publication === 3) {
      toast({
        title: "Đã gửi duyệt",
        description: "Quyển sách này đã được gửi đi duyệt trước đó.",
      });
      return;
    }
    setSendReviewBook(book);
    setOpenSendAlert(true);
  };
  // ---------------------------------

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
            </Button>
            <div className="ml-4 text-white">
              <div className="text-sm">Danh sách sách</div>
              <div className="text-xs text-gray-300">
                Quản lý các tác phẩm của bạn
              </div>
            </div>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm sách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>

            <Select value={selectedPublication} onValueChange={setSelectedPublication}>
              <SelectTrigger className="w-[180px] border-white/20 text-white bg-white/10">
                <SelectValue placeholder="Xuất bản" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="0">Nháp (đang làm)</SelectItem>
                <SelectItem value="1">Đã xuất bản</SelectItem>
                <SelectItem value="2">Đã được duyệt</SelectItem>
                <SelectItem value="3">Chờ duyệt</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setOpenCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tạo sách mới
            </Button>
          </div>
        </div>

        {/* Book Grid - File View */}
        <div className="flex-1 overflow-auto p-6 bg-[#0f172a]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {currentBooks.map((book) => {
              // existing variables for cover/name/id
              const cover = book.coverUrl ?? book.cover_url;
              const coverSrc = getDisplayImageUrl(cover);
              const name = book.bookName ?? book.book_name;
              const id = book.bookId ?? book.book_id;

              // publication info
              const publication = book.publicationStatus ?? book.publication_status;
              const pubInfo = getPublicationLabel(publication);

              // normalized flags
              const alreadySent = String(publication) === "3" || publication === 3;
              const isPublished = String(publication) === "1" || publication === 1;

              // locked if published or already sent for review (keeps existing behavior)
              const isLocked = isPublished || alreadySent;

              // Nháp thực sự
              const isDraft =
                String(publication) === "0" ||
                publication === 0 ||
                String(publication).toUpperCase() === "DRAFT";

              // ✅ Với status = 2 (ARCHIVED) thì click card vẫn vào chapter list giống nháp
              const openChaptersOnClick =
                isDraft ||
                String(publication) === "2" ||
                publication === 2 ||
                String(publication).toUpperCase() === "ARCHIVED";

              return (
                <div key={id} className="group relative">
                  {/* whole card clickable */}
                  <div
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer"
                    onClick={() => {
                      if (openChaptersOnClick) {
                        // status 0 (nháp) + 2 (đã được duyệt) -> vào chapter list
                        navigate(`/author/books/${id}/chapters`, { state: { book } });
                        return;
                      }
                      // các trạng thái khác -> preview
                      navigate(`/author/books/${id}/preview`, { state: { book } });
                    }}
                  >
                    {/* Dropdown Menu Button - top-right like chapter list */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          {/* stopPropagation so clicking menu does not trigger card navigation */}
                          <Button
                            onClick={(e) => e.stopPropagation()}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white rounded-full"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {/* ✅ Chỉ hiện "Sửa" nếu chưa xuất bản và chưa gửi duyệt */}
                          {!isLocked && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); navigate(`/author/authoreditbook/${id}`); }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Sửa
                            </DropdownMenuItem>
                          )}
                          {/* ✅ Với status = 2 (ARCHIVED) thì trong dropdown có nút Xem trước (preview) */}
                          {(String(publication) === "2" || publication === 2 || String(publication).toUpperCase() === "ARCHIVED") ? (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); navigate(`/author/books/${id}/preview`, { state: { book } }); }}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Xem trước
                            </DropdownMenuItem>
                          ) : (
                            !isLocked && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); confirmSendForReview(book); }}
                              >
                                <CircleCheck className="mr-2 h-4 w-4" /> Đưa đi duyệt
                              </DropdownMenuItem>
                            )
                          )}
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); confirmDeleteBook(book); }}
                            className={`${isLocked ? "opacity-50 pointer-events-none text-gray-400" : "text-red-600 focus:text-red-600"}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Book Cover */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative w-24 h-32 rounded overflow-hidden bg-white/5 shadow-lg">
                        <img
                          src={coverSrc}
                          alt={name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="128"%3E%3Crect width="96" height="128" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="white"%3ENo Cover%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>

                      {/* Book Name */}
                      <div className="text-xs text-white font-medium text-center line-clamp-2 w-full min-h-8">
                        {name}
                      </div>

                      {/* Status Badge */}
                      <div className={`text-[10px] px-2 py-0.5 rounded-full ${pubInfo.className}`}>
                        {pubInfo.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {currentBooks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Không tìm thấy sách nào</p>
            </div>
          )}

          {/* Pagination */}
          {filteredBooks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-0">
                <div className="hidden sm:block sm:w-1/3" />
                <div className="w-full sm:flex-1 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={handlePrev}
                          className={`text-white hover:bg-white/10 ${currentPage === 1 ? "opacity-50 pointer-events-none" : ""}`}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={handleNext}
                          className={`text-white hover:bg-white/10 ${currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
                <div className="w-full sm:w-1/3 text-sm text-gray-400 text-center sm:text-right whitespace-nowrap">
                  Trang {currentPage} / {totalPages} ({filteredBooks.length} sách)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sách</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa sách "{deletingBook?.bookName ?? deletingBook?.book_name}"? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setOpenDeleteAlert(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send-for-review confirmation dialog */}
      <AlertDialog open={openSendAlert} onOpenChange={setOpenSendAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gửi sách đi duyệt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn gửi sách "
              {sendReviewBook?.bookName ?? sendReviewBook?.book_name}
              " đi duyệt? Sau khi gửi, bạn sẽ không thể sửa hoặc xóa sách.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setOpenSendAlert(false)}>
              Huỷ
            </Button>
            <Button
              onClick={handleSendForReviewConfirmed}
              disabled={isSendingReview}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSendingReview ? "Đang gửi..." : "Gửi duyệt"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Book Dialog */}
      <BookCreateDialog
        isOpen={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onCreated={() => {
          // refresh list after a book is created
          fetchBooks();
        }}
      />
    </div>
  );
}

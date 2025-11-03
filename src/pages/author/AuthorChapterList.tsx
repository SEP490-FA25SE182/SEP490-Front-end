import { useState, useMemo } from "react";
import { Menu, X, Plus, Eye, Edit, Trash2, MoreVertical, BookOpen } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetAllChapters,
  useGetBookById,
  useDeleteChapter,
  type Chapter,
} from "@/services/BookManageService";
import { ChapterCreateDialog } from "@/components/dialog/ChapterCreateDialog";
import { ChapterEditDialog } from "@/components/dialog/ChapterEditDialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export default function AuthorChapterList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { bookId: paramBookId } = useParams<{ bookId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // fetch book detail and chapters
  const { data: book, isLoading: loadingBook } = useGetBookById(paramBookId);
  const bookId = book?.bookId ?? paramBookId;
  const { data: chaptersResp, isLoading: loadingChapters } = useGetAllChapters(
    bookId ? { bookId } : undefined
  );

  // dialogs
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);
  const deleteChapter = useDeleteChapter();

  const handleCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ["chapters", { bookId }] });
  };

  const handleEditSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ["chapters", { bookId }] });
    setOpenEditDialog(false);
    setEditingChapter(null);
  };

  const handleConfirmDelete = (chapter: Chapter) => {
    setDeletingChapter(chapter);
    setOpenDeleteAlert(true);
  };

  const handleDelete = async () => {
    if (!deletingChapter) return;
    try {
      await deleteChapter.mutateAsync(deletingChapter.chapterId as string);
      toast({
        title: "Xóa thành công",
        description: `Đã xóa chương "${deletingChapter.chapterName}".`,
      });
      await queryClient.invalidateQueries({ queryKey: ["chapters", { bookId }] });
    } catch (err) {
      toast({
        title: "Xóa thất bại",
        description: "Không thể xóa chương. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setOpenDeleteAlert(false);
      setDeletingChapter(null);
    }
  };

  // lọc chapter ACTIVE
  const chapters: any[] = useMemo(() => {
    if (!chaptersResp) return [];
    const list = Array.isArray(chaptersResp)
      ? chaptersResp
      : Array.isArray((chaptersResp as any).content)
        ? (chaptersResp as any).content
        : [];
    return list
      .filter((ch: { isActived: string }) => ch.isActived !== "INACTIVE")
      .sort((a: any, b: any) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  }, [chaptersResp]);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(chapters.length / perPage));
  const currentChapters = chapters.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />
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
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <div className="ml-4 text-white">
              <div className="text-sm">Danh sách chương</div>
              <div className="text-xs text-gray-300">
                Sách: {loadingBook ? "Đang tải..." : book?.bookName ?? "Chưa chọn"}
              </div>
            </div>
          </div>
        </header>

        {/* Book detail section */}
        <div className="bg-[#1a2332] px-6 py-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex gap-6 items-start">
              {book?.coverUrl && (
                <img
                  src={book.coverUrl}
                  alt={book.bookName}
                  className="w-28 h-36 rounded-md object-cover border shadow-lg"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='224'%3E%3Crect width='100%25' height='100%25' fill='%23667eea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='white'%3EInvalid URL%3C/text%3E%3C/svg%3E";
                  }}
                />
              )}
              <div className="flex flex-col gap-2 text-white">
                <h2 className="text-xl font-semibold">{book?.bookName ?? "Chưa có tiêu đề"}</h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {book?.decription || "Không có mô tả"}
                </p>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-200">Trạng thái xuất bản:</span>{" "}
                    <span className="text-gray-300">
                      {book?.publicationStatus || "Chưa xác định"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Create button */}
            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-200 text-gray-800"
                onClick={() => navigate(-1)}
              >
                Quay về sách
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setOpenCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo chương mới
              </Button>
            </div>
          </div>
        </div>

        {/* Chapter Grid - File View */}
        <div className="flex-1 overflow-auto p-6 bg-[#0f172a]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {currentChapters.map((chapter: any) => {
              const id = chapter.chapterId ?? chapter.chapter_id;
              const normalized: Chapter = {
                chapterId: id,
                chapterName: chapter.chapterName ?? chapter.chapter_name,
                chapterNumber: chapter.chapterNumber ?? chapter.chapter_number,
                decription: chapter.decription ?? chapter.description,
                bookId: chapter.bookId ?? chapter.book_id,
                isActived: chapter.isActived,
              };

              return (
                <div key={id} className="group relative">
                  <div className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
                    {/* Chapter Icon */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative w-16 h-20 flex items-center justify-center rounded bg-white/5">
                        <BookOpen className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
                      </div>
                      
                      {/* Chapter Name */}
                      <div className="text-xs text-white font-medium text-center line-clamp-2 w-full min-h-[32px]">
                        {normalized.chapterName}
                      </div>
                      
                      {/* Chapter Number Badge */}
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        Chương {normalized.chapterNumber ?? "-"}
                      </div>
                    </div>

                    {/* Dropdown Menu Button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white rounded-full"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => navigate(`/author/chapters/${id}/pages`)}>
                            <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingChapter(normalized);
                              setOpenEditDialog(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleConfirmDelete(normalized)} 
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading / Empty */}
          {(loadingBook || loadingChapters) && (
            <div className="text-center py-12 text-gray-400">Đang tải dữ liệu...</div>
          )}
          {!loadingChapters && currentChapters.length === 0 && (
            <div className="text-center py-12 text-gray-400">Chưa có chương nào</div>
          )}

          {/* Pagination */}
          {chapters.length > 0 && (
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
                  Trang {currentPage} / {totalPages} ({chapters.length} chương)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ChapterCreateDialog
        isOpen={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        bookId={bookId}
        onCreated={handleCreated}
      />
      <ChapterEditDialog
        isOpen={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setEditingChapter(null);
        }}
        chapter={editingChapter}
        onUpdated={handleEditSaved}
      />
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa chương</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa chương "{deletingChapter?.chapterName}"? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setOpenDeleteAlert(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteChapter.isPending}
            >
              {deleteChapter.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
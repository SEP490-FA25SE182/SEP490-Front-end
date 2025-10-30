import { useState, useMemo } from "react";
import { Menu, X, Plus, Eye, Edit, Trash2 } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  // lọc chapter ACTIVE
  const chapters: any[] = useMemo(() => {
    if (!chaptersResp) return [];
    const list = Array.isArray(chaptersResp)
      ? chaptersResp
      : Array.isArray((chaptersResp as any).content)
        ? (chaptersResp as any).content
        : [];
    return list.filter((ch: { isActived: string }) => ch.isActived !== "INACTIVE");
  }, [chaptersResp]);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(chapters.length / perPage));
  const currentChapters = chapters.slice((currentPage - 1) * perPage, currentPage * perPage);

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

        {/* Book detail section (moved create button ra ngoài list) */}
        <div className="bg-[#1a2332] px-6 py-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex gap-6 items-start">
              {book?.coverUrl && (
                <img
                  src={book.coverUrl}
                  alt={book.bookName}
                  className="w-28 h-36 rounded-md object-cover border"
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

            {/* Create button moved outside the list (top-right of book detail) */}
            <div className="ml-6 self-start">
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setOpenCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo chapter mới
              </Button>
            </div>
          </div>
        </div>

        {/* Chapter list section */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                  <TableHead className="text-white font-medium">Tên chương</TableHead>
                  <TableHead className="text-white font-medium">Số chương</TableHead>
                  <TableHead className="text-white font-medium">Mô tả</TableHead>
                  <TableHead className="text-white font-medium">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableRow key={id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        {normalized.chapterName}
                      </TableCell>
                      <TableCell>{normalized.chapterNumber ?? "-"}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {normalized.decription ?? "-"}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center space-x-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-600"
                                  onClick={() => navigate(`/author/chapters/${id}/pages`)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Xem chi tiết</span>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-600"
                                  onClick={() => {
                                    setEditingChapter(normalized);
                                    setOpenEditDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Chỉnh sửa</span>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleConfirmDelete(normalized)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Xóa</span>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Loading / Empty */}
            {(loadingBook || loadingChapters) && (
              <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
            )}
            {!loadingChapters && currentChapters.length === 0 && (
              <div className="text-center py-8 text-gray-500">Không tìm thấy chapter nào</div>
            )}

            {/* Pagination */}
            {chapters.length > 0 && (
              <div className="border-t px-6 py-4 bg-white">
                <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-0">
                  <div className="hidden sm:block sm:w-1/3" /> {/* spacer left on desktop */}
                  <div className="w-full sm:flex-1 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={handlePrev}
                            className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handleNext}
                            className={currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                  <div className="w-full sm:w-1/3 text-sm text-gray-600 text-center sm:text-right whitespace-nowrap">
                    Trang {currentPage} / {totalPages}
                  </div>
                </div>
              </div>
            )}
          </div>
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
            <Button className="ml-2" onClick={handleDelete}>
              Xóa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

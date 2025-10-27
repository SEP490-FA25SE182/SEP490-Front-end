import { useState, useMemo } from "react";
import { Menu, X, Plus, MoreVertical } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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

export default function AuthorChapterList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { bookId: paramBookId } = useParams<{ bookId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // fetch book detail and chapters (react-query hooks)
  const { data: book, isLoading: loadingBook } = useGetBookById(paramBookId);
  const bookId = book?.bookId ?? paramBookId;
  const { data: chaptersResp, isLoading: loadingChapters } = useGetAllChapters(
    bookId ? { bookId } : undefined
  );

  // dialog state
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // delete alert dialog state
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null);

  const deleteChapter = useDeleteChapter();

  const handleCreated = async () => {
    // Sửa lại cách invalidate query
    await queryClient.invalidateQueries({
      queryKey: ['chapters', { bookId }]
    });
  };

  const handleOpenEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setOpenEditDialog(true);
  };

  const handleEditSaved = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['chapters', { bookId }]
    });
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
      toast({ title: "Xóa thành công", description: `Đã xóa chương "${deletingChapter.chapterName}".` });
      await queryClient.invalidateQueries({
        queryKey: ['chapters', { bookId }]
      });
    } catch (err) {
      console.error("Xóa chapter lỗi:", err);
      toast({ title: "Xóa thất bại", description: "Không thể xóa chương. Vui lòng thử lại.", variant: "destructive" });
    } finally {
      setOpenDeleteAlert(false);
      setDeletingChapter(null);
    }
  };

  // normalize chapters (backend may return array or { content: [...] })
  const chapters: any[] = useMemo(() => {
    if (!chaptersResp) return [];
    if (Array.isArray(chaptersResp)) return chaptersResp;
    if (Array.isArray((chaptersResp as any).content)) return (chaptersResp as any).content;
    return [];
  }, [chaptersResp]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const chaptersPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(chapters.length / chaptersPerPage));
  const startIndex = (currentPage - 1) * chaptersPerPage;
  const currentChapters = chapters.slice(startIndex, startIndex + chaptersPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
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
              <div className="text-xs text-gray-300">Sách: {loadingBook ? "Đang tải..." : book?.bookName ?? "Chưa chọn"}</div>
            </div>

            {/* add the create button to the top-right */}
            <div className="ml-auto">
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setOpenCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo chapter mới
              </Button>
            </div>
          </div>
        </header>

        {/* Actions */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {book?.coverUrl && (
              <img
                src={book.coverUrl}
                alt={book.bookName}
                className="w-16 h-20 rounded-md object-cover border"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='224'%3E%3Crect width='100%25' height='100%25' fill='%23667eea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='white'%3EInvalid URL%3C/text%3E%3C/svg%3E";
                }}
              />
            )}
            <div className="text-white">
              <div className="font-semibold">{book?.bookName ?? "Chưa có tiêu đề"}</div>
              <div className="text-sm text-gray-300 max-w-xl line-clamp-2">{book?.decription ?? "-"}</div>
            </div>
          </div>

          <div>
            {/* keep navigation option if needed */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(bookId ? `/author/authorchaptercreate?bookId=${bookId}` : "/author/authorchaptercreate")}
            >
              Truy cập trang tạo (tuỳ chọn)
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
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
                    review: chapter.review,
                    publishedDate: chapter.publishedDate,
                    progressStatus: chapter.progressStatus,
                    publicationStatus: chapter.publicationStatus,
                    bookId: chapter.bookId ?? chapter.book_id,
                    isActived: chapter.isActived,
                  };

                  return (
                    <TableRow key={id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="text-gray-900 font-medium">{normalized.chapterName}</div>
                        <div className="text-gray-500 text-sm">ID: {id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-900">{normalized.chapterNumber ?? "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-700 text-sm">{normalized.decription ?? "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-gray-600">
                                <MoreVertical className="w-5 h-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[160px]">
                              <DropdownMenuItem onClick={() => navigate(`/author/chapter/${id}`)}>
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEdit(normalized)}>
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleConfirmDelete(normalized)}>
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Empty / Loading state */}
            {(loadingChapters || loadingBook) && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Đang tải dữ liệu...</p>
              </div>
            )}

            {!loadingChapters && currentChapters.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Không tìm thấy chapter nào</p>
              </div>
            )}

            {/* Pagination */}
            {chapters.length > 0 && (
              <div className="border-t px-6 py-4 flex items-center justify-between bg-white">
                <span className="text-sm text-gray-600">
                  Trang {currentPage} / {totalPages}
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={handlePrev} className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""} />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext onClick={handleNext} className={currentPage === totalPages ? "opacity-50 pointer-events-none" : ""} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chapter create dialog */}
      <ChapterCreateDialog
        isOpen={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        bookId={bookId}
        onCreated={handleCreated}
      />

      {/* Chapter edit dialog */}
      <ChapterEditDialog
        isOpen={openEditDialog}
        onClose={() => { setOpenEditDialog(false); setEditingChapter(null); }}
        chapter={editingChapter}
        onUpdated={handleEditSaved}
      />

      {/* Delete confirm alert */}
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa chương</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa chương "{deletingChapter?.chapterName}"? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setOpenDeleteAlert(false)}>Huỷ</Button>
            <Button className="ml-2" onClick={handleDelete}>
              Xóa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

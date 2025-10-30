import { useState, useMemo } from "react";
import { Menu, X, Eye, Edit, Trash2 } from "lucide-react";
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
  useGetAllPages,
  useGetChapterById,
  useDeletePage,
  type Page
} from "@/services/BookManageService";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

const AuthorPageList = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch chapter details and pages
  const { data: chapter, isLoading: loadingChapter } = useGetChapterById(chapterId || "");
  const { data: pagesResp, isLoading: loadingPages } = useGetAllPages(
    chapterId ? { chapterId } : undefined
  );

  // Delete dialog state
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [deletingPage, setDeletingPage] = useState<Page | null>(null);
  const deletePage = useDeletePage();

  const handleConfirmDelete = (page: Page) => {
    setDeletingPage(page);
    setOpenDeleteAlert(true);
  };

  const handleDelete = async () => {
    if (!deletingPage?.pageId) return;
    try {
      await deletePage.mutateAsync(deletingPage.pageId);
      toast({
        title: "Xóa thành công",
        description: `Đã xóa trang ${deletingPage.pageNumber}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["pages", { chapterId }] });
    } catch (err) {
      toast({
        title: "Xóa thất bại",
        description: "Không thể xóa trang. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setOpenDeleteAlert(false);
      setDeletingPage(null);
    }
  };

  // Filter ACTIVE pages
  const pages: Page[] = useMemo(() => {
    if (!pagesResp) return [];
    const list = Array.isArray(pagesResp)
      ? pagesResp
      : Array.isArray((pagesResp as any).content)
        ? (pagesResp as any).content
        : [];
    return list.filter((p: { isActived?: string }) => p.isActived !== "INACTIVE");
  }, [pagesResp]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(pages.length / perPage));
  const currentPages = pages.slice((currentPage - 1) * perPage, currentPage * perPage);

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
              <div className="text-sm">Danh sách trang</div>
              <div className="text-xs text-gray-300">
                Chương: {loadingChapter ? "Đang tải..." : chapter?.chapterName ?? "Chưa chọn"}
              </div>
            </div>

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    + Tạo trang mới
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/author/chapters/${chapterId}/pages/create-text`)}>
                    Tạo trang chữ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/author/chapters/${chapterId}/pages/create-image`)}>
                    Tạo trang ảnh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Chapter detail section */}
        <div className="bg-[#1a2332] px-6 py-6 border-b border-white/10">
          <div className="text-white">
            <h2 className="text-xl font-semibold mb-2">
              {chapter?.chapterName || "Đang tải..."}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Thứ tự chương:</span>{" "}
                <span className="text-white">{chapter?.chapterNumber || "-"}</span>
              </div>
              <div>
                <span className="text-gray-400">Mô tả:</span>{" "}
                <span className="text-white">{chapter?.decription || "Không có mô tả"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page list */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                  <TableHead className="text-white font-medium">Số trang</TableHead>
                  <TableHead className="text-white font-medium">Nội dung</TableHead>
                  <TableHead className="text-white font-medium w-[120px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPages.map((page) => (
                  <TableRow key={page.pageId} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{page.pageNumber}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {(() => {
                        const htmlContent = page.content || "";
                        const plainText = htmlContent.replace(/<[^>]+>/g, " ").trim();
                        const words = plainText.split(/\s+/);
                        const shortText = words.slice(0, 8).join(" ");
                        return words.length > 8 ? `${shortText}...` : shortText;
                      })()}
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
                                onClick={() => navigate(`/author/page/${page.pageId}`)}
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
                                onClick={() => navigate(`/author/page/${page.pageId}/edit`)}
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
                                onClick={() => handleConfirmDelete(page)}
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
                ))}
              </TableBody>
            </Table>

            {/* Loading / Empty state */}
            {(loadingChapter || loadingPages) && (
              <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
            )}
            {!loadingPages && currentPages.length === 0 && (
              <div className="text-center py-8 text-gray-500">Không tìm thấy trang nào</div>
            )}

            {/* Pagination */}
            {pages.length > 0 && (
              <div className="border-t px-6 py-4 flex items-center justify-between bg-white">
                <span className="text-sm text-gray-600">
                  Trang {currentPage} / {totalPages}
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                        className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                        className={currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Alert Dialog */}
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa trang</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa trang {deletingPage?.pageNumber}? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setOpenDeleteAlert(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              className="ml-2"
              onClick={handleDelete}
              disabled={deletePage.isPending}
            >
              {deletePage.isPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AuthorPageList;

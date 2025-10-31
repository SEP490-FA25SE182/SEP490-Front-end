import { useState, useMemo, useEffect } from "react";
import { Menu, X, Eye, Edit, Trash2, Search } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type Page,
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

// Hàm rút gọn text
const truncateText = (text: string, maxWords = 7) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
};

const AuthorPageList = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filter
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data
  const { data: chapter, isLoading: loadingChapter } = useGetChapterById(chapterId || "");
  const { data: pagesResp, isLoading: loadingPages } = useGetAllPages(
    chapterId ? { chapterId } : undefined
  );

  // Delete
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
        description: "Không thể xóa trang.",
        variant: "destructive",
      });
    } finally {
      setOpenDeleteAlert(false);
      setDeletingPage(null);
    }
  };

  // === Xử lý danh sách trang + filter ===
  const pages: Page[] = useMemo(() => {
    if (!pagesResp) return [];
    const list = Array.isArray(pagesResp)
      ? pagesResp
      : Array.isArray((pagesResp as any)?.content)
        ? (pagesResp as any).content
        : [];

    return list
      .filter((p: any) => p.isActived !== "INACTIVE")
      .filter((p: any) =>
        searchTerm === "" ||
        p.pageNumber.toString().includes(searchTerm)
      )
      .sort((a: any, b: any) => a.pageNumber - b.pageNumber); // SẮP XẾP TĂNG DẦN
  }, [pagesResp, searchTerm]);

  // === THÊM HÀM MỚI ===
  const isFirebaseImageUrl = (url: string) => {
    return (
      (url.includes("firebasestorage.googleapis.com") && url.includes("alt=media")) ||
      url.startsWith("gs://")
    );
  };

  const getDisplayImageUrl = (url: string): string => {
    if (url.startsWith("gs://")) {
      const bucket = url.split("/")[2];
      const path = url.split("/").slice(3).join("/");
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
    }
    return url;
  };

  // === Phân trang ===
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(pages.length / perPage));
  const currentPages = pages.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

        {/* Chapter Info */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white mb-1">
            {chapter?.chapterName || "Đang tải..."}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <span className="text-gray-400">Thứ tự:</span>{" "}
              <span className="text-white">{chapter?.chapterNumber || "-"}</span>
            </div>
            <div>
              <span className="text-gray-400">Mô tả:</span>{" "}
              <span className="text-white">{chapter?.decription || "Không có"}</span>
            </div>
          </div>
        </div>

        {/* Filter Input */}
        <div className="px-6 py-3 bg-[#0f172a] border-b border-white/10">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Tìm số trang..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // reset về trang 1 khi filter
              }}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Page Table */}
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

                    {isFirebaseImageUrl(page.content) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded overflow-hidden border border-gray-200">
                          <img
                            src={getDisplayImageUrl(page.content)}
                            alt={`Page ${page.pageNumber}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = "https://via.placeholder.com/48?text=IMG";
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">Hình ảnh</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {truncateText(page.content)}
                      </p>
                    )}

                    <TableCell>
                      <TooltipProvider>
                        <div className="flex items-center space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/author/page/${page.pageId}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Xem</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/author/page/${page.pageId}/edit`)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Chỉnh sửa</TooltipContent>
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
                            <TooltipContent>Xóa</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Empty / Loading */}
            {(loadingChapter || loadingPages) && (
              <div className="text-center py-8 text-gray-500">Đang tải...</div>
            )}
            {!loadingPages && currentPages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Không tìm thấy trang nào." : "Chưa có trang nào."}
              </div>
            )}

            {/* PAGINATION - ĐẸP NHƯ AuthorBookList */}
            {pages.length > 0 && (
              <div className="border-t px-6 py-4 bg-white">
                <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-0">
                  {/* Spacer trái (ẩn trên mobile) */}
                  <div className="hidden sm:block sm:w-1/3" />

                  {/* Nút Previous / Next */}
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

                  {/* Thông tin trang */}
                  <div className="w-full sm:w-1/3 text-sm text-gray-600 text-center sm:text-right whitespace-nowrap">
                    Trang {currentPage} / {totalPages} ({pages.length} trang)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Xóa xác nhận */}
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa trang <strong>{deletingPage?.pageNumber}</strong>? Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setOpenDeleteAlert(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
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
};

export default AuthorPageList;
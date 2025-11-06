import { useState, useMemo, useEffect } from "react";
import { Menu, X, Eye, Edit, Trash2, Search, MoreVertical } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { PageCreateDialog } from "@/components/dialog/PageCreateDialog";

const AuthorPageList = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
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

  // Xử lý danh sách trang + filter
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
      .sort((a: any, b: any) => a.pageNumber - b.pageNumber);
  }, [pagesResp, searchTerm]);

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

  const truncateText = (text: string, wordLimit: number = 10): string => {
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  // Phân trang
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
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-200 text-gray-800"
                onClick={() => navigate(-1)}
              >
                Quay về chương
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    + Tạo trang mới
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setOpenCreateDialog(true)}>
                    Tạo trang trống
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/author/chapters/${chapterId}/pages/create-image`)}>
                    Tạo ảnh
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/author/chapters/${chapterId}/pages/create-audio`)}>
                    Tạo audio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Chapter Info */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white mb-1">
            Tên chương: {chapter?.chapterName || "Đang tải..."}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <span className="text-gray-400">Chương số:</span>{" "}
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
                setCurrentPage(1);
              }}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Page Grid - File Icon Style */}
        <div className="flex-1 overflow-auto p-6 bg-[#0f172a]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {currentPages.map((page) => {
              const isImage = isFirebaseImageUrl(page.content);
              return (
                <div key={page.pageId} className="group relative">
                  <div className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
                    {/* File Preview */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative w-16 h-20 flex items-center justify-center rounded overflow-hidden bg-white/5">
                        {isImage ? (
                          <img
                            src={getDisplayImageUrl(page.content)}
                            alt={`Trang ${page.pageNumber}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<svg class="w-full h-full text-blue-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-1">
                            <p className="text-[8px] text-gray-300 text-center leading-tight overflow-hidden">
                              {truncateText(page.content, 10)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Page Number */}
                      <div className="text-xs text-white font-medium text-center truncate w-full">
                        Trang {page.pageNumber}
                      </div>

                      {/* Page Type Badge */}
                      <div className={`text-[10px] px-2 py-0.5 rounded-full ${isImage
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-purple-500/20 text-purple-300'
                        }`}>
                        {isImage ? 'Trang Ảnh' : 'Trang Chữ'}
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
                          <DropdownMenuItem onClick={() => navigate(`/author/page/${page.pageId}`)}>
                            <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/author/page/${page.pageId}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleConfirmDelete(page)}
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

          {/* Loading & Empty States */}
          {(loadingChapter || loadingPages) && (
            <div className="text-center py-12 text-gray-400">Đang tải...</div>
          )}
          {!loadingPages && currentPages.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {searchTerm ? "Không tìm thấy trang nào." : "Chưa có trang nào."}
            </div>
          )}

          {/* Pagination */}
          {pages.length > 0 && (
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
                  Trang {currentPage} / {totalPages} ({pages.length} trang)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <PageCreateDialog
        isOpen={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        chapterId={chapterId}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["pages", { chapterId }] });
        }}
      />

      {/* Delete Confirmation Dialog */}
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
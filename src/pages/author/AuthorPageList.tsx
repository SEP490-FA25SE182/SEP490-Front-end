import { useState, useMemo, useEffect } from "react";
import {
  Menu,
  X,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  Image,
  AudioLines,
  Plus,
  TextInitial,
  BookImage,
} from "lucide-react";
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
import MarkerCreateDialog from "@/components/dialog/MarkerCreateDialog";
import Asset3DCreateDialog from "@/components/dialog/3DAssetCreatDialog";
import CreateAudioDialog from "@/components/dialog/CreateAudioDialog";
import { useGetAllMarkers, type Marker, getMarkerById } from "@/services/ARService";
import EmptyPageDialog from "@/components/dialog/EmptyPageDialog";

// 🔹 THÊM: dùng AIService để lấy page-illustration + illustration
import {
  useSearchPageIllustrations,
  useGetAllIllustrations,
  type Illustration,
  type PageIllustration,
} from "@/services/AIService";

const AuthorPageList = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [openAudioDialog, setOpenAudioDialog] = useState(false);
  const [openEmptyDialog, setOpenEmptyDialog] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | undefined>(undefined);
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

  // Markers (right panel)
  const { data: markersResp, isLoading: loadingMarkers } = useGetAllMarkers();

  // 🔹 Lấy quan hệ page-illustration & danh sách illustration
  const { data: pageIllustrationsResp } = useSearchPageIllustrations();
  const { data: illustrationsResp } = useGetAllIllustrations();

  // Chuẩn hóa page-illustrations
  const pageIllustrations: PageIllustration[] = useMemo(() => {
    if (!pageIllustrationsResp) return [];
    if (Array.isArray((pageIllustrationsResp as any).content)) {
      return (pageIllustrationsResp as any).content;
    }
    return Array.isArray(pageIllustrationsResp)
      ? (pageIllustrationsResp as PageIllustration[])
      : [];
  }, [pageIllustrationsResp]);

  // Chuẩn hóa illustrations
  const illustrations: Illustration[] = useMemo(() => {
    if (!illustrationsResp) return [];
    return Array.isArray(illustrationsResp)
      ? (illustrationsResp as Illustration[])
      : Array.isArray((illustrationsResp as any).content)
        ? ((illustrationsResp as any).content as Illustration[])
        : [];
  }, [illustrationsResp]);

  // 🔹 Map nhanh pageId → imageUrl
  const pageImageMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    if (!pageIllustrations.length) return map;

    pageIllustrations.forEach((pi: any) => {
      const pid = pi.pageId || pi.page?.pageId;
      const illustrationId =
        pi.illustrationId || pi.illustration?.illustrationId;

      if (!pid || !illustrationId) return;

      const illuFromList = illustrations.find(
        (it) => it.illustrationId === illustrationId
      );
      const illu: any = illuFromList || pi.illustration;

      if (illu?.imageUrl) {
        map[pid] = illu.imageUrl;
      }
    });

    return map;
  }, [pageIllustrations, illustrations]);

  const getImageUrlByPageId = (pageId?: string) => {
    if (!pageId) return undefined;
    return pageImageMap[pageId];
  };

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
      .filter(
        (p: any) =>
          searchTerm === "" || p.pageNumber.toString().includes(searchTerm)
      )
      .sort((a: any, b: any) => a.pageNumber - b.pageNumber);
  }, [pagesResp, searchTerm]);

  // Markers list normalized
  const markers: Marker[] = useMemo(() => {
    if (!markersResp) return [];
    return Array.isArray(markersResp)
      ? markersResp
      : (markersResp as any).content || [];
  }, [markersResp]);

  const isImageUrl = (url?: string) => {
    if (!url) return false;
    return (
      url.startsWith("gs://") ||
      url.includes("firebasestorage.googleapis.com") ||
      /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url)
    );
  };

  // 🔹 SỬA: xác định trang ảnh dựa trên pageType + quan hệ page-illustration + content
  const isImagePage = (page: Page) => {
    const relationUrl = getImageUrlByPageId(page.pageId);
    return page.pageType === "PICTURE" || !!relationUrl || isImageUrl(page.content);
  };

  const getDisplayImageUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("gs://")) {
      const bucket = url.split("/")[2];
      const path = url.split("/").slice(3).join("/");
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        path
      )}?alt=media`;
    }
    return url;
  };

  const truncateText = (text: string, wordLimit: number = 10): string => {
    const words = text?.trim().split(/\s+/) || [];
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  // Hàm xử lý chuyển đến trang edit phù hợp
  const handleEdit = (page: Page) => {
    const isImage = isImagePage(page);
    if (isImage) {
      navigate(`/author/pages/${page.pageId}/image-edit`);
    } else {
      navigate(`/author/pages/${page.pageId}/text-edit`);
    }
  };

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(pages.length / perPage));
  const currentPages = pages.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Page list (2/3) */}
        <div className="w-2/3 flex flex-col">
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
                      <Plus className="w-4 h-4 mr-2" /> Các thao tác
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setOpenEmptyDialog(true)}>
                      <BookImage className="w-4 h-4 mr-2" /> Tạo trang ảnh
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenCreateDialog(true)}>
                      <TextInitial className="w-4 h-4 mr-2" /> Tạo trang chữ
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(
                          `/author/chapters/${chapterId}/pages/create-image`
                        )
                      }
                    >
                      <Image className="w-4 h-4 mr-2" /> Tạo ảnh
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpenAudioDialog(true)}>
                      <AudioLines className="w-4 h-4 mr-2" /> Tạo audio
                    </DropdownMenuItem>
                    {/* removed create 3D model from this dropdown per request */}
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
                <span className="text-white">
                  {chapter?.chapterNumber || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Mô tả:</span>{" "}
                <span className="text-white">
                  {chapter?.decription || "Không có"}
                </span>
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

          {/* Page Grid */}
          <div className="flex-1 overflow-auto p-6 bg-[#0f172a]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {currentPages.map((page) => {
                const relationUrl = getImageUrlByPageId(page.pageId);
                const contentIsImage = isImageUrl(page.content);
                const imageUrl =
                  relationUrl || (contentIsImage ? page.content : undefined);

                const isImage = page.pageType === "PICTURE" || !!imageUrl;
                const hasImageUrl = !!imageUrl;

                return (
                  <div key={page.pageId} className="group relative">
                    {/* whole card clickable -> go to page detail */}
                    <div
                      className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer"
                      onClick={() => navigate(`/author/page/${page.pageId}`)}
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              onClick={(e) => e.stopPropagation()}
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white rounded-full"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {/* removed 'Xem chi tiết' from menu - whole card is clickable */}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(page);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmDelete(page);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col items-center space-y-2">
                        <div className="relative w-16 h-20 flex items-center justify-center rounded overflow-hidden bg-white/5">
                          {isImage ? (
                            hasImageUrl ? (
                              <img
                                src={getDisplayImageUrl(imageUrl)}
                                alt={`Trang ${page.pageNumber}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement!.innerHTML =
                                    '<div class="p-2 text-[8px] text-center text-gray-300">Không thể tải ảnh.</div>';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <p className="text-[8px] text-gray-300 text-center leading-tight">
                                  Trang ảnh (chưa có URL ảnh hợp lệ)
                                </p>
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-1">
                              <p className="text-[8px] text-gray-300 text-center leading-tight overflow-hidden">
                                {truncateText(page.content, 10)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-white font-medium text-center truncate w-full">
                          Trang {page.pageNumber}
                        </div>

                        <div
                          className={`text-[10px] px-2 py-0.5 rounded-full ${isImage
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-purple-500/20 text-purple-300"
                            }`}
                        >
                          {isImage ? "Trang Ảnh" : "Trang Chữ"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {(loadingChapter || loadingPages) && (
              <div className="text-center py-12 text-gray-400">Đang tải...</div>
            )}
            {!loadingPages && currentPages.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                {searchTerm ? "Không tìm thấy trang nào." : "Chưa có trang nào."}
              </div>
            )}

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
                            className={`text-white hover:bg-white/10 ${currentPage === 1
                                ? "opacity-50 pointer-events-none"
                                : ""
                              }`}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handleNext}
                            className={`text-white hover:bg-white/10 ${currentPage === totalPages
                                ? "opacity-50 pointer-events-none"
                                : ""
                              }`}
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

        {/* RIGHT: Marker panel (1/3) */}
        <aside className="w-1/3 border-l border-white/10 bg-[#0b1220] flex flex-col">
          <div className="px-4 py-4 flex items-center justify-between border-b border-white/6">
            <div className="text-white font-semibold">Markers</div>
            <div className="flex items-center gap-2">
              {/* keep a small control area (empty for now) to balance header */}
            </div>
          </div>

          <div className="p-4 overflow-auto">
            {loadingMarkers && (
              <div className="text-gray-400">Đang tải markers...</div>
            )}
            {!loadingMarkers && markers.length === 0 && (
              <div className="text-gray-400 mb-3">Chưa có marker nào.</div>
            )}

            {/* grid of small project/marker cards (match page card style) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Create New Project card */}
              <div
                onClick={() => setMarkerDialogOpen(true)}
                className="cursor-pointer group bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 flex flex-col items-center justify-center min-h-[120px]"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 text-white">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="mt-3 text-sm text-white">Tạo project 3D mới</div>
              </div>

              {/* Marker cards */}
              {markers.map((m) => (
                <div
                  key={m.markerId}
                  className="group relative bg-white/5 hover:bg-white/10 rounded-lg p-0 transition-all duration-200 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 overflow-hidden cursor-pointer"
                  onClick={async () => {
                    try {
                      const marker = await getMarkerById(m.markerId as string);
                      navigate(`/author/model-view/${marker.markerId}`, {
                        state: {
                          marker,
                          chapterId: chapterId, // truyền thêm chapterId
                        },
                      });
                    } catch (err) {
                      toast({
                        title: "Lỗi",
                        description: "Không lấy được marker.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <div className="w-full h-28 bg-white/5 flex items-center justify-center overflow-hidden">
                    {m.imageUrl ? (
                      <img
                        src={getDisplayImageUrl(m.imageUrl)}
                        alt={m.markerCode}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm text-white font-medium truncate">
                        {m.markerCode || "Untitled"}
                      </div>
                      <div className="text-xs text-gray-400">{m.markerType}</div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMarkerId(m.markerId);
                              setAssetDialogOpen(true);
                            }}
                          >
                            Thêm asset
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              /* open edit marker flow if exists */
                            }}
                          >
                            Chỉnh sửa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* dialogs and alerts (existing components) */}
      <PageCreateDialog
        isOpen={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        chapterId={chapterId}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["pages", { chapterId }] });
        }}
      />

      <MarkerCreateDialog
        isOpen={markerDialogOpen}
        onClose={() => setMarkerDialogOpen(false)}
        {...({
          onCreated: async (created: any) => {
            await queryClient.invalidateQueries({ queryKey: ["markers", "all"] });
            setMarkerDialogOpen(false);
            if (created?.markerId) {
              setSelectedMarkerId(created.markerId);
              setAssetDialogOpen(true);
            }
          },
        } as any)}
      />

      <Asset3DCreateDialog
        isOpen={assetDialogOpen}
        onClose={() => setAssetDialogOpen(false)}
        markerId={selectedMarkerId}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["asset3d", "search"] });
          setAssetDialogOpen(false);
        }}
      />

      <CreateAudioDialog
        isOpen={openAudioDialog}
        onClose={() => setOpenAudioDialog(false)}
        chapterId={chapterId}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["pages", { chapterId }] });
        }}
      />

      <EmptyPageDialog
        isOpen={openEmptyDialog}
        onClose={() => setOpenEmptyDialog(false)}
        chapterId={chapterId}
        onCreated={async () => {
          // refresh pages list after created
          await queryClient.invalidateQueries({ queryKey: ["pages", { chapterId }] });
          setOpenEmptyDialog(false);
        }}
      />

      {/* Delete Confirmation Dialog (existing) */}
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
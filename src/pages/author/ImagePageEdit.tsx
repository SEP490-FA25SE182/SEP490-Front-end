import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { useGetPageById, useUpdatePage } from "@/services/BookManageService";
import {
  useSearchIllustrations,
  useUpdatePageIllustration,
  useSearchPageIllustrations,
} from "@/services/AIService";
import { getCurrentBookId, getCurrentUserId } from "@/utils/authStorage";
import {
  useAttachMarkerToPage,
  useSearchMarkers,
  useCreateMarkerIllustration,
} from "@/services/ARService";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Helper: chuyển gs://bucket/path -> https download url cho preview
 * Nếu url không bắt đầu bằng gs:// thì trả về nguyên bản
 */
function gsToHttp(url: string) {
  if (!url) return "";
  if (!url.startsWith("gs://")) return url;
  const withoutGs = url.replace("gs://", "");
  const parts = withoutGs.split("/");
  const bucket = parts.shift();
  const path = parts.join("/");
  if (!bucket || !path) return url;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

export default function ImagePageEdit() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { pageId } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bookId = useMemo(() => getCurrentBookId(), []);
  const authorId = useMemo(() => getCurrentUserId(), []);

  // page data + update
  const { data: pageData, isLoading: pageLoading } = useGetPageById(pageId || "");
  const updatePage = useUpdatePage();

  // illustrations + update relation
  const updatePageIllustration = useUpdatePageIllustration();
  const createMarkerIllustrationMutation = useCreateMarkerIllustration();

  // ================= MARKER HOOKS =================
  const { data: allMarkersResp } = useSearchMarkers(
    bookId && authorId
      ? {
        bookId,
        userId: authorId,
        page: 0,
        size: 9999,
        sort: ["updatedAt,desc"],
      }
      : undefined
  );
  const allMarkers = allMarkersResp?.content ?? [];

  const attachMarkerMutation = useAttachMarkerToPage();
  // marker đang gắn với page (nếu có)
  const { data: pageMarkersResp } = useSearchMarkers(
    pageId && bookId
      ? {
        pageId,
        bookId,
        userId: authorId ?? undefined,
        page: 0,
        size: 9999,
        sort: ["updatedAt,desc"],
      }
      : undefined
  );

  const normTypeUpper = (m: any) => String(m?.markerType ?? m?.type ?? "").toUpperCase();
  const isIlluMarker = (m: any) => normTypeUpper(m).includes("ILLUSTRATION"); // MARKERILLUSTRATION / MARKER_ILLUSTRATION ...

  const pageMarkers = pageMarkersResp?.content ?? [];

  const pageStage2 = pageMarkers.find(isIlluMarker) ?? null;     // marker illustration
  const pageStage1 = pageMarkers.find((m: any) => !isIlluMarker(m)) ?? null; // marker thường (apriltag/marker trắng...)

  const pageStage1Id = (pageStage1 as any)?.markerId ?? (pageStage1 as any)?.id ?? "";
  const pageStage2Id = (pageStage2 as any)?.markerId ?? (pageStage2 as any)?.id ?? "";

  const hasStage1 = !!pageStage1Id;
  const hasStage2 = !!pageStage2Id;

  // local form state
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");

  const [selectedIllustrationId, setSelectedIllustrationId] =
    useState<string>("");
  const [pageIllustrationId, setPageIllustrationId] = useState<string>("");

  // marker state
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("");
  const [hasPageMarker] = useState(false);

  // get current user id from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.userId;

  const { data: illustrations = [] } = useSearchIllustrations({
    userId,
    size: 9999,
    sort: ["updatedAt,desc"],
  });

  // === Lấy liên kết page-illustration hiện có ===
  const { data: pageIllustrationsData } = useSearchPageIllustrations({
    pageId: pageId || "",
  });

  // when pageData loaded, fill pageNumber + content + chapterId
  useEffect(() => {
    if (pageData) {
      setPageNumber(pageData.pageNumber || 1);
      setContent(pageData.content || "");
      setChapterId(pageData.chapterId || "");
    }
  }, [pageData]);

  // Memoize illustrationsList with userId filtering
  const illustrationsList = useMemo(() => {
    if (!Array.isArray(illustrations) || illustrations.length === 0) return [];

    const toTime = (d?: string) => (d ? new Date(d).getTime() : Number.POSITIVE_INFINITY);

    return illustrations
      .filter((it: any) => it.isActived === "ACTIVE" && !!it.illustrationId)
      .sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt))
      .map((it: any) => ({
        id: it.illustrationId as string,
        title: it.title,
        url: it.imageUrl,
        updatedAt: it.updatedAt,
      }));
  }, [illustrations]);

  // === Tự động điền illustration đã liên kết (từ page-illustrations) ===
  useEffect(() => {
    if (
      pageIllustrationsData?.content &&
      pageIllustrationsData.content.length > 0
    ) {
      const firstPageIllustration = pageIllustrationsData.content[0];
      if (firstPageIllustration.illustrationId) {
        setSelectedIllustrationId(firstPageIllustration.illustrationId);
        setPageIllustrationId(firstPageIllustration.pageIllustrationId || "");

        // Tìm illustration trong danh sách và set content
        const found = illustrationsList.find(
          (i) => i.id === firstPageIllustration.illustrationId
        );
        if (found) {
          setContent(found.url || "");
        }
      }
    }
  }, [pageIllustrationsData, illustrationsList]);

  // === Fallback: nếu KHÔNG có page-illustrations mà page.content trùng imageUrl
  // => tự map selectedIllustrationId để Select hiển thị đúng tên ảnh
  useEffect(() => {
    if (selectedIllustrationId) return; // đã set rồi thì thôi
    if (!pageData?.content) return;
    if (!illustrationsList.length) return;

    const matched = illustrationsList.find(
      (it) => it.url === pageData.content
    );
    if (matched) {
      setSelectedIllustrationId(matched.id);
      // pageIllustrationId vẫn rỗng -> khi lưu nếu cần tạo mới mapping thì xử lý thêm sau
    }
  }, [pageData, illustrationsList, selectedIllustrationId]);

  const markerList = useMemo(() => {
    if (!Array.isArray(allMarkers)) return [];

    const toTime = (d?: string) => (d ? new Date(d).getTime() : 0);

    const normalized = [...allMarkers]
      .filter((m: any) => m.isActived === "ACTIVE")
      .sort((a: any, b: any) => toTime(b.updatedAt) - toTime(a.updatedAt));

    const isIllu = (m: any) => {
      const t = (m.markerType || "").toString().toUpperCase();
      return t.includes("ILLUSTRATION");
    };

    // CHỈ show marker thường để chọn stage1
    return normalized
      .filter((m) => !isIllu(m))
      .map((m: any) => ({
        id: m.markerId ?? m.id,
        code: m.markerCode,
        type: m.markerType,
        imageUrl: m.imageUrl,
        updatedAt: m.updatedAt,
      }));
  }, [allMarkers]);

  async function resolveCreatedIllustrationMarkerId(createRes: any) {
    // Case A: API trả luôn markerId / id
    const directId =
      createRes?.markerId ??
      createRes?.id ??
      createRes?.data?.markerId ??
      createRes?.data?.id;

    if (directId) return String(directId);

    // Case B: refetch markers list rồi lấy illustration mới nhất
    await queryClient.refetchQueries({
      queryKey: ["markers"],
      type: "active",
    });

    const latestMarkers: any[] = (queryClient.getQueryData(["markers"]) as any)?.content ?? allMarkers;

    const illu = (latestMarkers ?? []).find((m: any) =>
      String(m?.markerType ?? "").toUpperCase().includes("ILLUSTRATION")
    );

    const id = illu?.markerId ?? illu?.id;
    return id ? String(id) : "";
  }

  // auto select marker đang gắn với page (nếu có)
  useEffect(() => {
    if (pageStage1Id) {
      setSelectedMarkerId((prev) => prev || pageStage1Id);
    }
  }, [pageStage1Id]);

  // when user selects an illustration -> set selected id and replace content with image url
  const handleSelectIllustration = (id: string) => {
    setSelectedIllustrationId(id);
    const found = illustrationsList.find((i) => i.id === id);
    if (found) {
      setContent(found.url || "");
    } else {
      setContent("");
    }
  };

  // chọn marker
  const handleSelectMarker = (id: string) => {
    setSelectedMarkerId(id);
  };

  const isSaving =
    updatePage.isPending ||
    updatePageIllustration.isPending ||
    (!hasPageMarker && attachMarkerMutation.isPending) ||
    createMarkerIllustrationMutation.isPending;

  const handleSubmit = async () => {
    if (!pageId) {
      toast({
        title: "Thiếu thông tin",
        description: "Không tìm thấy trang để cập nhật.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedIllustrationId) {
      toast({
        title: "Chưa chọn ảnh",
        description: "Vui lòng chọn một ảnh để gắn vào trang.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1) Update page
      await updatePage.mutateAsync({
        id: pageId,
        data: {
          pageNumber,
          content,
          chapterId,
          isActived: "ACTIVE",
        },
      });

      // 2) Update page-illustration relation
      if (pageIllustrationId) {
        await updatePageIllustration.mutateAsync({
          id: pageIllustrationId,
          data: {
            pageId,
            illustrationId: selectedIllustrationId,
          },
        });
      }

      // 3) stage1MarkerId: ưu tiên marker đã gắn sẵn, nếu chưa có thì lấy từ user chọn
      const stage1MarkerId = hasStage1 ? pageStage1Id : selectedMarkerId;

      // không chọn marker => chỉ lưu ảnh
      if (!stage1MarkerId) {
        toast({
          title: "Cập nhật thành công",
          description: "Đã lưu ảnh cho trang (chưa gắn marker).",
        });
        navigate(-1);
        return;
      }

      // 4) Attach stage1 nếu page chưa có
      if (!hasStage1) {
        await attachMarkerMutation.mutateAsync({
          markerId: stage1MarkerId,
          pageId,
        });
      }

      // 5) Create marker illustration
      const illusUrl = content ? gsToHttp(content) : "";
      if (!illusUrl) {
        toast({
          title: "Thiếu ảnh minh hoạ",
          description:
            "Trang chưa có Illustration imageUrl nên không thể tạo marker illustration.",
          variant: "destructive",
        });
        navigate(-1);
        return;
      }

      const createRes = await createMarkerIllustrationMutation.mutateAsync({
        markerId: stage1MarkerId,
        illustrationImageUrl: illusUrl,
        camoStrength: 0.95,
        quietZoneAlpha: 60,
        assumedDpi: 300,
        grainStrength: 0.2,
      });

      // 6) Resolve stage2MarkerId và attach luôn vào page
      let stage2MarkerId = await resolveCreatedIllustrationMarkerId(createRes);

      if (stage2MarkerId && !hasStage2) {
        await attachMarkerMutation.mutateAsync({
          markerId: stage2MarkerId,
          pageId,
        });
      }

      // 7) invalidate để book preview lấy đủ stage1 + stage2
      await queryClient.invalidateQueries({ queryKey: ["markers"] });
      await queryClient.invalidateQueries({ queryKey: ["pages"] });
      await queryClient.invalidateQueries({ queryKey: ["pageIllustrations"] });

      toast({
        title: "Cập nhật thành công",
        description: "Đã gắn marker stage1 và marker illustration vào trang.",
      });
      navigate(-1);
    } catch (err: any) {
      console.error("Error updating image page:", err);
      toast({
        title: "Lỗi khi lưu",
        description: err?.response?.data?.message || "Không thể cập nhật trang.",
        variant: "destructive",
      });
    }
  };

  if (pageLoading)
    return <div className="p-8 text-white">Đang tải dữ liệu...</div>;

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute z-50 top-4 h-9 w-9 rounded-full bg-[#0b1220]/70 backdrop-blur border border-white/10 text-white hover:bg-white/10 transition-all ${sidebarOpen ? "left-64 -translate-x-1/2" : "left-2 translate-x-0"}`}
      >
        {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
      </Button>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] border-b border-white/10 shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-white text-lg font-medium">
              Chỉnh sửa nội dung ảnh
            </h2>
          </div>
        </header>

        {/* Form */}
        <div className="flex-1 overflow-auto p-8 bg-[#1a2332]">
          <div className="mx-auto bg-white rounded-xl shadow-xl p-8 max-w-4xl">
            {/* Số trang */}
            <div className="mb-5">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Số trang
              </label>
              <Input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(Number(e.target.value))}
                className="bg-gray-100 text-black border-gray-300"
              />
            </div>

            {/* Chọn ảnh */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Chọn ảnh
              </label>
              <Select
                value={selectedIllustrationId}
                onValueChange={handleSelectIllustration}
              >
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue placeholder="-- Chọn ảnh minh hoạ --" />
                </SelectTrigger>
                <SelectContent>
                  {illustrationsList.map((illust) => (
                    <SelectItem key={illust.id} value={illust.id}>
                      {illust.title || "Không tên"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview ảnh */}
            {content && (
              <div className="mb-8">
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  Xem trước
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden flex justify-center">
                  <img
                    src={gsToHttp(content)}
                    alt="Preview"
                    className="w-full h-auto object-contain max-h-[420px]"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/400x300?text=Image+Error";
                    }}
                  />
                </div>
              </div>
            )}

            {/* MARKER CHO TRANG */}
            {!hasStage1 && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-base font-medium text-gray-800">
                    Marker cho trang (tuỳ chọn)
                  </h3>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {markerList.length === 0 && (
                      <div className="text-sm text-gray-500 col-span-full">
                        Chưa có marker nào.
                      </div>
                    )}

                    {markerList.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMarker(m.id)}
                        className={`rounded border p-1 overflow-hidden focus:outline-none ${selectedMarkerId === m.id
                          ? "border-purple-500 ring-2 ring-purple-200"
                          : "border-white/10 hover:border-gray-300"
                          }`}
                      >
                        <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center overflow-hidden">
                          {m.imageUrl ? (
                            <img
                              src={gsToHttp(m.imageUrl)}
                              alt={m.code}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="p-2 text-xs text-center text-gray-600">
                              {m.code}
                            </div>
                          )}
                        </div>
                        <div className="text-xs mt-2 text-left text-gray-700 truncate">
                          {m.code} ({m.type})
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isSaving && (
              <div className="mb-6 flex items-center justify-center">
                <div className="w-10 h-10 opacity-90">
                  <DotLottieReact
                    src="https://lottie.host/4c0bdcfd-3e4c-4dd2-b813-a3c31221686d/3kkAEhaRtz.lottie"
                    loop
                    autoplay
                    style={{ width: "100px", height: "100px" }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-8">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

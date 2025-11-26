import { useEffect, useState, useMemo } from "react";
import { Menu, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useGetPageById, useUpdatePage } from "@/services/BookManageService";
import { useSearchIllustrations, useCreatePageIllustration } from "@/services/AIService";

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

export default function ImagePageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { pageId } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // page data + update
  const { data: pageData, isLoading: pageLoading } = useGetPageById(pageId || "");
  const updatePage = useUpdatePage();

  // illustrations + create relation
  const createPageIllustration = useCreatePageIllustration();

  // local form state
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [selectedIllustrationId, setSelectedIllustrationId] = useState<string>("");

  // get current user id from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.userId;

  // fetch only illustrations created by this author
  const { data: illustrations = [] } = useSearchIllustrations({ userId });

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
    if (!Array.isArray(illustrations) || illustrations.length === 0) {
      return [];
    }

    return illustrations
      .filter((it: any) =>
        it.isActived === "ACTIVE" &&
        !!it.illustrationId
      )
      .map((it: any) => ({
        id: it.illustrationId as string,
        title: it.title,
        url: it.imageUrl,
      }));
  }, [illustrations]);

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
      // 1) Update page content to imageUrl
      await updatePage.mutateAsync({
        id: pageId,
        data: {
          pageNumber,
          content,
          chapterId,
          isActived: "ACTIVE",
        },
      });
      // 2) Create page-illustration relation
      await createPageIllustration.mutateAsync([
        {
          pageId,
          illustrationId: selectedIllustrationId,
        },
      ]);
      toast({
        title: "Lưu thành công",
        description: "Ảnh đã được gắn vào trang.",
      });
      navigate(-1);
    } catch (err: any) {
      console.error("Error saving image page:", err);
      toast({
        title: "Lỗi khi lưu",
        description: err?.response?.data?.message || "Không thể lưu trang.",
        variant: "destructive",
      });
    }
  };

  if (pageLoading) return <div className="p-8 text-white">Đang tải dữ liệu...</div>;

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#1a2332] border-b border-white/10 shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <h2 className="text-white text-lg font-medium">Tạo nội dung ảnh</h2>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 bg-[#1a2332]">
          <div className="mx-auto bg-white rounded-xl shadow-xl p-6 max-w-5xl">
            {/* Page number */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Số trang</label>
              <Input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(Number(e.target.value))}
                className="bg-gray-100 text-black border-gray-300"
              />
            </div>
            {/* Illustrations selector + preview */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Chọn illustration (chỉ của bạn)
              </label>
              {/* Grid of thumbnails */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {illustrationsList.length === 0 && (
                  <div className="text-sm text-gray-500 col-span-full">Không có ảnh nào.</div>
                )}
                {illustrationsList.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => handleSelectIllustration(it.id)}
                    className={`rounded border p-1 overflow-hidden focus:outline-none ${selectedIllustrationId === it.id
                        ? "border-purple-500 ring-2 ring-purple-200"
                        : "border-white/10 hover:border-gray-300"
                      }`}
                  >
                    <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={gsToHttp(it.url)}
                        alt={it.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).innerHTML = `<div class="p-2 text-xs text-center text-gray-600">${it.title}</div>`;
                        }}
                      />
                    </div>
                    <div className="text-xs mt-2 text-left text-gray-700 truncate">{it.title}</div>
                  </button>
                ))}
              </div>
              {/* Large preview */}
              <div className="border border-gray-200 rounded p-3 bg-gray-50">
                <div className="text-sm text-gray-600 mb-2">Preview</div>
                {selectedIllustrationId ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={gsToHttp(
                        illustrationsList.find((i) => i.id === selectedIllustrationId)?.url || ""
                      )}
                      alt="Preview"
                      className="max-h-[60vh] object-contain rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Chưa chọn ảnh. Chọn 1 ảnh để xem preview và gán vào trang.</div>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-600">
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Lưu ảnh vào trang
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
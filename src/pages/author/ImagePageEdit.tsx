import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { useGetPageById, useUpdatePage } from "@/services/BookManageService";
import {
  useSearchIllustrations,
  useUpdatePageIllustration,
  useSearchPageIllustrations,
} from "@/services/AIService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // page data + update
  const { data: pageData, isLoading: pageLoading } = useGetPageById(pageId || "");
  const updatePage = useUpdatePage();

  // illustrations + update relation
  const updatePageIllustration = useUpdatePageIllustration();

  // local form state
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [selectedIllustrationId, setSelectedIllustrationId] = useState<string>("");
  const [pageIllustrationId, setPageIllustrationId] = useState<string>("");

  // get current user id from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.userId;

  // fetch only illustrations created by this author
  const { data: illustrations = [] } = useSearchIllustrations({ userId });

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

  console.log("userId in FE:", userId);
  console.log(
    illustrations.map((i: any) => ({
      title: i.title,
      illustrationId: i.illustrationId,
      userId: i.userId,
      isActived: i.isActived,
    }))
  );

  // Memoize illustrationsList with userId filtering
  const illustrationsList = useMemo(() => {
    if (Array.isArray(illustrations) && illustrations.length > 0) {
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
    }
    return [];
  }, [illustrations, userId]);

  // === Tự động điền illustration đã liên kết ===
  useEffect(() => {
    if (pageIllustrationsData?.content && pageIllustrationsData.content.length > 0) {
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

      toast({
        title: "Cập nhật thành công",
        description: "Ảnh đã được cập nhật vào trang.",
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

  if (pageLoading) return <div className="p-8 text-white">Đang tải dữ liệu...</div>;

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] border-b border-white/10 shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
            </Button>
            <h2 className="text-white text-lg font-medium">Chỉnh sửa nội dung ảnh</h2>
          </div>
        </header>

        {/* Form */}
        <div className="flex-1 overflow-auto p-8 bg-[#1a2332]">
          <div className="mx-auto bg-white rounded-xl shadow-xl p-8 max-w-4xl">
            {/* Số trang */}
            <div className="mb-5">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Số trang</label>
              <Input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(Number(e.target.value))}
                className="bg-gray-100 text-black border-gray-300"
              />
            </div>

            {/* Chọn ảnh */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Chọn ảnh</label>
              <Select value={selectedIllustrationId} onValueChange={handleSelectIllustration}>
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
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 text-sm font-medium">Xem trước</label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={gsToHttp(content)}
                    alt="Preview"
                    className="w-full h-auto object-contain max-h-96"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Error";
                    }}
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
                disabled={updatePage.isPending || updatePageIllustration.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {updatePage.isPending || updatePageIllustration.isPending
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
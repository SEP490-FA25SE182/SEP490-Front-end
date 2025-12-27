import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useGetPageById, useUpdatePage } from "@/services/BookManageService";
import { useCreatePageAudio, useSearchAudios } from "@/services/AIService";

/** Helper: chuyển gs://bucket/path -> https download url cho audio preview */
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

export default function TextPageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chapterId, setChapterId] = useState<string>("");
  const { pageId } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // === Lấy thông tin trang ===
  const { data: pageData, isLoading } = useGetPageById(pageId || "");
  const updatePage = useUpdatePage();

  // === Audio ===
  const createPageAudio = useCreatePageAudio();

  // === State form ===
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");
  const [showAudioForm, setShowAudioForm] = useState(false);
  const [audioList, setAudioList] = useState<{ id: string; name: string; url: string }[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");

  // === Lấy user hiện tại ===
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // === Gọi API tìm audio của user ===
  const { data: audiosData } = useSearchAudios({
    userId: user.userId,
    isActived: "ACTIVE",
    page: 0,
    size: 9999,                 //  lấy hết (hoặc đủ lớn)
    sort: ["updatedAt,desc"],  //  mới nhất trước (nếu BE support)
  });


  useEffect(() => {
    if (pageData) {
      setPageNumber(pageData.pageNumber);
      setContent(pageData.content);
      if (pageData.chapterId) setChapterId(pageData.chapterId);
    }
  }, [pageData]);

  useEffect(() => {
    const audioItems = audiosData ?? [];

    const toTime = (d?: string) => {
      if (!d) return 0;
      const t = new Date(d).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const activeList = (audioItems as any[])
      .filter((a) => a.isActived === "ACTIVE" && a.audioId)
      .sort((a, b) => {
        const tb = toTime(b.updatedAt) || toTime(b.createdAt);
        const ta = toTime(a.updatedAt) || toTime(a.createdAt);
        if (tb !== ta) return tb - ta;

        // ổn định nếu trùng thời gian
        return String(b.audioId).localeCompare(String(a.audioId));
      })
      .map((a) => ({
        id: a.audioId as string,
        name: a.title || "Audio không tên",
        url: gsToHttp(a.audioUrl),
        updatedAt: a.updatedAt,
      }));

    setAudioList(activeList);
  }, [audiosData]);

  // === Submit update ===
  const handleSubmit = async () => {
    if (!pageId || !content.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập nội dung trước khi lưu.",
        variant: "destructive",
      });
      return;
    }

    try {
      //  Cập nhật nội dung trang
      await updatePage.mutateAsync({
        id: pageId,
        data: {
          pageNumber,
          content,
          chapterId,
          isActived: "ACTIVE",
        },
      });

      //  Liên kết audio nếu có chọn
      if (showAudioForm && selectedAudio) {
        await createPageAudio.mutateAsync([
          {
            pageId,
            audioId: selectedAudio,
          },
        ]);
      }

      toast({
        title: "Cập nhật thành công",
        description: "Trang đã được lưu thành công.",
      });
      navigate(-1);
    } catch (err: any) {
      console.error(" Lỗi khi lưu:", err);
      toast({
        title: "Lỗi khi lưu",
        description: err?.response?.data?.message || "Không thể cập nhật trang.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-white">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main */}
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
            <h2 className="text-white text-lg font-medium">Tạo nội dung chữ</h2>
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

            {/* Nội dung */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Nội dung</label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  placeholder="Nhập nội dung trang..."
                  className="bg-white"
                />
              </div>
            </div>

            {/* Audio form */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800">Audio kèm theo (tuỳ chọn)</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAudioForm(!showAudioForm)}
                className="flex items-center gap-2"
              >
                {showAudioForm ? (
                  <>
                    <Minus className="w-4 h-4" /> Ẩn form
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Thêm audio
                  </>
                )}
              </Button>
            </div>

            {showAudioForm && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn audio
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900 focus:ring-2 focus:ring-purple-500"
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                  >
                    <option value="">-- Chọn file audio --</option>
                    {audioList.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAudio && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nghe thử
                    </label>
                    <audio
                      key={selectedAudio}
                      controls
                      className="w-full"
                      preload="metadata"
                    >
                      <source
                        src={audioList.find((f) => f.id === selectedAudio)?.url || ""}
                        type="audio/mpeg"
                      />
                      <source
                        src={audioList.find((f) => f.id === selectedAudio)?.url || ""}
                        type="audio/wav"
                      />
                      Trình duyệt không hỗ trợ phát audio.
                    </audio>
                  </div>
                )}
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
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={updatePage.isPending || createPageAudio.isPending}
              >
                {updatePage.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

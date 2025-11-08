import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Menu, X, Plus, Minus } from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { useGetPageById, useUpdatePage } from "@/services/BookManageService";
import {
  useSearchAudios,
  useUpdatePageAudio,
  useSearchPageAudios,
} from "@/services/AIService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TextPageEdit() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chapterId, setChapterId] = useState<string>("");
  const { pageId } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // === Lấy thông tin trang ===
  const { data: pageData, isLoading } = useGetPageById(pageId || "");
  const updatePage = useUpdatePage();

  // === Audio ===
  const updatePageAudio = useUpdatePageAudio();

  // === State form ===
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");
  const [showAudioForm, setShowAudioForm] = useState(false);
  const [audioList, setAudioList] = useState<{ id: string; name: string; url: string }[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [pageAudioId, setPageAudioId] = useState<string>("");

  // === Lấy user hiện tại ===
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // === Gọi API tìm audio của user ===
  const { data: audiosData } = useSearchAudios({
    userId: user.userId,
    isActived: "ACTIVE",
  });

  // === Lấy liên kết page-audio hiện có ===
  const { data: pageAudiosData } = useSearchPageAudios({
    pageId: pageId || "",
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

    const activeList = (audioItems as any[])
      .filter((a) => a.isActived === "ACTIVE" && a.audioId)
      .map((a) => ({
        id: a.audioId as string,
        name: a.title || "Audio không tên",
        url: a.audioUrl,
      }));

    setAudioList(activeList);
  }, [audiosData]);

  // === Tự động điền audio đã liên kết ===
  useEffect(() => {
    if (pageAudiosData?.content && pageAudiosData.content.length > 0) {
      const firstPageAudio = pageAudiosData.content[0];
      if (firstPageAudio.audioId) {
        setSelectedAudio(firstPageAudio.audioId);
        setPageAudioId(firstPageAudio.pageAudioId || "");
        setShowAudioForm(true);
      }
    }
  }, [pageAudiosData]);

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
      // 1️⃣ Cập nhật nội dung trang
      await updatePage.mutateAsync({
        id: pageId,
        data: {
          pageNumber,
          content,
          chapterId,
          isActived: "ACTIVE",
        },
      });

      // 2️⃣ Cập nhật liên kết audio nếu có
      if (showAudioForm && selectedAudio && pageAudioId) {
        await updatePageAudio.mutateAsync({
          id: pageAudioId,
          data: {
            pageId,
            audioId: selectedAudio,
          },
        });
      }

      toast({
        title: "Cập nhật thành công",
        description: "Trang đã được lưu thành công.",
      });
      navigate(-1);
    } catch (err: any) {
      console.error("❌ Lỗi khi lưu:", err);
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
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <h2 className="text-white text-lg font-medium">Chỉnh sửa nội dung chữ</h2>
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
                {showAudioForm ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAudioForm ? "Ẩn" : "Thêm audio"}
              </Button>
            </div>

            {showAudioForm && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Audio</label>
                  <Select value={selectedAudio} onValueChange={setSelectedAudio}>
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="-- Chọn audio --" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioList.map((audio) => (
                        <SelectItem key={audio.id} value={audio.id}>
                          {audio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAudio && (
                  <audio
                    controls
                    src={audioList.find((f) => f.id === selectedAudio)?.url || ""}
                    className="w-full mt-2"
                  />
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
                disabled={updatePage.isPending || updatePageAudio.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {updatePage.isPending || updatePageAudio.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
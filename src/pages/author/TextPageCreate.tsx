import { useState } from "react";
import { Menu, X, Plus, Minus } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCreatePage, useGetAllPages } from "@/services/BookManageService"; // Thêm useGetAllPages
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const GOOGLE_VOICES = [
  { name: "Zephyr", label: "Bright, Higher pitch" },
  { name: "Puck", label: "Upbeat, Middle pitch" },
  { name: "Charon", label: "Informative, Lower pitch" },
  { name: "Kore", label: "Firm, Middle pitch" },
  { name: "Fenrir", label: "Excitable, Lower middle" }
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "vi", label: "Vietnamese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
];

export default function TextPageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const createPage = useCreatePage();
  const { data: pagesResp } = useGetAllPages(chapterId ? { chapterId } : undefined); // Lấy danh sách trang

  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");

  // === Audio fields ===
  const [showAudioForm, setShowAudioForm] = useState(false);
  const [audioData, setAudioData] = useState({
    text: "", // The text to convert to speech
    voiceName: GOOGLE_VOICES[0].name,
    title: "",
    language: LANGUAGES[0].code,
    format: "wav", // Default format
    model: "gemini-2.5-flash-preview-tts" // Default model
  });

  const handleAudioChange = (field: string, value: string) => {
    setAudioData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Kiểm tra thiếu thông tin
    if (!chapterId || !content) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số trang và nội dung trước khi lưu.",
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra trùng số trang
    const list = Array.isArray(pagesResp)
      ? pagesResp
      : Array.isArray((pagesResp as any)?.content)
      ? (pagesResp as any).content
      : [];
    const duplicate = list.some(
      (p: any) => Number(p.pageNumber) === Number(pageNumber) && p.isActived !== "INACTIVE"
    );
    if (duplicate) {
      toast({
        title: "Trùng số trang",
        description: `Đã tồn tại trang số ${pageNumber} trong chương này. Vui lòng chọn số trang khác.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createPage.mutateAsync({
        pageNumber,
        content,
        chapterId: chapterId || "",
        isActived: "ACTIVE",
        // Nếu có audio thì có thể gửi kèm (nếu backend hỗ trợ)
        // audio: showAudioForm ? audioData : null,
      });
      toast({
        title: "Tạo trang thành công",
        description: "Trang mới đã được thêm vào chương.",
      });
      navigate(`/author/chapters/${chapterId}/pages`);
    } catch {
      toast({
        title: "Tạo thất bại",
        description: "Không thể tạo trang, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white hover:bg-white/10"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
              <div className="ml-4 text-white">
                <div className="text-sm font-medium">Tạo trang chữ mới</div>
              </div>
            </div>
          </div>
        </header>

        {/* Form section */}
        <div className="flex-1 overflow-auto p-8 bg-[#1a2332]">
          <div className="mx-auto bg-white rounded-xl shadow-xl p-8">
            <h1 className="text-2xl font-semibold mb-6 text-gray-900">
              Nhập thông tin trang chữ
            </h1>

            {/* Page number */}
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

            {/* Content */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Nội dung
              </label>
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

            {/* Add Audio button */}
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

            {/* Audio form */}
            {showAudioForm && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
                <div className="col-span-2">
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Text for TTS</label>
                  <Textarea
                    value={audioData.text}
                    onChange={(e) => handleAudioChange("text", e.target.value)}
                    placeholder="Enter the text you want to convert to speech..."
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Voice</label>
                  <Select
                    value={audioData.voiceName}
                    onValueChange={(value) => handleAudioChange("voiceName", value)}
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOOGLE_VOICES.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Language</label>
                  <Select
                    value={audioData.language}
                    onValueChange={(value) => handleAudioChange("language", value)}
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Title</label>
                  <Input
                    type="text"
                    value={audioData.title}
                    onChange={(e) => handleAudioChange("title", e.target.value)}
                    placeholder="Audio title"
                    className="bg-white border-gray-300"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Format</label>
                    <Input
                      type="text"
                      value={audioData.format}
                      disabled
                      className="bg-gray-100 border-gray-300"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Model</label>
                    <Input
                      type="text"
                      value={audioData.model}
                      disabled
                      className="bg-gray-100 border-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <Button
                variant="ghost"
                onClick={() => navigate(`/author/chapters/${chapterId}/pages`)}
                className="text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={createPage.isPending}
              >
                {createPage.isPending ? "Đang tạo..." : "Tạo trang"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
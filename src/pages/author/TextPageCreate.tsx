// /mnt/data/TextPageCreate.tsx
import { useState } from "react";
import { Menu, X, Plus, Minus } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCreatePage, useGetAllPages } from "@/services/BookManageService";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

// ====== TTS imports ======
import { useGenerateTTS } from "@/services/AIService"; // hook gọi /audios/tts

// Giọng + mô tả (tiếng Việt)
const VOICE_OPTIONS: { name: string; desc: string }[] = [
  { name: "Zephyr",        desc: "Sáng, tông cao" },
  { name: "Puck",          desc: "Sôi nổi, tông trung" },
  { name: "Charon",        desc: "Điềm đạm, tông trầm" },
  { name: "Kore",          desc: "Dứt khoát, tông trung" },
  { name: "Fenrir",        desc: "Hào hứng, hơi trầm" },
  { name: "Leda",          desc: "Ấm áp, thân thiện" },
  { name: "Orus",          desc: "Trầm, uy nghiêm" },
  { name: "Aoede",         desc: "Mềm mại, thư thái" },
  { name: "Callirrhoe",    desc: "Biểu cảm, kể chuyện" },
  { name: "Autonoe",       desc: "Trung tính, cân bằng" },
  { name: "Enceladus",     desc: "Rõ ràng, chính xác" },
  { name: "Iapetus",       desc: "Rền, vang" },
  { name: "Umbriel",       desc: "Êm, dịu" },
  { name: "Algieba",       desc: "Mượt, tự nhiên" },
  { name: "Despina",       desc: "Nhẹ, gọn" },
  { name: "Erinome",       desc: "Vui tươi, năng lượng" },
  { name: "Algenib",       desc: "Trang nhã, chuẩn mực" },
  { name: "Rasalgethi",    desc: "Mạnh mẽ, kịch tính" },
  { name: "Laomedeia",     desc: "Nhẹ nhàng, tinh tế" },
  { name: "Achernar",      desc: "Gần gũi, conversational" },
  { name: "Alnilam",       desc: "Mượt, tông trung" },
  { name: "Schedar",       desc: "Chậm rãi, bình tĩnh" },
  { name: "Gacrux",        desc: "Ấm, nam trầm" },
  { name: "Pulcherrima",   desc: "Sáng, lanh lợi" },
  { name: "Achird",        desc: "Trung tính, thân thiện" },
  { name: "Zubenelgenubi", desc: "Kể chuyện, rõ ràng" },
  { name: "Vindemiatrix",  desc: "Ổn định, nhiều thông tin" },
  { name: "Sadachbia",     desc: "Nhẹ, thư giãn" },
  { name: "Sadaltager",    desc: "Tròn trịa, cân bằng" },
  { name: "Sulafat",       desc: "Gần gũi, ấm" },
];

// Chỉ en & vi
const LANGUAGES = [
  { code: "en", label: "Tiếng Anh" },
  { code: "vi", label: "Tiếng Việt" },
];

// Hàm lọc ký tự đặc biệt: chỉ giữ chữ (mọi ngôn ngữ), số và khoảng trắng
function sanitizeTitle(input: string) {
  try {
    return input.replace(/[^\p{L}\p{N}\s]/gu, "");
  } catch {
    // Fallback nếu môi trường không hỗ trợ Unicode property escapes
    return input.replace(/[^0-9A-Za-zÀ-ỹà-ỹ\s]/g, "");
  }
}

export default function TextPageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createPage = useCreatePage();
  const { data: pagesResp } = useGetAllPages(chapterId ? { chapterId } : undefined);

  // === TTS hook ===
  const generateTTSMutation = useGenerateTTS();

  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");

  // === Audio fields (optional) ===
  const [showAudioForm, setShowAudioForm] = useState(false);
  const [audioData, setAudioData] = useState({
    text: "",
    voiceName: VOICE_OPTIONS[0].name, // "Zephyr" mặc định
    title: "",
    language: LANGUAGES[0].code,
    // 2 field mặc định, không render UI:
    format: "wav" as const,
    model: "gemini-2.5-flash-preview-tts" as const,
  });

  const handleAudioChange = (field: string, value: string) => {
    setAudioData((prev) => ({ ...prev, [field]: value }));
  };

  const getUserId = () => {
    return localStorage.getItem("userId") || "1";
  };

  const handleSubmit = async () => {
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
      // Nếu bật tạo audio và có text => gọi TTS trước
      if (showAudioForm && audioData.text.trim()) {
        const userId = getUserId();

        await generateTTSMutation.mutateAsync({
          userId,
          meta: {
            text: audioData.text,
            voiceName: audioData.voiceName,
            title: audioData.title || `page-${pageNumber}-audio`,
            language: audioData.language,
            format: audioData.format, // "wav"
            model: audioData.model,   // "gemini-2.5-flash-preview-tts"
          },
        });

        toast({
          title: "Đã tạo audio",
          description: "Audio TTS đã được sinh thành công.",
        });
      }

      // Tạo trang chữ
      await createPage.mutateAsync({
        pageNumber,
        content,
        chapterId: chapterId || "",
        isActived: "ACTIVE",
      });

      toast({
        title: "Tạo trang thành công",
        description: "Trang mới đã được thêm vào chương.",
      });
      navigate(`/author/chapters/${chapterId}/pages`);
    } catch (err: any) {
      toast({
        title: "Tạo thất bại",
        description:
          err?.response?.data?.message ||
          "Không thể tạo trang hoặc audio, vui lòng thử lại.",
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

            {/* Audio form (Title -> Text -> Voice & Language) */}
            {showAudioForm && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gray-50 space-y-4">
                {/* Title (full width) */}
                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Title</label>
                  <Input
                    type="text"
                    value={audioData.title}
                    onChange={(e) =>
                      handleAudioChange("title", sanitizeTitle(e.target.value))
                    }
                    placeholder="Audio title (chỉ chữ, số và khoảng trắng)"
                    className="bg-white border-gray-300"
                  />
                </div>

                {/* Text for TTS (full width) */}
                <div>
                  <label className="block text-gray-700 mb-1 text-sm font-medium">Text for TTS</label>
                  <Textarea
                    value={audioData.text}
                    onChange={(e) => handleAudioChange("text", e.target.value)}
                    placeholder="Nhập nội dung cần chuyển thành giọng nói..."
                    className="min-h-[140px]"
                  />
                </div>

                {/* Voice & Language (same row on md+) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Voice</label>
                    <Select
                      value={audioData.voiceName}
                      onValueChange={(value) => handleAudioChange("voiceName", value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue placeholder="Chọn giọng" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.name} value={opt.name} className="py-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{opt.name}</span>
                              <span className="text-xs text-muted-foreground">{opt.desc}</span>
                            </div>
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
                        <SelectValue placeholder="Chọn ngôn ngữ" />
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
                </div>
                {/* format & model bị ẩn — giữ giá trị mặc định trong state */}
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
                disabled={createPage.isPending || generateTTSMutation.isPending}
              >
                {createPage.isPending || generateTTSMutation.isPending ? "Đang tạo..." : "Tạo trang"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

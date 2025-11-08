import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useGenerateTTS } from "@/services/AIService";

const VOICE_OPTIONS = [
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

const LANGUAGES = [
  { code: "en", label: "Tiếng Anh" },
  { code: "vi", label: "Tiếng Việt" },
];

export default function AudioCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [audioData, setAudioData] = useState({
    title: "",
    text: "",
    voiceName: VOICE_OPTIONS[0].name,
    language: LANGUAGES[0].code,
    format: "wav",
    model: "gemini-2.5-flash-preview-tts",
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId?: string }>();
  const generateTTS = useGenerateTTS();

  const getUserId = () => localStorage.getItem("userId") || "1";

  const handleSubmit = async () => {
    if (!audioData.text.trim()) {
      toast({
        title: "Thiếu nội dung",
        description: "Vui lòng nhập nội dung để tạo audio.",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateTTS.mutateAsync({
        userId: getUserId(),
        meta: {
          text: audioData.text,
          voiceName: audioData.voiceName,
          title: audioData.title || "audio-tts",
          language: audioData.language,
          format: audioData.format,
          model: audioData.model,
        },
      });

      toast({
        title: "Tạo audio thành công",
        description: "Audio TTS đã được sinh thành công.",
      });
      navigate(`/author/chapters/${chapterId}/pages`);
    } catch (err: any) {
      toast({
        title: "Lỗi khi tạo audio",
        description: err?.response?.data?.message || "Không thể tạo audio, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
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
                <div className="text-sm font-medium">Tạo Audio (TTS)</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-[#1a2332]">
          <div className="mx-auto bg-white rounded-xl shadow-xl p-8 space-y-6">
            <h1 className="text-2xl font-semibold text-gray-900">Nhập thông tin audio</h1>

            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Title</label>
              <Input
                value={audioData.title}
                onChange={(e) => setAudioData({ ...audioData, title: e.target.value })}
                placeholder="Tên audio..."
                className="bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Text</label>
              <Textarea
                value={audioData.text}
                onChange={(e) => setAudioData({ ...audioData, text: e.target.value })}
                placeholder="Nhập nội dung cần chuyển thành giọng nói..."
                className="min-h-[150px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1 text-sm font-medium">Voice</label>
                <Select
                  value={audioData.voiceName}
                  onValueChange={(value) => setAudioData({ ...audioData, voiceName: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Chọn giọng" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.name} value={opt.name}>
                        {opt.name} — {opt.desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-gray-700 mb-1 text-sm font-medium">Language</label>
                <Select
                  value={audioData.language}
                  onValueChange={(value) => setAudioData({ ...audioData, language: value })}
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
                disabled={generateTTS.isPending}
              >
                {generateTTS.isPending ? "Đang tạo..." : "Tạo Audio"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

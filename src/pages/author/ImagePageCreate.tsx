import { useState } from "react";
import { Menu, X, Upload } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import AIPromptPanel from "@/components/author/AIPromptPanel";
import {
  useCreatePage
} from "@/services/BookManageService";
import {
  useCreateAIGenerationTarget,
  useCreateIllustration,
  useCreatePageIllustration,
} from "@/services/AIService";

export default function ImagePageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createPage = useCreatePage();
  const createIllustration = useCreateIllustration();
  const createAIGenerationTarget = useCreateAIGenerationTarget();
  const createPageIllustration = useCreatePageIllustration();

  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiImage, setAIImage] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"UPLOAD" | "AI" | null>(null);
  const [aiMeta, setAiMeta] = useState<{ imageUrl?: string; aiGeneration?: any } | null>(null);

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setSourceType("UPLOAD");
    }
  };

  const handleAIImageGenerated = (payload: { imageUrl: string; aiGeneration?: any } | string) => {
    // backward-compat: AIPromptPanel previously sent string; handle both
    if (typeof payload === "string") {
      setAIImage(payload);
      setSelectedImage(payload);
      setSourceType("AI");
      setAiMeta({ imageUrl: payload });
    } else {
      setAIImage(payload.imageUrl || null);
      setSelectedImage(payload.imageUrl || null);
      setSourceType("AI");
      setAiMeta(payload);
    }
  };

  const handleSave = async () => {
    if (!chapterId || !selectedImage) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số trang và chọn ảnh trước khi lưu.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1️⃣ Tạo page mới
      const page = await createPage.mutateAsync({
        pageNumber,
        content: selectedImage,
        chapterId,
        isActived: "ACTIVE",
      });

      // 2️⃣ Nếu là ảnh AI → nếu có aiGeneration từ bước generate thì gắn target PAGE
      if (sourceType === "AI" && aiMeta?.aiGeneration?.aiGenerationId) {
        try {
          await createAIGenerationTarget.mutateAsync([
            {
              aiGenerationId: aiMeta.aiGeneration.aiGenerationId,
              targetType: "PAGE",
              targetRefId: page.pageId!,
              isActived: "ACTIVE",
            },
          ]);
        } catch (e) {
          console.error("Failed to create AI generation target for page", e);
        }
      }

      // 3️⃣ Lưu illustration (ảnh trang) vào bảng Illustrations
      const illustrations = await createIllustration.mutateAsync([
        {
          imageUrl: selectedImage,
          style: "REALISTIC",
          format: "png",
          width: 1024,
          height: 1024,
          title: "Page Illustration",
          isActived: "ACTIVE",
        },
      ]);

      // backend có thể trả mảng → lấy id đầu tiên
      const savedIll = Array.isArray(illustrations) ? illustrations[0] : illustrations;
      const illustrationId = savedIll?.illustrationId;

      // 4️⃣ Gắn illustration vào page (bảng PageIllustrations)
      if (illustrationId && page.pageId) {
        try {
          await createPageIllustration.mutateAsync([
            {
              pageId: page.pageId!,
              illustrationId,
            },
          ]);
        } catch (e) {
          console.error("Failed to link illustration to page", e);
        }
      }

      toast({ title: "Tạo trang ảnh thành công" });
      navigate(`/author/chapters/${chapterId}/pages`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Lỗi khi lưu trang",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main Content */}
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
                <div className="text-sm font-medium">Tạo trang ảnh mới</div>               
              </div>
            </div>
          </div>
        </header>

        {/* Body: chia 2 cột */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: AIPromptPanel */}
          <div className="w-1/2 bg-[#1a2332] p-6 overflow-auto border-r border-white/10">
            <AIPromptPanel onGenerated={handleAIImageGenerated} />
          </div>

          {/* Right: Form tạo trang */}
          <div className="w-1/2 bg-[#0f172a] p-8 overflow-auto">
            <h2 className="text-xl font-semibold mb-6">Thông tin trang ảnh</h2>

            {/* Page number */}
            <div className="mb-5">
              <label className="block text-sm mb-2 text-gray-300">Số trang</label>
              <Input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(Number(e.target.value))}
                className="bg-white text-black"
              />
            </div>

            {/* Ảnh preview */}
            {selectedImage && (
              <div className="mb-6">
                <label className="block text-sm mb-2 text-gray-300">Ảnh đã chọn</label>
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="rounded-lg border border-white/20 shadow-md w-full max-h-[400px] object-contain"
                />
              </div>
            )}

            {/* Nút chọn ảnh */}
            <div className="flex gap-4 mb-6">
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center"
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" /> Import ảnh từ máy
              </Button>
              <input
                type="file"
                id="fileInput"
                accept="image/*"
                className="hidden"
                onChange={handleImportImage}
              />

              <Button
                variant="outline"
                className="text-black border-white hover:bg-white/10"
                onClick={() => aiImage && setSelectedImage(aiImage)}
                disabled={!aiImage}
              >
                Dùng ảnh từ AI
              </Button>
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={createPage.isPending}
            >
              {createPage.isPending ? "Đang lưu..." : "Lưu trang ảnh"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

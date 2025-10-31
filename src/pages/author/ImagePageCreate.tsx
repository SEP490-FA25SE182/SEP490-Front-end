import { useState } from "react";
import { Menu, X, Upload } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import AIPromptPanel from "@/components/author/AIPromptPanel";
import {
  useCreateAIGenerationTarget,
  useCreatePageIllustration,
} from "@/services/AIService";
import { useCreatePage, useGetAllPages } from "@/services/BookManageService";
import { UploadService } from "@/services/UploadService";

export default function ImagePageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(false);

  const createPageIllustration = useCreatePageIllustration();
  const createPage = useCreatePage();
  const createAIGenerationTarget = useCreateAIGenerationTarget();

  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiImage, setAIImage] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"UPLOAD" | "AI" | null>(null);
  const [aiMeta, setAiMeta] = useState<{ imageUrl?: string; aiGeneration?: any; illustrationId?: string } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { data: pagesResp } = useGetAllPages(chapterId ? { chapterId } : undefined);

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setUploadedFile(file); // ✅ Lưu file để upload Firebase
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

    // --- new: check duplicate page when saving uploaded image OR AI image ---
    // Ngăn không cho lưu nếu đã có trang cùng số trong chương (active)
    if (sourceType === "UPLOAD" || sourceType === "AI") {
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
    }
    // --- end check ---

    try {
      let finalImageUrl = selectedImage;

      // ✅ 1. Upload lên Firebase nếu là ảnh từ máy
      if (sourceType === "UPLOAD" && uploadedFile) {
        toast({ title: "Đang upload ảnh lên Firebase..." });
        const gsUrl = await UploadService.uploadImageToFirebase(uploadedFile, "pages");
        finalImageUrl = gsUrl;
        console.log("Firebase uploaded image:", gsUrl);
      }

      // 2️⃣ Tạo page mới
      const page = await createPage.mutateAsync({
        pageNumber,
        content: finalImageUrl,
        chapterId,
        isActived: "ACTIVE",
      });

      // 3️⃣ Tùy theo chế độ (aiPanelOpen) và nguồn ảnh (UPLOAD / AI):
      // - Nếu ảnh import từ máy (UPLOAD) -> chỉ lưu Page (không gọi createIllustration ở đây vì đã loại bỏ)
      // - Nếu ảnh từ AI (AI) -> tạo AI generation target (nếu có aiGenerationId) và gắn PageIllustration (nếu có illustrationId)
      if (sourceType === "AI") {
        // Nếu có aiGenerationId → tạo target liên kết với PAGE
        if (aiMeta?.aiGeneration?.aiGenerationId) {
          try {
            await createAIGenerationTarget.mutateAsync([
              {
                aiGenerationId: aiMeta.aiGeneration.aiGenerationId,
                // backend có thể yêu cầu targetType/targetRefId; thêm nếu cần
                isActived: "ACTIVE",
              },
            ]);
          } catch (e) {
            console.error("Failed to create AI generation target for page", e);
          }
        }

        // Nếu backend trả illustrationId trong aiMeta -> gắn PageIllustration
        const illustrationId =
          aiMeta?.illustrationId ||
          aiMeta?.aiGeneration?.illustrationId ||
          aiMeta?.aiGeneration?.inputImageId; // fallback keys

        if (illustrationId) {
          try {
            await createPageIllustration.mutateAsync([
              { pageId: page.pageId!, illustrationId },
            ]);
          } catch (e) {
            console.error("Failed to attach existing illustration to page", e);
          }
        } else {
          // Nếu không có illustrationId, báo lên author (không gọi createIllustration vì đã loại bỏ)
          toast({
            title: "Thiếu illustrationId",
            description:
              "Ảnh AI đã được tạo nhưng backend không trả illustrationId; không thể gắn ảnh vào trang tự động.",
            variant: "destructive",
          });
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

            {/* AI Panel toggle moved to the right */}
            <div className="flex items-center">
              <Button
                size="sm"
                onClick={() => setAiPanelOpen((s) => !s)}
                className="ml-2 bg-purple-600 hover:bg-purple-700"
              >
                {aiPanelOpen ? "Đóng AI Panel" : "Mở AI Panel"}
              </Button>
            </div>
          </div>
        </header>

        {/* Body: chia 2 cột */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: AIPromptPanel (ẩn/hiện theo aiPanelOpen) */}
          {aiPanelOpen && (
            <div className="w-1/2 bg-[#1a2332] p-6 overflow-auto border-r border-white/10">
              <AIPromptPanel onGenerated={handleAIImageGenerated} />
            </div>
          )}

          {/* Right: Form tạo trang - chiếm full width nếu panel ẩn */}
          <div className={`${aiPanelOpen ? "w-1/2" : "w-full"} bg-[#0f172a] p-8 overflow-auto`}>
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

            {/* Nút Lưu và Hủy */}
            <div className="flex gap-4 mt-8">
              <Button
                variant="outline"
                className="flex-1 text-gray-600 hover:bg-gray-100"
                onClick={() => navigate(`/author/chapters/${chapterId}/pages`)}
                disabled={createPage.isPending}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={createPage.isPending}
              >
                {createPage.isPending ? "Đang lưu..." : "Lưu trang ảnh"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import AIPromptPanel from "@/components/author/AIPromptPanel";
import { UploadService } from "@/services/FirebaseService";
import { useCreateIllustration } from "@/services/AIService";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUserId } from "@/utils/authStorage";
import { getUserByEmail } from "@/services/UserService";

export default function ImageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutateAsync: createIllustration } = useCreateIllustration();

  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // --- NEW: authorId state + auth context ---
  const { user } = useAuth();
  const [authorId, setAuthorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuthorId = async () => {
      try {
        const uidFromStorage = getCurrentUserId();
        if (uidFromStorage) {
          setAuthorId(uidFromStorage);
          return;
        }

        if (user?.userId) {
          setAuthorId(user.userId);
          return;
        }

        if (user?.email) {
          const currentUser = await getUserByEmail(user.email);
          if (currentUser?.userId) {
            setAuthorId(currentUser.userId);
            return;
          }
        }

        // Nếu không lấy được thì để null (khi upload sẽ báo)
      } catch (error) {
        console.error("❌ Lỗi khi xác định authorId:", error);
      }
    };

    fetchAuthorId();
  }, [user]);

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setUploadedFile(file);
    }
  };

  const handleUploadFirebase = async () => {
    if (!uploadedFile) {
      toast({
        title: "Chưa chọn ảnh",
        description: "Vui lòng chọn ảnh trước khi upload.",
        variant: "destructive",
      });
      return;
    }

    if (!authorId) {
      toast({
        title: "Không tìm thấy tác giả",
        description: "Không thể xác định authorId. Vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({ title: "Đang upload ảnh lên hệ thống..." });
      const gsUrl = await UploadService.uploadImageToFirebase(uploadedFile, "pages");
      console.log("Firebase uploaded:", gsUrl);

      const illustrationData = [
        {
          imageUrl: gsUrl,
          style: "REALISTIC",
          format: "png",
          width: 1024,
          height: 1024,
          title: uploadedFile.name,
          isActived: "ACTIVE",
          userId: authorId, // <-- thêm userId tác giả
        },
      ];

      await createIllustration(illustrationData);

      toast({
        title: "Upload thành công",
        description: "Ảnh đã được lưu lên hệ thống và backend.",
      });

      setSelectedImage(null);
      setUploadedFile(null);
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload thất bại",
        description: "Không thể upload ảnh, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleAIImageGenerated = () => {
    toast({
      title: "Gửi ảnh vào hệ thống thành công",
      description: "Ảnh AI đã được tạo và lưu tự động.",
    });
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      {/* Sidebar luôn hiển thị */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Khu vực nội dung chính */}
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
                {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
              </Button>
              <div className="ml-4 text-white text-sm font-medium">
                {aiPanelOpen ? "Tạo ảnh bằng AI" : "Upload ảnh thủ công"}
              </div>
            </div>

            {aiPanelOpen ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="bg-white text-gray-800 hover:bg-gray-200"
                  onClick={() => navigate(`/author/chapters/${chapterId}/pages`)}
                >
                  Quay về danh sách trang
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setAiPanelOpen(false)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Đóng AI Panel
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setAiPanelOpen(true)}
                className="bg-linear-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:text-white"
              >
                Mở AI Panel
              </Button>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-[#0f172a] p-8">
          {aiPanelOpen ? (
            // ✅ Khi mở AI Panel → chiếm full phần nội dung (giữ nguyên sidebar)
            <div className="h-full overflow-auto">
              <AIPromptPanel onGenerated={handleAIImageGenerated} />
            </div>
          ) : (
            // ✅ Giao diện upload thủ công
            <>
              <h2 className="text-xl font-semibold mb-6">Upload ảnh từ máy</h2>

              {/* Preview */}
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

              {/* Buttons */}
              <div className="flex gap-4 mb-6">
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center"
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" /> Chọn ảnh
                </Button>
                <input
                  type="file"
                  id="fileInput"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImportImage}
                />
              </div>

              {/* Upload */}
              <div className="flex gap-4 mt-8">
                <Button
                  variant="outline"
                  className="flex-1 text-gray-600 hover:bg-gray-100"
                  onClick={() => navigate(-1)}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleUploadFirebase}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Upload
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

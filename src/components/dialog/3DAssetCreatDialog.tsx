import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useGenerateAsset3D } from "@/services/ARService";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getUserByEmail } from "@/services/UserService";
import { getCurrentUserId } from "@/utils/authStorage";
import SpinningCubeLoader from "@/components/loading/SpinningCubeLoader";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  markerId?: string;
  userId?: string; // optional override; if not provided will try to resolve current user
  onCreated?: () => void;
}

const Asset3DCreateDialog: React.FC<Props> = ({ isOpen, onClose, markerId, userId: overrideUserId, onCreated }) => {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<"GLB" | "FBX" | "OBJ">("GLB");
  const [fileName, setFileName] = useState("");
  const [withColor, setWithColor] = useState(false);
  const [texturePrompt, setTexturePrompt] = useState("");
  const [textureImageUrl, setTextureImageUrl] = useState("");
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(overrideUserId);
  const { toast } = useToast();
  const generateAsset = useGenerateAsset3D();
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setPrompt("");
      setFormat("GLB");
      setFileName("");
      setWithColor(false);
      setTexturePrompt("");
      setTextureImageUrl("");
    }
  }, [isOpen, markerId]);

  // Resolve userId similar to BookCreationWizard:
  useEffect(() => {
    let mounted = true;
    const fetchUserId = async () => {
      try {
        // 1) override from props
        if (overrideUserId) {
          if (mounted) setResolvedUserId(overrideUserId);
          return;
        }

        // 2) from authStorage utils (localStorage)
        const uidFromStorage = getCurrentUserId();
        if (uidFromStorage) {
          if (mounted) setResolvedUserId(uidFromStorage);
          return;
        }

        // 3) from AuthContext user
        if (user?.userId) {
          if (mounted) setResolvedUserId(user.userId);
          return;
        }

        // 4) fallback via email -> getUserByEmail
        if (user?.email) {
          const currentUser = await getUserByEmail(user.email);
          if (currentUser?.userId && mounted) {
            setResolvedUserId(currentUser.userId);
            return;
          }
        }

        // could not resolve
        if (mounted) {
          setResolvedUserId(undefined);
          toast({
            title: "Không tìm thấy tác giả",
            description: "Không xác định được userId hiện tại. Vui lòng đăng nhập lại nếu cần.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Lỗi khi lấy userId:", err);
        if (mounted) {
          toast({
            title: "Lỗi",
            description: "Không thể xác định userId hiện tại.",
            variant: "destructive",
          });
        }
      }
    };

    fetchUserId();
    return () => {
      mounted = false;
    };
  }, [overrideUserId, user, toast]);

  const normalizeFileName = (name: string) =>
    name
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9\-_\.]/g, "");

  const handleSubmit = async () => {
    const theUserId = resolvedUserId;
    if (!markerId) {
      toast({
        title: "Thiếu marker",
        description: "Vui lòng tạo hoặc chọn marker trước khi tạo 3D model.",
        variant: "destructive",
      });
      return;
    }
    if (!prompt.trim()) {
      toast({
        title: "Thiếu prompt",
        description: "Vui lòng mô tả (prompt) cho 3D model.",
        variant: "destructive",
      });
      return;
    }
    if (!fileName.trim()) {
      toast({
        title: "Thiếu tên file",
        description: "Vui lòng nhập fileName cho model (khoảng cách sẽ được chuyển thành '_').",
        variant: "destructive",
      });
      return;
    }
    if (withColor && !texturePrompt.trim() && !textureImageUrl.trim()) {
      toast({
        title: "Thiếu texture",
        description: "Khi chọn có màu, vui lòng nhập texturePrompt hoặc textureImageUrl.",
        variant: "destructive",
      });
      return;
    }

    if (!theUserId) {
      toast({
        title: "Không tìm thấy userId",
        description: "Không thể xác định userId để gắn cho asset. Vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }

    const meta: any = {
      markerId,
      userId: theUserId,
      prompt: prompt.trim(),
      format,
      quality: "balanced", // mặc định ẩn trên UI
      fileName: normalizeFileName(fileName),
    };

    if (withColor) {
      meta.texturePrompt = texturePrompt.trim() || undefined;
      meta.textureImageUrl = textureImageUrl.trim() || undefined;
    }

    try {
      await generateAsset.mutateAsync(meta);
      toast({
        title: "Tạo 3D model thành công",
        description: "Yêu cầu tạo 3D model đã gửi. Vui lòng kiểm tra danh sách asset sau vài phút.",
      });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Tạo asset3D thất bại:", err);
      toast({
        title: "Tạo thất bại",
        description: "Đã xảy ra lỗi khi gửi yêu cầu tạo 3D model.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo 3D Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Marker ID is intentionally hidden from UI, but markerId prop is required for submission */}

          <div>
            <Label className="mb-2">Prompt (mô tả model)</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="ví dụ: a magical owl glowing with blue aura..." />
          </div>

          <div>
            <Label className="mb-2">Định dạng</Label>
            <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full bg-input px-3 py-2 rounded">
              <option value="GLB">GLB</option>
              <option value="FBX">FBX</option>
              <option value="OBJ">OBJ</option>
            </select>
          </div>

          <div>
            <Label className="mb-2">File name (nhập theo khoảng cách '_')</Label>
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="ví dụ: magical_owl" />
          </div>

          <div className="flex items-center gap-3">
            <input id="withColor" type="checkbox" checked={withColor} onChange={(e) => setWithColor(e.target.checked)} />
            <label htmlFor="withColor" className="text-sm text-black">Muốn 3D model có màu / texture?</label>
          </div>

          {withColor && (
            <>
              <div>
                <Label className="mb-2">Texture prompt (material)</Label>
                <Input value={texturePrompt} onChange={(e) => setTexturePrompt(e.target.value)} placeholder="Mẫu: wooden planks with gold bands, cartoon look" />
              </div>

              <div>
                <Label className="mb-2">URL ảnh texture</Label>
                <Input value={textureImageUrl} onChange={(e) => setTextureImageUrl(e.target.value)} placeholder="URL ảnh tham khảo cho texture (liên quan đến prompt)" />
              </div>
            </>
          )}

          <div className="text-xs text-gray-700">
            Ghi chú: textureImageUrl / texturePrompt nên liên quan đến Prompt chính để kết quả phù hợp.
          </div>
        </div>

        {/* 🔄 Loader cube hiển thị khi đang gửi request */}
        {generateAsset.isPending && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <SpinningCubeLoader />
            <p className="text-xs text-gray-600 text-center">
              Đang tạo 3D model, vui lòng chờ...
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">Huỷ</Button>
          <Button onClick={handleSubmit} disabled={generateAsset.isPending}>
            {generateAsset.isPending ? "Đang gửi..." : "Tạo 3D model"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Asset3DCreateDialog;
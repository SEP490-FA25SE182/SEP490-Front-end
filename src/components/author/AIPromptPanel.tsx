import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  useCreateAIGeneration,
  useCreateAIGenerationTarget,
  useGenerateIllustrationWithImage,
} from "@/services/AIService";
import SpinningCubeLoader from "@/components/loading/SpinningCubeLoader";

/* 🔹 ADD: dùng toast */
import { useToast } from "@/components/ui/use-toast";
/* 🔹 ADD: gọi API trừ tiền */
import {
  TransactionService,
  type WalletPayRequest,
} from "@/services/TransactionService";
/* 🔹 ADD: lấy userId giống BookCreationWizard */
import { getCurrentUserId } from "@/utils/authStorage";

interface AIPromptPanelProps {
  onGenerated?: (payload: { imageUrl: string; aiGeneration?: any }) => void;
}

/** Tính width/height theo aspectRatio, giới hạn cạnh dài = 1024 */
function getDimensionsForAspect(aspect: string, maxSide = 1024) {
  const [wStr, hStr] = aspect.split(":");
  const w = parseInt(wStr, 10);
  const h = parseInt(hStr, 10);
  if (!w || !h) {
    return { width: maxSide, height: maxSide };
  }

  // w:h là width:height. Cạnh dài = maxSide.
  if (w >= h) {
    // landscape
    return {
      width: maxSide,
      height: Math.round((maxSide * h) / w),
    };
  } else {
    // portrait
    return {
      width: Math.round((maxSide * w) / h),
      height: maxSide,
    };
  }
}

const DEFAULT_ASPECT = "2:3"; // ✅ mặc định 2:3
const DEFAULT_DIMS = getDimensionsForAspect(DEFAULT_ASPECT);

const AIPromptPanel: React.FC<AIPromptPanelProps> = ({ onGenerated }) => {
  const [form, setForm] = useState({
    modelName: "stable-diffusion-xl-1024-v1-0",
    prompt: "",
    negativePrompt: "",
    mode: "TEXT_TO_IMAGE",
    // ✅ width/height mặc định theo 2:3
    width: DEFAULT_DIMS.width,
    height: DEFAULT_DIMS.height,
    accept: "image/*",
    stylePreset: "PHOTOGRAPHIC",
    style: "Photographic",
    aspectRatio: DEFAULT_ASPECT, // ✅ 2:3
    format: "png",
    title: "",
    controlnetType: "",
    cfgScale: 8,
    strength: 1,
    seed: 77,
    durationMs: 1, // giữ nguyên
  });

  const [preview, setPreview] = useState<string | null>(null);

  const createAIGeneration = useCreateAIGeneration();
  const createAIGenerationTarget = useCreateAIGenerationTarget();
  const generateWithImage = useGenerateIllustrationWithImage();
  const { toast } = useToast(); // 🔹 ADD

  const getUserId = (): string => {
    // 🔹 ADD: ưu tiên lấy theo helper giống BookCreationWizard
    try {
      const uidFromStorage = getCurrentUserId();
      if (uidFromStorage) return uidFromStorage;
    } catch (e) {
      console.warn("getCurrentUserId error:", e);
    }

    // phần cũ giữ nguyên
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload?.userId || payload?.sub || payload?.id || "author-demo";
      }
    } catch {}
    return localStorage.getItem("userId") || "author-demo";
  };

  const handleGenerate = async () => {
    const userId = getUserId();

    if (!form.prompt || !form.modelName || !form.title) {
      alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    const meta = {
      modelName: form.modelName,
      prompt: form.prompt,
      negativePrompt: form.negativePrompt,
      mode: form.mode,
      width: Number(form.width),
      height: Number(form.height),
      accept: form.accept,
      stylePreset: form.stylePreset,
      style: form.style,
      aspectRatio: form.aspectRatio,
      format: form.format,
      title: form.title,
      controlnetType: form.controlnetType || undefined,
      cfgScale: form.cfgScale,
      strength: form.strength,
      seed: form.seed,
    };

    try {
      // 🔹 ADD: gọi API trừ tiền trước khi tạo ảnh
      const walletPayload: WalletPayRequest = {
        totalPrice: 1000,
        status: 3,
        userId,
        transType: "AI_IMAGE",
        isActived: "ACTIVE",
        paymentMethodId: "",
        walletId: ""
      };

      console.log("[walletPay] payload:", walletPayload);
      const walletRes = await TransactionService.walletPay(walletPayload);
      console.log("[walletPay] response:", walletRes);

      toast({
        title: "Thanh toán thành công",
        description: "Đã trừ 1.000đ từ ví của bạn.",
      });

      // 🔹 phần generate ảnh AI giữ nguyên
      const [genRes, aiGenRes] = await Promise.all([
        generateWithImage.mutateAsync({ userId, meta }),
        createAIGeneration.mutateAsync([
          {
            modelName: form.modelName,
            prompt: form.prompt,
            negativePrompt: form.negativePrompt,
            durationMs: form.durationMs,
            status: 0,
            userId,
            mode: form.mode,
            aspectRatio: form.aspectRatio,
            strength: form.strength,
            cfgScale: form.cfgScale,
            stylePreset: form.stylePreset,
            format: form.format,
            title: form.title || "AI Generated Image",
            style: form.style,
            isActived: "ACTIVE",
          },
        ]),
      ]);

      const imageUrl =
        genRes?.imageUrl ||
        genRes?.output?.[0]?.url ||
        genRes?.data?.[0]?.url ||
        genRes?.url ||
        null;

      const aiGenObj = Array.isArray(aiGenRes) ? aiGenRes[0] : aiGenRes;

      if (aiGenObj?.aiGenerationId) {
        await createAIGenerationTarget.mutateAsync([
          { aiGenerationId: aiGenObj.aiGenerationId },
        ]);
      }

      setPreview(imageUrl);
      onGenerated?.({ imageUrl: imageUrl || "", aiGeneration: aiGenObj });
    } catch (error) {
      console.error("Error generating AI image:", error);
      // 🔹 ADD: toast báo lỗi chung (thanh toán hoặc generate lỗi)
      toast({
        title: "Lỗi",
        description: "Thanh toán hoặc tạo ảnh thất bại. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5 text-white">
      <h2 className="text-lg font-semibold">AI Image Generator</h2>

      {/* Prompt */}
      <div>
        <Label className="mb-3">Prompt</Label>
        <Textarea
          required
          placeholder="Mô tả hình ảnh bạn muốn tạo..."
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Negative Prompt (optional) */}
      <div>
        <Label className="mb-3">Negative Prompt</Label>
        <Textarea
          placeholder="Mô tả những gì bạn KHÔNG muốn ảnh tạo ra... (tùy chọn)"
          value={form.negativePrompt}
          onChange={(e) =>
            setForm({ ...form, negativePrompt: e.target.value })
          }
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Title */}
      <div>
        <Label className="mb-3">Tên Ảnh</Label>
        <Input
          required
          placeholder="Tên ảnh được tạo"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Width & Height */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label className="mb-3">Chiều rộng</Label>
          <Input
            required
            type="number"
            value={form.width}
            onChange={(e) =>
              setForm({ ...form, width: Number(e.target.value) })
            }
            className="bg-transparent border-white/20 text-white"
          />
        </div>
        <div className="flex-1">
          <Label className="mb-3">Chiều cao</Label>
          <Input
            required
            type="number"
            value={form.height}
            onChange={(e) =>
              setForm({ ...form, height: Number(e.target.value) })
            }
            className="bg-transparent border-white/20 text-white"
          />
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <Label className="mb-3">Tỷ lệ khung hình</Label>
        <Select
          value={form.aspectRatio}
          onValueChange={(v) => {
            const dims = getDimensionsForAspect(v);
            setForm((prev) => ({
              ...prev,
              aspectRatio: v,
              width: dims.width,
              height: dims.height,
            }));
          }}
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="Tỷ lệ khung hình" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 (Square)</SelectItem>
            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
            <SelectItem value="2:3">2:3 (Portrait)</SelectItem>   {/* ✅ mới */}
            <SelectItem value="5:7">5:7 (A5 gần đúng)</SelectItem> {/* ✅ mới */}
          </SelectContent>
        </Select>
      </div>

      {/* CFG Scale */}
      <div>
        <Label className="mb-3">CFG Scale: {form.cfgScale}</Label>
        <Slider
          min={1}
          max={15}
          step={1}
          value={[form.cfgScale]}
          onValueChange={(v) => setForm({ ...form, cfgScale: v[0] })}
          className="w-full"
        />
      </div>

      {/* Seed */}
      <div>
        <Label className="mb-3">Seed</Label>
        <Input
          required
          type="number"
          value={form.seed}
          onChange={(e) => setForm({ ...form, seed: Number(e.target.value) })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* durationMs hidden */}
      <input type="hidden" value={form.durationMs} />

      {/* Style Preset */}
      <div>
        <Label className="mb-3">Style Ảnh</Label>
        <Select
          value={form.stylePreset}
          onValueChange={(v) =>
            setForm({ ...form, stylePreset: v, style: v.replace("_", " ") })
          }
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TILE_TEXTURE">Tile Texture</SelectItem>
            <SelectItem value="NEON_PUNK">Neon Punk</SelectItem>
            <SelectItem value="COMIC_BOOK">Comic Book</SelectItem>
            <SelectItem value="ENHANCE">Enhance</SelectItem>
            <SelectItem value="MODELING_COMPOUND">Modeling Compound</SelectItem>
            <SelectItem value="ANALOG_FILM">Analog Film</SelectItem>
            <SelectItem value="ANIME">Anime</SelectItem>
            <SelectItem value="ISOMETRIC">Isometric</SelectItem>
            <SelectItem value="PHOTOGRAPHIC">Photographic</SelectItem>
            <SelectItem value="LOW_POLY">Low Poly</SelectItem>
            <SelectItem value="LINE_ART">Line Art</SelectItem>
            <SelectItem value="_3D_MODEL">3D Model</SelectItem>
            <SelectItem value="ORIGAMI">Origami</SelectItem>
            <SelectItem value="CINEMATIC">Cinematic</SelectItem>
            <SelectItem value="PIXEL_ART">Pixel Art</SelectItem>
            <SelectItem value="DIGITAL_ART">Digital Art</SelectItem>
            <SelectItem value="FANTASY_ART">Fantasy Art</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm font-light">
        * Lưu ý, mỗi lần tạo ảnh bằng AI thì sẽ tiêu mất 1.000đ từ ví Rookies. Xin hãy kiểm tra số dư trong ví trước khi tạo ảnh.
      </p>

      {generateWithImage.isPending && <SpinningCubeLoader />}

      {/* Generate */}
      <Button
        onClick={handleGenerate}
        disabled={generateWithImage.isPending || !form.prompt}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {generateWithImage.isPending ? "Đang tạo..." : "Generate"}
      </Button>

      {/* Preview */}
      {preview && (
        <div className="mt-4">
          <Label className="mb-3">Kết quả:</Label>
          <img
            src={preview}
            alt="AI Generated"
            className="mt-2 rounded-xl shadow-lg mx-auto border border-white/20 max-w-full"
          />
        </div>
      )}
    </div>
  );
};

export default AIPromptPanel;

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
import { useCreateAIGeneration, useCreateAIGenerationTarget, useGenerateIllustrationWithImage } from "@/services/AIService";

interface AIPromptPanelProps {
  // trả về cả imageUrl và thông tin aiGeneration (nếu có) để parent xử lý khi save page
  onGenerated?: (payload: { imageUrl: string; aiGeneration?: any }) => void;
}

const AIPromptPanel: React.FC<AIPromptPanelProps> = ({ onGenerated }) => {
  const [form, setForm] = useState({
    modelName: "",
    prompt: "",
    negativePrompt: "",
    durationMs: 0,
    mode: "TEXT_TO_IMAGE", // Set as default, won't change
    aspectRatio: "1:1",
    cfgScale: 7,
    stylePreset: "_3D_MODEL",
    style: "_3D_MODEL",
    format: "png",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const createAIGeneration = useCreateAIGeneration();
  const createAIGenerationTarget = useCreateAIGenerationTarget();
  const generateWithImage = useGenerateIllustrationWithImage();

  // cố gắng lấy userId từ token hoặc từ localStorage
  const getUserId = (): string => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload?.userId || payload?.sub || payload?.id || "author-demo";
      }
    } catch (e) {}
    return localStorage.getItem("userId") || "author-demo";
  };

  const handleGenerate = async () => {
    const userId = getUserId();
    const meta = {
      modelName: form.modelName,
      prompt: form.prompt,
      negativePrompt: form.negativePrompt,
      mode: "TEXT_TO_IMAGE",
      aspectRatio: form.aspectRatio,
      cfgScale: form.cfgScale,
      format: form.format,
      stylePreset: form.stylePreset,
      title: "AI Generated Image",
      style: form.stylePreset.replace("_", ""),
      width: 1024,
      height: 1024,
      strength: 1,
      durationMs: 0,
    };

    try {
      // gọi đồng thời: generate image trên server, tạo bản ghi aiGeneration trên DB
      const [genRes, aiGenRes] = await Promise.all([
        generateWithImage.mutateAsync({ userId, meta }),
        createAIGeneration.mutateAsync([
          {
            modelName: form.modelName,
            prompt: form.prompt,
            negativePrompt: form.negativePrompt,
            durationMs: undefined,
            status: 0,
            userId,
            mode: "TEXT_TO_IMAGE",
            aspectRatio: form.aspectRatio,
            strength: meta.strength,
            cfgScale: form.cfgScale,
            stylePreset: form.stylePreset,
            format: form.format,
            title: "AI Generated Image",
            style: form.stylePreset.replace("_", ""),
            isActived: "ACTIVE",
          },
        ]),
      ]);

      // lấy imageUrl từ response (nhiều fallback)
      const imageUrl =
        genRes?.imageUrl ||
        genRes?.output?.[0]?.url ||
        genRes?.data?.[0]?.url ||
        genRes?.url ||
        null;

      // lấy aiGeneration object
      const aiGenObj = Array.isArray(aiGenRes) ? aiGenRes[0] : aiGenRes;

      // cố gắng lấy illustrationId từ genRes nếu backend trả
      const illustrationId =
        genRes?.illustrationId || genRes?.data?.[0]?.illustrationId || null;

      // tạo AI generation target liên kết với ILLUSTRATION nếu có aiGenId
      if (aiGenObj?.aiGenerationId) {
        try {
          await createAIGenerationTarget.mutateAsync([
            {
              aiGenerationId: aiGenObj.aiGenerationId,
              targetType: "ILLUSTRATION",
              targetRefId: illustrationId || imageUrl || "UNKNOWN",
              isActived: "ACTIVE",
            },
          ]);
        } catch (e) {
          // không block nếu tạo target thất bại
          console.error("Failed to create AI generation target for illustration", e);
        }
      }

      setPreview(imageUrl);
      // trả về parent: imageUrl và aiGeneration để parent có thể liên kết PAGE sau khi tạo page
      onGenerated?.({ imageUrl: imageUrl || "", aiGeneration: aiGenObj });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-5 text-white">
      <h2 className="text-lg font-semibold">Tạo ảnh bằng AI</h2>

      {/* Model Name */}
      <div>
        <Label className="mb-3">Model Name</Label>
        <Input
          placeholder="Nhập tên model..."
          value={form.modelName}
          onChange={(e) => setForm({ ...form, modelName: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Prompt */}
      <div>
        <Label className="mb-3">Prompt</Label>
        <Textarea
          placeholder="Mô tả ảnh bạn muốn tạo..."
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <Label className="mb-3">Negative Prompt</Label>
        <Textarea
          placeholder="Mô tả những gì bạn KHÔNG muốn trong ảnh..."
          value={form.negativePrompt}
          onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Duration Ms */}
      <div>
        <Label className="mb-3">Duration (ms)</Label>
        <Input
          type="number"
          value={form.durationMs}
          onChange={(e) => setForm({ ...form, durationMs: Number(e.target.value) })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Aspect Ratio */}
      <div>
        <Label className="mb-3">Aspect Ratio</Label>
        <Select
          value={form.aspectRatio}
          onValueChange={(v) => setForm({ ...form, aspectRatio: v })}
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="Chọn tỉ lệ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 (Square)</SelectItem>
            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
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

      {/* Style Preset */}
      <div>
        <Label className="mb-3">Style Preset</Label>
        <Select
          value={form.stylePreset}
          onValueChange={(v) => setForm({ ...form, stylePreset: v, style: v })}
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="Chọn style preset" />
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

      {/* Nút Generate */}
      <Button
        onClick={handleGenerate}
        disabled={generateWithImage.isPending || !form.prompt}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {generateWithImage.isPending ? "Đang tạo..." : "Generate"}
      </Button>

      {/* Hiển thị ảnh kết quả */}
      {preview && (
        <div className="mt-4">
          <Label>Kết quả:</Label>
          <img
            src={preview}
            alt="AI Generated"
            className="mt-2 rounded-xl shadow-lg mx-auto border border-white/20"
          />
        </div>
      )}
    </div>
  );
};

export default AIPromptPanel;

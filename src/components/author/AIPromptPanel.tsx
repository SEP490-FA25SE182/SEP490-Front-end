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

interface AIPromptPanelProps {
  onGenerated?: (payload: { imageUrl: string; aiGeneration?: any }) => void;
}

const AIPromptPanel: React.FC<AIPromptPanelProps> = ({ onGenerated }) => {
  const [form, setForm] = useState({
    modelName: "stable-diffusion-xl-1024-v1-0",
    prompt: "",
    negativePrompt: "",
    mode: "TEXT_TO_IMAGE",
    width: 1024,
    height: 1024,
    accept: "image/*",
    stylePreset: "PHOTOGRAPHIC",
    style: "Photographic",
    aspectRatio: "1:1",
    format: "png",
    title: "",
    controlnetType: "",
    cfgScale: 8,
    strength: 1,
    seed: 77,
    durationMs: 0, // ✅ Thêm field durationMs
  });

  const [preview, setPreview] = useState<string | null>(null);

  const createAIGeneration = useCreateAIGeneration();
  const createAIGenerationTarget = useCreateAIGenerationTarget();
  const generateWithImage = useGenerateIllustrationWithImage();

  const getUserId = (): string => {
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
      const [genRes, aiGenRes] = await Promise.all([
        generateWithImage.mutateAsync({ userId, meta }),
        createAIGeneration.mutateAsync([
          {
            modelName: form.modelName,
            prompt: form.prompt,
            negativePrompt: form.negativePrompt,
            durationMs: form.durationMs, // ✅ sử dụng giá trị từ form
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
    }
  };

  return (
    <div className="space-y-5 text-white">
      <h2 className="text-lg font-semibold">AI Image Generator</h2>

      {/* Model Name */}
      <div>
        <Label className="mb-3">Model Name *</Label>
        <Input
          required
          placeholder="stable-diffusion-xl-1024-v1-0"
          value={form.modelName}
          onChange={(e) => setForm({ ...form, modelName: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Prompt */}
      <div>
        <Label className="mb-3">Prompt *</Label>
        <Textarea
          required
          placeholder="Describe the image..."
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Negative Prompt */}
      <div>
        <Label className="mb-3">Negative Prompt *</Label>
        <Textarea
          required
          placeholder="Describe what you DON'T want..."
          value={form.negativePrompt}
          onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Title */}
      <div>
        <Label className="mb-3">Title *</Label>
        <Input
          required
          placeholder="Title for the generated image"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Width & Height */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label className="mb-3">Width *</Label>
          <Input
            required
            type="number"
            value={form.width}
            onChange={(e) => setForm({ ...form, width: Number(e.target.value) })}
            className="bg-transparent border-white/20 text-white"
          />
        </div>
        <div className="flex-1">
          <Label className="mb-3">Height *</Label>
          <Input
            required
            type="number"
            value={form.height}
            onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
            className="bg-transparent border-white/20 text-white"
          />
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <Label className="mb-3">Aspect Ratio *</Label>
        <Select
          value={form.aspectRatio}
          onValueChange={(v) => setForm({ ...form, aspectRatio: v })}
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="Aspect Ratio" />
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

      {/* Seed */}
      <div>
        <Label className="mb-3">Seed *</Label>
        <Input
          required
          type="number"
          value={form.seed}
          onChange={(e) => setForm({ ...form, seed: Number(e.target.value) })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* ✅ DurationMs */}
      <div>
        <Label className="mb-3">Duration (ms)</Label>
        <Input
          type="number"
          min={0}
          value={form.durationMs}
          onChange={(e) => setForm({ ...form, durationMs: Number(e.target.value) })}
          placeholder="Thời gian sinh ảnh (ms)"
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Style Preset */}
      <div>
        <Label className="mb-3">Style Preset *</Label>
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

      {/* ControlNet Type */}
      <div>
        <Label className="mb-3">ControlNet Type (Optional)</Label>
        <Input
          placeholder="Optional (e.g., depth, pose...)"
          value={form.controlnetType}
          onChange={(e) => setForm({ ...form, controlnetType: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

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

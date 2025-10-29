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
import { useGenerateIllustration } from "@/services/AIService";

interface AIPromptPanelProps {
  onGenerated?: (url: string) => void;
}

const AIPromptPanel: React.FC<AIPromptPanelProps> = ({ onGenerated }) => {
  const [form, setForm] = useState({
    prompt: "",
    negativePrompt: "",
    modelName: "stable-diffusion-xl-1024-v1-0",
    aspectRatio: "1:1",
    cfgScale: 7,
    stylePreset: "_3D_MODEL",
    format: "png",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const generate = useGenerateIllustration();

  const handleGenerate = async () => {
    const res = await generate.mutateAsync({
      userId: "author-demo",
      meta: {
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
        strength: 20
      },
    });

    // lấy URL ảnh từ API response
    const url =
      res?.imageUrl || res?.output?.[0]?.url || res?.data?.[0]?.url || null;
    setPreview(url);
    handleImageGenerated(url); // Gọi hàm xử lý khi có ảnh
  };

  const handleImageGenerated = (url: string) => {
    // gọi callback khi có ảnh từ AI
    onGenerated?.(url);
  };

  return (
    <div className="space-y-5 text-white">
      <h2 className="text-lg font-semibold">Tạo ảnh bằng AI</h2>

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
        <Label className="mb-3">Negative Prompt (nâng cao)</Label>
        <Textarea
          placeholder="Mô tả những gì bạn KHÔNG muốn trong ảnh..."
          value={form.negativePrompt}
          onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
          className="bg-transparent border-white/20 text-white"
        />
      </div>

      {/* Model Name */}
      <div>
        <Label className="mb-3">Model</Label>
        <Select
          value={form.modelName}
          onValueChange={(v) => setForm({ ...form, modelName: v })}
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="Chọn model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stable-diffusion-xl-1024-v1-0">
              Stable Diffusion XL 1.0
            </SelectItem>
            <SelectItem value="stable-diffusion-3-medium">
              Stable Diffusion 3 Medium
            </SelectItem>
            <SelectItem value="sd-turbo">
              SD Turbo (nhanh hơn, chất lượng thấp hơn)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aspect Ratio */}
      <div>
        <Label className="mb-3">Tỉ lệ khung hình</Label>
        <Select
          value={form.aspectRatio}
          onValueChange={(v) => setForm({ ...form, aspectRatio: v })}
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="1:1" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1 (vuông)</SelectItem>
            <SelectItem value="16:9">16:9 (ngang)</SelectItem>
            <SelectItem value="9:16">9:16 (dọc)</SelectItem>
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
          onValueChange={(v) => setForm({ ...form, stylePreset: v })}
        >
          <SelectTrigger className="bg-[#1a2332] border-white/20 text-white">
            <SelectValue placeholder="Chọn phong cách" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_3D_MODEL">3D Model</SelectItem>
            <SelectItem value="ANIME">Anime</SelectItem>
            <SelectItem value="REALISTIC">Realistic</SelectItem>
            <SelectItem value="DIGITAL_ART">Digital Art</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Format (ẩn) */}
      <input type="hidden" value={form.format} />

      {/* Nút Generate */}
      <Button
        onClick={handleGenerate}
        disabled={generate.isPending || !form.prompt}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {generate.isPending ? "Đang tạo..." : "Generate"}
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

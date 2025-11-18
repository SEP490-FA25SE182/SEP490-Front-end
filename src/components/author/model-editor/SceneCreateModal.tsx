// src/components/author/model-editor/SceneCreateModal.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

type SceneCreateModalProps = {
  isOpen: boolean;
  initialStatus: "DRAFT" | "PUBLISHED";
  onClose: () => void;
  onSave: (
    name?: string,
    description?: string,
    status?: "DRAFT" | "PUBLISHED"
  ) => void;
};

export default function SceneCreateModal({
  isOpen,
  initialStatus,
  onClose,
  onSave,
}: SceneCreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const status = initialStatus;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#0f172a] border border-white/10 rounded p-4 text-white">
        <h3 className="text-lg font-semibold mb-2">
          Tạo Scene ({status === "DRAFT" ? "Lưu nháp" : "Xuất bản"})
        </h3>
        <label className="text-sm text-gray-300">Tên</label>
        <input
          className="w-full mt-1 mb-3 p-2 bg-[#061026] border border-white/10 rounded text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên scene"
        />
        <label className="text-sm text-gray-300">Mô tả</label>
        <textarea
          className="w-full mt-1 mb-3 p-2 bg-[#061026] border border-white/10 rounded text-white"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả ngắn"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white">
            Huỷ
          </Button>
          <Button
            onClick={() => onSave(name, description, status)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}

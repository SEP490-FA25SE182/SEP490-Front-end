import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useCreatePageAudio, useSearchAudios } from "@/services/AIService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pageId?: string | null;
  onAttached?: (ids: string[]) => void;
}

export default function AudioAttachDialog({
  isOpen,
  onClose,
  pageId,
  onAttached,
}: Props) {
  const { toast } = useToast();
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  const [openPreview, setOpenPreview] = useState(false);
  const createPageAudio = useCreatePageAudio();

  // load current user audios
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { data: audiosData } = useSearchAudios({
    userId: user?.userId,
    isActived: "ACTIVE",
  });

  const audioList = useMemo(() => {
    const raw = Array.isArray(audiosData)
      ? audiosData
      : (audiosData as any)?.content ?? [];

    return (raw ?? [])
      .slice() // prevent in-place sort mutation (react-query cache safety)
      .sort((a: any, b: any) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();

        if (tb !== ta) return tb - ta; // newest first

        // stable tie-breaker to reduce "jumping" order
        return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      })
      .map((a: any) => ({
        id: a.audioId ?? a.id,
        name: a.title || "Audio không tên",
        url: a.audioUrl,
      }));
  }, [audiosData]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAudio("");
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!pageId) {
      toast({
        title: "Lỗi",
        description: "Không có pageId để gắn audio.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedAudio) {
      toast({
        title: "Chưa chọn audio",
        description: "Vui lòng chọn file audio để gắn.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createPageAudio.mutateAsync([
        {
          pageId,
          audioId: selectedAudio,
        },
      ]);
      onAttached?.([selectedAudio]);
      onClose();
    } catch (err: any) {
      console.error("Gắn audio thất bại:", err);
      toast({
        title: "Gắn audio thất bại",
        description: err?.response?.data?.message || "Không thể gắn audio.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chọn audio để gắn</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn audio
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2 bg-white text-gray-900"
              value={selectedAudio}
              onChange={(e) => setSelectedAudio(e.target.value)}
            >
              <option value="">-- Chọn file audio --</option>
              {audioList.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {selectedAudio && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nghe thử
              </label>
              <audio controls className="w-full" preload="metadata">
                <source
                  src={
                    audioList.find((x: any) => x.id === selectedAudio)?.url ||
                    ""
                  }
                />
                Trình duyệt không hỗ trợ phát audio.
              </audio>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={createPageAudio.isPending}>
            {createPageAudio.isPending ? "Đang lưu..." : "Lưu audio"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Preview dialog for selected audio */}
      <Dialog
        open={openPreview}
        onOpenChange={(open) => !open && setOpenPreview(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xem trước audio</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <div className="text-sm text-gray-700 mb-2">
              {audioList.find((x: { id: string; }) => x.id === selectedAudio)?.name || "Audio"}
            </div>
            <audio controls className="w-full" preload="metadata">
              <source
                src={audioList.find((x: { id: string; }) => x.id === selectedAudio)?.url || ""}
              />
              Trình duyệt không hỗ trợ phát audio.
            </audio>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setOpenPreview(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

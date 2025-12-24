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
import {
  useAttachMarkerToPage,
  useSearchMarkers,
} from "@/services/ARService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pageId?: string | null;
  pageNumber?: number;
  onSaved?: () => void;
}

export default function MarkerPageDialog({ isOpen, onClose, pageId, pageNumber, onSaved }: Props) {
  const { toast } = useToast();

  // ✅ server sort theo createdAt desc (mới nhất lên đầu)
  const { data: markersResp } = useSearchMarkers({
    page: 0,
    size: 9999,                 // ✅ lấy tất cả
    sort: ["updatedAt,asc"],   // ✅ gần đây nhất trước
    // isActived: "ACTIVE",      // nếu BE hỗ trợ filter thì bật lên
  });

  const markers = markersResp?.content ?? [];
  const attachMarkerMutation = useAttachMarkerToPage();
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("");

  useEffect(() => {
    if (!isOpen) setSelectedMarkerId("");
  }, [isOpen]);

  // ✅ client sort fallback theo createdAt desc
  const markerList = useMemo(() => {
    if (!Array.isArray(markers)) return [];

    const toTime = (d?: string) => (d ? new Date(d).getTime() : 0);


    return markers
      .filter((m: any) => m.isActived === "ACTIVE")
      .sort((a: any, b: any) => toTime(b.updatedAt) - toTime(a.updatedAt)) // ✅ desc
      .map((m: any) => ({
        id: (m.markerId ?? m.id) as string,
        code: m.markerCode,
        type: m.markerType,
        imageUrl: m.imageUrl,
        updatedAt: m.updatedAt,
      }));
  }, [markers]);

  const gsToHttp = (url: string) => {
    if (!url) return "";
    if (!url.startsWith("gs://")) return url;
    const withoutGs = url.replace("gs://", "");
    const parts = withoutGs.split("/");
    const bucket = parts.shift();
    const path = parts.join("/");
    if (!bucket || !path) return url;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
  };

  const handleSave = async () => {
    if (!pageId) {
      toast({
        title: "Lỗi",
        description: "Không có pageId.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedMarkerId) {
      toast({
        title: "Chưa chọn marker",
        description: "Vui lòng chọn marker.",
        variant: "destructive",
      });
      return;
    }

    try {
      await attachMarkerMutation.mutateAsync({
        markerId: selectedMarkerId,
        pageId,
      });
      toast({
        title: "Lưu thành công",
        description: "Marker đã được gắn vào trang.",
      });
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error("Lỗi gắn marker:", err);
      toast({
        title: "Lỗi",
        description:
          err?.response?.data?.message || "Không thể gắn marker.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gắn marker vào trang {pageNumber ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 text-center">
          <p className="text-xs text-gray-400">
            Khuyến nghị: sử dụng ảnh marker giống với ảnh đã gắn vào trang để đảm
            bảo nhận diện AR chính xác.
          </p>
        </div>

        <div className="mt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {markerList.length === 0 && (
              <div className="text-sm text-gray-500 col-span-full">
                Không có marker.
              </div>
            )}

            {markerList.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMarkerId(m.id)}
                className={`rounded border p-1 overflow-hidden focus:outline-none ${
                  selectedMarkerId === m.id
                    ? "border-purple-500 ring-2 ring-purple-200"
                    : "border-white/10 hover:border-gray-300"
                }`}
              >
                <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {m.imageUrl ? (
                    <img
                      src={gsToHttp(m.imageUrl)}
                      alt={m.code}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-2 text-xs text-center text-gray-600">
                      {m.code}
                    </div>
                  )}
                </div>
                <div className="text-xs mt-2 text-left text-gray-700 truncate">
                  {m.code} ({m.type})
                </div>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            onClick={handleSave}
            disabled={attachMarkerMutation.isPending}
          >
            {attachMarkerMutation.isPending
              ? "Đang lưu..."
              : "Lưu marker vào trang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

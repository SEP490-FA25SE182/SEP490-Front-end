import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateMarker, useGetAllMarkers } from "@/services/ARService";
import { useToast } from "@/components/ui/use-toast";
import { useSearchIllustrations } from "@/services/AIService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // onCreated removed — MarkerCreateDialog chỉ tạo marker và đóng dialog.
}

const MarkerCreateDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { toast } = useToast();

  const [markerCode, setMarkerCode] = useState("");
  const [selectedIllustrationId, setSelectedIllustrationId] =
    useState<string | null>(null);

  const createMarker = useCreateMarker();
  const { data: markers = [] } = useGetAllMarkers();

  // ----- lấy danh sách illustration của user -----
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.userId;

  const {
    data: illustrations = [],
    isLoading: loadingIllustrations,
  } = useSearchIllustrations({
    userId,
    page: 0,
    size: 9999,
    sort: ["updatedAt,desc"], // ✅ sort từ server (nếu hỗ trợ)
  });

  // reset state khi đóng dialog
  useEffect(() => {
    if (!isOpen) {
      setMarkerCode("");
      setSelectedIllustrationId(null);
    }
  }, [isOpen]);

  // convert gs:// -> https (dùng chung nhiều nơi)
  const gsToHttp = (url?: string | null) => {
    if (!url) return "";
    if (!url.startsWith("gs://")) return url;
    const withoutGs = url.replace("gs://", "");
    const parts = withoutGs.split("/");
    const bucket = parts.shift();
    const path = parts.join("/");
    if (!bucket || !path) return url;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
      path
    )}?alt=media`;
  };

  // normalize markerCode: trim + đổi space thành '-' + bỏ ký tự lạ + lowercase
  const normalizeCode = (code: string) =>
    code
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]/g, "")
      .toLowerCase();

  // map illustration data cho UI
  const illustrationList = useMemo(() => {
    if (!Array.isArray(illustrations)) return [];

    // thiếu createdAt => đẩy xuống cuối
    const toTime = (d?: string) =>
      d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;

    return illustrations
      .filter((it: any) => it.isActived === "ACTIVE" && !!(it.illustrationId ?? it.id))
      .sort((a: any, b: any) => toTime(b.updatedAt) - toTime(a.updatedAt)) // ✅ DESC: mới -> cũ
      .map((it: any) => ({
        id: it.illustrationId ?? it.id,
        title: it.title,
        url: it.imageUrl,
        updatedAt: it.updatedAt,
      }));
  }, [illustrations]);

  const selectedIllustration = illustrationList.find(
    (i) => i.id === selectedIllustrationId
  );
  const previewUrl = selectedIllustration ? gsToHttp(selectedIllustration.url) : "";

  const handleSubmit = async () => {
    // ----- validate -----
    if (!markerCode.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập Marker Code.",
        variant: "destructive",
      });
      return;
    }

    if (markerCode.trim().length > 50) {
      toast({
        title: "Marker Code quá dài",
        description: "Marker Code tối đa 50 ký tự.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedIllustrationId) {
      toast({
        title: "Chưa chọn ảnh",
        description: "Vui lòng chọn một illustration để làm marker.",
        variant: "destructive",
      });
      return;
    }

    const normalized = normalizeCode(markerCode);

    const duplicated = Array.isArray(markers)
      ? (markers as any[]).some(
        (m) => (m.markerCode || "").toLowerCase() === normalized
      )
      : false;

    if (duplicated) {
      toast({
        title: "Trùng Marker Code",
        description: `Marker với mã "${normalized}" đã tồn tại.`,
        variant: "destructive",
      });
      return;
    }

    const rawImageUrl = selectedIllustration?.url;
    if (!rawImageUrl) {
      toast({
        title: "Không tìm thấy ảnh",
        description: "Không thể lấy được URL ảnh để tạo marker.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: any = {
        markerCode: normalized,
        markerType: "fiducial",                // như swagger
        imageUrl: gsToHttp(rawImageUrl),       // convert gs:// nếu cần
        physicalWidthM: 0.001,                 // như swagger
        userId,                                // lấy từ localStorage ở trên
      };

      console.log("Create marker payload = ", payload);

      const res = await createMarker.mutateAsync(payload);
      console.log("Create marker response = ", res);

      toast({
        title: "Tạo marker thành công",
        description: `Marker "${normalized}" đã được tạo.`,
      });

      onClose();
    } catch (err: any) {
      console.error("Tạo marker thất bại:", err);
      toast({
        title: "Tạo marker thất bại",
        description:
          err?.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo Marker AR</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Marker Code */}
          <div>
            <Label className="mb-1 block">
              Marker Code
              <span className="text-xs text-gray-400 ml-1">
                (sẽ tự chuyển khoảng trắng thành dấu gạch ngang)
              </span>
            </Label>
            <Input
              value={markerCode}
              onChange={(e) => setMarkerCode(e.target.value)}
              placeholder="ví dụ: book-1"
            />
            {markerCode && (
              <p className="mt-1 text-xs text-gray-400">
                Mã sẽ được lưu dưới dạng:{" "}
                <span className="font-mono">
                  {normalizeCode(markerCode) || "<trống>"}
                </span>
              </p>
            )}
          </div>

          {/* Chọn illustration */}
          <div>
            <Label className="mb-2 block">
              Chọn ảnh illustration làm hình marker
            </Label>

            {loadingIllustrations && (
              <div className="text-sm text-gray-500">Đang tải ảnh...</div>
            )}

            {!loadingIllustrations && illustrationList.length === 0 && (
              <div className="text-sm text-gray-500">
                Bạn chưa có illustration nào.
              </div>
            )}

            {!loadingIllustrations && illustrationList.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-h-56 overflow-auto">
                {illustrationList.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelectedIllustrationId(it.id)}
                    className={`rounded border p-0 overflow-hidden focus:outline-none ${selectedIllustrationId === it.id
                      ? "ring-2 ring-purple-300 border-purple-500"
                      : "border-white/10 hover:border-gray-300"
                      }`}
                  >
                    <div className="w-20 h-20 bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={gsToHttp(it.url)}
                        alt={it.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div>
              <Label className="mb-1 block">Preview</Label>
              <div className="w-36 h-24 rounded overflow-hidden border border-white/10 bg-gray-900">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMarker.isPending || !selectedIllustrationId}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {createMarker.isPending ? "Đang xử lý..." : "Tạo marker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkerCreateDialog;

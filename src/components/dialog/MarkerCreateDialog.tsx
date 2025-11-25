import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateMarker, useGetAllMarkers, type Marker } from "@/services/ARService";
import { useToast } from "@/components/ui/use-toast";
import { useSearchIllustrations } from "@/services/AIService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // kept for compatibility but not used to open 3D dialog anymore
  onCreated?: (marker?: Marker) => void;
}

const MarkerCreateDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const [markerCode, setMarkerCode] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const createMarker = useCreateMarker();
  const { data: markers } = useGetAllMarkers();

  // --- user illustrations (like ImagePageCreate) ---
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.userId;
  const { data: illustrations = [] } = useSearchIllustrations({ userId });
  const [selectedIllustrationId, setSelectedIllustrationId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMarkerCode("");
      setPreviewUrl(null);
      setSelectedIllustrationId(null);
    }
  }, [isOpen]);

  const normalizeCode = (code: string) =>
    code
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]/g, "")
      .toLowerCase();

  // helper: convert gs:// -> https for preview (same as ImagePageCreate)
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

  // map illustrations for UI
  const illustrationsList = Array.isArray(illustrations)
    ? illustrations
        .filter((it: any) => it.isActived === "ACTIVE")
        .map((it: any) => ({
          id: it.illustrationId,
          title: it.title,
          url: it.imageUrl,
        }))
    : [];

  const handleSubmit = async () => {
    // basic validations
    if (markerCode.trim().length > 50) {
      toast({ title: "Marker code quá dài", description: "Marker code tối đa 50 ký tự.", variant: "destructive" });
      return;
    }
    if (!markerCode.trim()) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập markerCode.", variant: "destructive" });
      return;
    }
    // ensure an existing illustration is selected
    if (!selectedIllustrationId) {
      toast({ title: "Chưa chọn ảnh", description: "Vui lòng chọn một ảnh có sẵn để làm marker.", variant: "destructive" });
      return;
    }

    const normalized = normalizeCode(markerCode);

    const existing = Array.isArray(markers)
      ? markers.find((m: any) => (m.markerCode || "").toLowerCase() === normalized)
      : undefined;

    if (existing) {
      toast({ title: "Trùng markerCode", description: `Marker với mã "${normalized}" đã tồn tại.`, variant: "destructive" });
      return;
    }

    try {
      const found = illustrationsList.find((i) => i.id === selectedIllustrationId);
      const rawImageUrl = found?.url;
      if (!rawImageUrl) throw new Error("Không lấy được url ảnh để tạo marker.");

      // Convert gs:// URL to HTTPS before saving
      const imageUrl = gsToHttp(rawImageUrl);

      // create marker with the selected illustration url (HTTPS)
      await createMarker.mutateAsync({
        markerCode: normalized,
        markerType: "fiducial",
        imageUrl,
      });

      toast({ title: "Tạo marker thành công", description: `Marker "${normalized}" đã được tạo.` });
      onClose();
    } catch (err) {
      console.error("Tạo marker thất bại:", err);
      toast({ title: "Tạo marker thất bại", description: "Đã xảy ra lỗi. Vui lòng thử lại.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo Marker AR</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="mb-2">Marker Code (dùng gạch ngang thay space)</Label>
            <Input value={markerCode} onChange={(e) => setMarkerCode(e.target.value)} placeholder="ví dụ: book-1" />
          </div>

          {/* existing illustrations (user) */}
          <div>
            <Label className="mb-2">Chọn ảnh đã tạo (ảnh của bạn)</Label>
            <div className="grid grid-cols-4 gap-2">
              {illustrationsList.length === 0 && <div className="text-sm text-gray-500 col-span-full">Không có ảnh.</div>}
              {illustrationsList.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setSelectedIllustrationId(it.id);
                    setPreviewUrl(gsToHttp(it.url));
                  }}
                  className={`rounded border p-0 overflow-hidden focus:outline-none ${selectedIllustrationId === it.id ? "ring-2 ring-purple-300 border-purple-500" : "border-white/10 hover:border-gray-300"}`}
                >
                  <div className="w-20 h-20 bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={gsToHttp(it.url)} alt={it.title} className="w-full h-full object-cover" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* preview (small) */}
          {previewUrl && (
            <div>
              <Label className="mb-2">Preview</Label>
              <div className="w-36 h-24 rounded overflow-hidden border">
                <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!selectedIllustrationId || createMarker.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
            {createMarker.isPending ? "Đang xử lý..." : "Tạo marker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkerCreateDialog;
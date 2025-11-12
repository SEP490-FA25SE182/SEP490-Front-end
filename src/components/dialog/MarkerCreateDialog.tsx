import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateMarker, useGetAllMarkers, type Marker } from "@/services/ARService";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // onCreated now provides created marker so caller can open 3D dialog automatically
  onCreated?: (marker?: Marker) => void;
}

const MarkerCreateDialog: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [markerCode, setMarkerCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const { toast } = useToast();
  const createMarker = useCreateMarker();
  const { data: markers } = useGetAllMarkers();

  useEffect(() => {
    if (!isOpen) {
      setMarkerCode("");
      setImageUrl("");
    }
  }, [isOpen]);

  const normalizeCode = (code: string) =>
    code
      .trim()
      .replace(/\s+/g, "-") // spaces -> hyphens
      .replace(/[^a-zA-Z0-9\-]/g, "") // remove invalid chars
      .toLowerCase();

  // Kiểm tra URL có chứa "qr code" theo nhiều dạng (qrcode, qr-code, qr_code, "qr code", ...)
  const containsQrText = (url: string) => {
    if (!url) return false;
    return /qr[\s\-_]?code|qrcode/i.test(url);
  };

  const handleSubmit = async () => {
    // length validation
    if (markerCode.trim().length > 50) {
      toast({
        title: "Marker code quá dài",
        description: "Marker code tối đa 50 ký tự.",
        variant: "destructive",
      });
      return;
    }
    if (imageUrl.trim().length > 300) {
      toast({
        title: "URL ảnh quá dài",
        description: "Image URL tối đa 300 ký tự.",
        variant: "destructive",
      });
      return;
    }

    if (!markerCode.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập markerCode.",
        variant: "destructive",
      });
      return;
    }
    if (!imageUrl.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập imageUrl.",
        variant: "destructive",
      });
      return;
    }

    // Yêu cầu url phải có chuỗi "qr code" (bất kỳ định dạng)
    if (!containsQrText(imageUrl.trim())) {
      toast({
        title: "URL không hợp lệ",
        description: "URL ảnh phải chứa chữ 'qr code' (ví dụ: qrcode, qr-code, qr_code, 'qr code').",
        variant: "destructive",
      });
      return;
    }

    const normalized = normalizeCode(markerCode);

    const existing = Array.isArray(markers)
      ? markers.find((m: any) => (m.markerCode || "").toLowerCase() === normalized)
      : undefined;

    if (existing) {
      toast({
        title: "Trùng markerCode",
        description: `Marker với mã "${normalized}" đã tồn tại.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const created = await createMarker.mutateAsync({
        markerCode: normalized,
        markerType: "fiducial", // hidden default as requested
        imageUrl: imageUrl.trim(),
      });

      toast({
        title: "Tạo marker thành công",
        description: `Marker “${normalized}” đã được tạo.`,
      });

      // provide created marker to caller so it can auto-open 3D dialog and pass markerId
      onCreated?.(created);
      onClose();
    } catch (err) {
      console.error("Tạo marker thất bại:", err);
      toast({
        title: "Tạo marker thất bại",
        description: "Đã xảy ra lỗi. Vui lòng thử lại.",
        variant: "destructive",
      });
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
            <Input
              value={markerCode}
              onChange={(e) => setMarkerCode(e.target.value)}
              placeholder="ví dụ: book-1"
            />
          </div>

          <div>
            <Label className="mb-2">URL Ảnh</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL ảnh (ảnh của QR code)"
            />
          </div>

          {/* markerType is hidden and defaulted to 'fiducial' */}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">Huỷ</Button>
          <Button onClick={handleSubmit}>Tạo marker</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkerCreateDialog;
import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateMarker, useGetAllMarkers, type Marker } from "@/services/ARService";
import { useToast } from "@/components/ui/use-toast";
import { UploadService } from "@/services/FirebaseService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // kept for compatibility but not used to open 3D dialog anymore
  onCreated?: (marker?: Marker) => void;
}

const MarkerCreateDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const [markerCode, setMarkerCode] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const createMarker = useCreateMarker();
  const { data: markers } = useGetAllMarkers();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMarkerCode("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploading(false);
    }
  }, [isOpen]);

  // revoke object URL when preview changes to avoid memory leak
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(previewUrl); } catch {}
      }
    };
  }, [previewUrl]);

  const normalizeCode = (code: string) =>
    code
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]/g, "")
      .toLowerCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setSelectedFile(file);
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch {
      setPreviewUrl(null);
    }
  };

  const handleChooseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      try { URL.revokeObjectURL(previewUrl); } catch {}
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
    if (!selectedFile) {
      toast({ title: "Thiếu ảnh", description: "Vui lòng chọn file ảnh để làm marker.", variant: "destructive" });
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
      setUploading(true);
      // upload to firebase under folder "marker"
      const gsUrl = await UploadService.uploadImageToFirebase(selectedFile, "marker");

      // create marker with returned gs:// url
      await createMarker.mutateAsync({
        markerCode: normalized,
        markerType: "fiducial",
        imageUrl: gsUrl,
      });

      toast({ title: "Tạo marker thành công", description: `Marker "${normalized}" đã được tạo.` });
      onClose();
    } catch (err) {
      console.error("Tạo marker thất bại:", err);
      toast({ title: "Tạo marker thất bại", description: "Đã xảy ra lỗi. Vui lòng thử lại.", variant: "destructive" });
    } finally {
      setUploading(false);
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

          <div>
            <Label className="mb-2">Ảnh Marker (upload từ máy)</Label>

            {/* hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* visible prominent button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleChooseClick}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Chọn ảnh marker
              </Button>

              {selectedFile && (
                <Button variant="ghost" onClick={handleRemoveFile} className="text-red-400">
                  Bỏ
                </Button>
              )}
            </div>

            {/* preview */}
            {previewUrl && (
              <div className="mt-3">
                <div className="w-40 h-24 rounded overflow-hidden border">
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">Huỷ</Button>
          <Button onClick={handleSubmit} disabled={uploading || createMarker.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
            {uploading || createMarker.isPending ? "Đang xử lý..." : "Tạo marker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkerCreateDialog;
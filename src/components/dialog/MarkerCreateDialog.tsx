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
import { getCurrentUserId, getCurrentBookId } from "@/utils/authStorage";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PHYSICAL_WIDTH = 0.2;
const DEFAULT_TAG_FAMILY = "tagStandard41h12";

const MarkerCreateDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const { toast } = useToast();

  const [markerCode, setMarkerCode] = useState("");
  const [physicalWidthM, setPhysicalWidthM] = useState<string>(""); // input string để dễ nhập

  const createMarker = useCreateMarker();
  const { data: markers = [] } = useGetAllMarkers();

  const userId = getCurrentUserId();
  const bookId = getCurrentBookId();

  // reset state khi đóng dialog
  useEffect(() => {
    if (!isOpen) {
      setMarkerCode("");
      setPhysicalWidthM("");
    }
  }, [isOpen]);

  // normalize markerCode: trim + đổi space thành '-' + bỏ ký tự lạ + lowercase
  const normalizeCode = (code: string) =>
    code
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();

  const normalized = useMemo(() => normalizeCode(markerCode), [markerCode]);

  const handleSubmit = async () => {
    // validate markerCode
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

    // validate userId / bookId
    if (!userId) {
      toast({
        title: "Thiếu userId",
        description: "Không xác định được tài khoản hiện tại. Vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }

    if (!bookId) {
      toast({
        title: "Thiếu bookId",
        description:
          "Chưa có bookId hiện tại. Hãy tạo/chọn sách trước (book wizard cần lưu currentBookId).",
        variant: "destructive",
      });
      return;
    }

    // check duplicate markerCode (nếu API getAllMarkers trả toàn hệ thống thì ok, nếu trả theo user thì càng tốt)
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

    // physicalWidthM: default 0.2 nếu bỏ trống
    let width = DEFAULT_PHYSICAL_WIDTH;
    const raw = physicalWidthM.trim();

    if (raw) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast({
          title: "PhysicalWidthM không hợp lệ",
          description: "Vui lòng nhập số > 0 (ví dụ 0.2).",
          variant: "destructive",
        });
        return;
      }
      width = parsed;
    }

    try {
      const payload = {
        bookId,
        userId,
        markerCode: normalized,
        physicalWidthM: width,
        tagFamily: DEFAULT_TAG_FAMILY,
      };

      console.log("Create apriltag marker payload = ", payload);

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
              Mã Marker
            </Label>
            <Input
              value={markerCode}
              onChange={(e) => setMarkerCode(e.target.value)}
              placeholder="ví dụ: dieu-bi-mat"
            />
            {markerCode && (
              <p className="mt-1 text-xs text-gray-400">
                Mã sẽ được lưu dưới dạng:{" "}
                <span className="font-mono">
                  {normalized || "<trống>"}
                </span>
              </p>
            )}
          </div>

          {/* Physical width */}
          <div>
            <Label className="mb-1 block">
              Kích thước (m)
            </Label>
            <Input
              value={physicalWidthM}
              onChange={(e) => setPhysicalWidthM(e.target.value)}
              placeholder={`ví dụ: ${DEFAULT_PHYSICAL_WIDTH}`}
              inputMode="decimal"
            />
          </div>

          {/* Tag family hidden: tag36h11 */}
          <div className="hidden">
            <Input value={DEFAULT_TAG_FAMILY} readOnly />
          </div>

          {/* debug hint (optional) */}
          {/* <div className="text-xs text-gray-500">
            <div>userId: <span className="font-mono">{userId ?? "null"}</span></div>
            <div>bookId: <span className="font-mono">{bookId ?? "null"}</span></div>
            <div>tagFamily: <span className="font-mono">{DEFAULT_TAG_FAMILY}</span></div>
          </div> */}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMarker.isPending}
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

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSearchIllustrations, useCreatePageIllustration } from "@/services/AIService";
import { useUpdatePage } from "@/services/BookManageService";
import { useToast } from "@/components/ui/use-toast";
import MarkerPageDialog from "@/components/dialog/MarkerPageDialog";

/**
 * ImagePageDialog: chọn illustration và gắn vào page (update page.content + create page-illustration)
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  pageId?: string | null;
  pageNumber?: number;
  chapterId?: string;
  onSaved?: () => void;
}

export default function ImagePageDialog({ isOpen, onClose, pageId, pageNumber, chapterId, onSaved }: Props) {
  const { toast } = useToast();
  const [selectedIllustrationId, setSelectedIllustrationId] = useState<string>("");
  const [openMarkerDialog, setOpenMarkerDialog] = useState(false);
  const updatePage = useUpdatePage();
  const createPageIllustration = useCreatePageIllustration();

  // load illustrations (only user's)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.userId;

  const { data: illustrations = [] } = useSearchIllustrations({
    userId,
    page: 0,
    size: 9999,
    sort: ["updatedAt,desc"], 
  });

  useEffect(() => {
    if (!isOpen) {
      setSelectedIllustrationId("");
    }
  }, [isOpen]);

  const illustrationsList = useMemo(() => {
    if (!Array.isArray(illustrations)) return [];

    // thiếu createdAt => đẩy xuống cuối khi sort desc
    const toTime = (d?: string) =>
      d ? new Date(d).getTime() : 0; // thiếu updatedAt thì đẩy xuống cuối (vì desc)

    return illustrations
      .filter((it: any) => it.isActived === "ACTIVE" && (it.illustrationId || it.id))
      .sort((a: any, b: any) => toTime(b.updatedAt) - toTime(a.updatedAt)) 
      .map((it: any) => ({
        id: it.illustrationId ?? it.id,
        title: it.title,
        url: it.imageUrl,
        updatedAt: it.updatedAt, // (optional) để debug
      }));
  }, [illustrations]);

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
      toast({ title: "Lỗi", description: "Không có page để gắn ảnh.", variant: "destructive" });
      return;
    }
    if (!selectedIllustrationId) {
      toast({ title: "Chưa chọn ảnh", description: "Vui lòng chọn một ảnh.", variant: "destructive" });
      return;
    }

    const found = illustrationsList.find((i) => i.id === selectedIllustrationId);
    if (!found) {
      toast({ title: "Lỗi", description: "Không tìm thấy ảnh đã chọn.", variant: "destructive" });
      return;
    }

    try {
      // 1) update page content to image url
      await updatePage.mutateAsync({
        id: pageId,
        data: {
          pageNumber: pageNumber ?? undefined,
          content: found.url || "",
          chapterId: chapterId ?? undefined,
          pageType: "PICTURE", // ensure page type is picture when updating with image
          isActived: "ACTIVE",
        },
      });

      // 2) create page-illustration relation
      await createPageIllustration.mutateAsync([
        {
          pageId,
          illustrationId: selectedIllustrationId,
        },
      ]);

      toast({ title: "Lưu thành công", description: "Ảnh đã được gắn vào trang." });
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error("Lỗi lưu ảnh vào trang:", err);
      toast({
        title: "Lỗi",
        description: err?.response?.data?.message || "Không thể lưu trang ảnh.",
        variant: "destructive",
      });
    }
  };

  // thêm handler gọi API để cập nhật page (giống nút Lưu) trước khi mở Marker
  const handlePrepareMarker = async () => {
    if (!pageId) {
      toast({ title: "Lỗi", description: "Không có page để gắn ảnh.", variant: "destructive" });
      return;
    }
    if (!selectedIllustrationId) {
      toast({ title: "Chưa chọn ảnh", description: "Vui lòng chọn một ảnh trước khi thêm AR.", variant: "destructive" });
      return;
    }

    const found = illustrationsList.find((i) => i.id === selectedIllustrationId);
    if (!found) {
      toast({ title: "Lỗi", description: "Không tìm thấy ảnh đã chọn.", variant: "destructive" });
      return;
    }

    try {
      // 1) update page content to image url
      await updatePage.mutateAsync({
        id: pageId,
        data: {
          pageNumber: pageNumber ?? undefined,
          content: found.url || "",
          chapterId: chapterId ?? undefined,
          pageType: "PICTURE",
          isActived: "ACTIVE",
        },
      });

      // 2) tạo quan hệ page-illustration (giống nút Lưu)
      await createPageIllustration.mutateAsync([
        {
          pageId,
          illustrationId: selectedIllustrationId,
        },
      ]);

      toast({ title: "Cập nhật thành công", description: "Ảnh đã được gắn vào trang. Bạn có thể thêm AR." });
    } catch (err: any) {
      console.error("Lỗi cập nhật trang trước khi thêm AR:", err);
      toast({
        title: "Lỗi",
        description: err?.response?.data?.message || "Không thể cập nhật trang.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gắn ảnh vào trang</DialogTitle>
        </DialogHeader>

        {/* set a max height for dialog body and enable scrollbar */}
        <div className="mt-2 max-h-[80vh] overflow-auto pr-2">
          <div className="mb-3 text-sm text-gray-600">Chọn illustration của bạn</div>

          {/* thumbnails area: limit height and allow internal scroll if many items */}
          <div className="grid-container mb-4">
            <div className="overflow-auto max-h-[26vh] pr-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {/* thumbnails */}
                {illustrationsList.length === 0 && <div className="text-sm text-gray-500 col-span-full">Không có ảnh.</div>}
                {illustrationsList.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelectedIllustrationId(it.id)}
                    className={`rounded border p-1 overflow-hidden focus:outline-none ${selectedIllustrationId === it.id ? "border-purple-500 ring-2 ring-purple-200" : "border-white/10 hover:border-gray-300"}`}
                  >
                    <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img src={gsToHttp(it.url)} alt={it.title} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).innerHTML = `<div class="p-2 text-xs text-center text-gray-600">${it.title}</div>`; }} />
                    </div>
                    <div className="text-xs mt-2 text-left text-gray-700 truncate">{it.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* preview area: reduce image max size to avoid overflow */}
          <div className="border border-gray-200 rounded p-3 bg-gray-50">
            <div className="text-sm text-gray-600 mb-2">Preview</div>
            {selectedIllustrationId ? (
              <div className="flex items-center justify-center">
                <img
                  src={gsToHttp(illustrationsList.find(i => i.id === selectedIllustrationId)?.url || "")}
                  alt="Preview"
                  className="max-h-[40vh] max-w-[70%] w-full object-contain rounded"
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500">Chưa chọn ảnh.</div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button
            variant="outline"
            onPointerDown={handlePrepareMarker}   // gọi update trước khi mở dialog
            onClick={() => setOpenMarkerDialog(true)} // giữ nguyên theo yêu cầu
            disabled={updatePage.isPending || createPageIllustration.isPending}
          >
            {updatePage.isPending || createPageIllustration.isPending ? "Đang cập nhật..." : "Thêm AR (marker)"}
          </Button>
          <Button onClick={handleSave} disabled={updatePage.isPending || createPageIllustration.isPending}>
            {updatePage.isPending || createPageIllustration.isPending ? "Đang lưu..." : "Lưu ảnh vào trang"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <MarkerPageDialog
        isOpen={openMarkerDialog}
        onClose={() => setOpenMarkerDialog(false)}
        pageId={pageId}
        pageNumber={pageNumber}
        onSaved={async () => {
          setOpenMarkerDialog(false);
          onSaved?.();
        }}
      />
    </Dialog>
  );
}
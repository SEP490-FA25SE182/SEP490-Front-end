import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useSearchIllustrations,
  useCreatePageIllustration,
} from "@/services/AIService";
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

export default function ImagePageDialog({
  isOpen,
  onClose,
  pageId,
  pageNumber,
  chapterId,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [selectedIllustrationId, setSelectedIllustrationId] =
    useState<string>("");
  const [openMarkerDialog, setOpenMarkerDialog] = useState(false);
  const [linked, setLinked] = useState(false); // để tránh tạo trùng page-illustration

  const updatePage = useUpdatePage();
  const createPageIllustration = useCreatePageIllustration();

  // load illustrations (only user's)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.userId;
  const { data: illustrations = [] } = useSearchIllustrations({ userId });

  useEffect(() => {
    if (!isOpen) {
      setSelectedIllustrationId("");
      setLinked(false);
      setOpenMarkerDialog(false);
    }
  }, [isOpen]);

  const illustrationsList = useMemo(() => {
    if (!Array.isArray(illustrations)) return [];
    const list = illustrations
      .filter(
        (it: any) => it.isActived === "ACTIVE" && (it.illustrationId || it.id)
      )
      .map((it: any) => ({
        id: it.illustrationId ?? it.id,
        title: it.title,
        url: it.imageUrl,
      }));
    console.log("[ImagePageDialog] illustrationsList:", list);
    return list;
  }, [illustrations]);

  const gsToHttp = (url: string) => {
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

  /**
   * Tạo quan hệ page-illustration (KHÔNG update page ở đây nữa)
   */
  const linkPageIllustration = async (): Promise<boolean> => {
    console.log("[linkPageIllustration] start", {
      linked,
      pageId,
      selectedIllustrationId,
    });

    if (linked) {
      console.log("[linkPageIllustration] already linked -> skip");
      return true;
    }

    if (!pageId) {
      console.error("[linkPageIllustration] NO pageId");
      toast({
        title: "Lỗi",
        description: "Không có page để gắn illustration.",
        variant: "destructive",
      });
      return false;
    }
    if (!selectedIllustrationId) {
      console.error("[linkPageIllustration] NO selectedIllustrationId");
      toast({
        title: "Chưa chọn ảnh",
        description: "Vui lòng chọn một ảnh trước.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const payload = [
        {
          pageId,
          illustrationId: selectedIllustrationId,
        },
      ];
      console.log(
        "[linkPageIllustration] call createPageIllustration.mutateAsync with payload:",
        payload
      );
      const res = await createPageIllustration.mutateAsync(payload);
      console.log("[linkPageIllustration] success:", res);
      setLinked(true);
      return true;
    } catch (err: any) {
      console.error(
        "[linkPageIllustration] ERROR:",
        err?.response?.data || err
      );
      toast({
        title: "Lỗi",
        description:
          err?.response?.data?.message ||
          "Không thể liên kết illustration với trang.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Lưu ảnh vào page (update page + tạo page-illustration)
   * Dùng chung cho cả "Lưu ảnh vào trang" và "Thêm AR (marker)"
   */
  const savePictureToPage = async (): Promise<boolean> => {
    console.log("[savePictureToPage] start", {
      pageId,
      pageNumber,
      chapterId,
      selectedIllustrationId,
    });

    if (!pageId) {
      console.error("[savePictureToPage] NO pageId");
      toast({
        title: "Lỗi",
        description: "Không có page để gắn ảnh.",
        variant: "destructive",
      });
      return false;
    }
    if (!selectedIllustrationId) {
      console.error("[savePictureToPage] NO selectedIllustrationId");
      toast({
        title: "Chưa chọn ảnh",
        description: "Vui lòng chọn một ảnh.",
        variant: "destructive",
      });
      return false;
    }

    const found = illustrationsList.find(
      (i) => i.id === selectedIllustrationId
    );
    console.log("[savePictureToPage] found illustration:", found);

    if (!found) {
      console.error("[savePictureToPage] selected illustration NOT FOUND");
      toast({
        title: "Lỗi",
        description: "Không tìm thấy ảnh đã chọn.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // 1) update page content + set pageType = "PICTURE"
      const payload = {
        id: pageId,
        data: {
          pageNumber: pageNumber ?? undefined,
          content: found.url || "",
          chapterId: chapterId ?? undefined,
          pageType: "PICTURE",
          isActived: "ACTIVE",
        },
      };
      console.log(
        "[savePictureToPage] call updatePage.mutateAsync with payload:",
        payload
      );
      const updateRes = await updatePage.mutateAsync(payload);
      console.log("[savePictureToPage] updatePage success:", updateRes);

      // 2) đảm bảo có bản ghi page-illustration
      const ok = await linkPageIllustration();
      console.log("[savePictureToPage] linkPageIllustration result:", ok);
      if (!ok) return false;

      toast({
        title: "Lưu thành công",
        description: "Ảnh đã được gắn vào trang.",
      });

      console.log("[savePictureToPage] DONE OK");
      return true;
    } catch (err: any) {
      console.error(
        "[savePictureToPage] updatePage ERROR:",
        err?.response?.data || err
      );
      toast({
        title: "Lỗi",
        description:
          err?.response?.data?.message || "Không thể lưu trang ảnh.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSave = async () => {
    console.log("[handleSave] CLICK");
    const ok = await savePictureToPage();
    console.log("[handleSave] savePictureToPage result:", ok);
    if (!ok) return;

    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gắn ảnh vào trang</DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <div className="mb-3 text-sm text-gray-600">
            Chọn illustration của bạn
          </div>

          {/* list ảnh có scroll riêng */}
          <div className="max-h-80 overflow-y-auto pr-1 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {illustrationsList.length === 0 && (
                <div className="text-sm text-gray-500 col-span-full">
                  Không có ảnh.
                </div>
              )}
              {illustrationsList.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    console.log("[UI] click illustration", it);
                    setSelectedIllustrationId(it.id);
                  }}
                  className={`rounded border p-1 overflow-hidden focus:outline-none ${
                    selectedIllustrationId === it.id
                      ? "border-purple-500 ring-2 ring-purple-200"
                      : "border-white/10 hover:border-gray-300"
                  }`}
                >
                  <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={gsToHttp(it.url)}
                      alt={it.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(
                          "[UI] image onError, src =",
                          (e.currentTarget as HTMLImageElement).src
                        );
                        (
                          e.currentTarget.parentElement as HTMLElement
                        ).innerHTML = `<div class="p-2 text-xs text-center text-gray-600">${it.title}</div>`;
                      }}
                    />
                  </div>
                  <div className="text-xs mt-2 text-left text-gray-700 truncate">
                    {it.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded p-3 bg-gray-50">
            <div className="text-sm text-gray-600 mb-2">Preview</div>
            {selectedIllustrationId ? (
              <div className="flex items-center justify-center">
                <img
                  src={gsToHttp(
                    illustrationsList.find(
                      (i) => i.id === selectedIllustrationId
                    )?.url || ""
                  )}
                  alt="Preview"
                  className="max-h-[60vh] object-contain rounded"
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500">Chưa chọn ảnh.</div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              console.log("[UI] click Hủy");
              onClose();
            }}
          >
            Huỷ
          </Button>

          {/* Thêm AR: lưu page + tạo page-illustration rồi mở dialog marker */}
          <Button
            variant="outline"
            disabled={createPageIllustration.isPending || updatePage.isPending}
            onClick={async () => {
              console.log("[UI] CLICK Thêm AR (marker)", {
                pageId,
                selectedIllustrationId,
              });
              const ok = await savePictureToPage();
              console.log("[UI] Thêm AR -> savePictureToPage result:", ok);
              if (!ok) return;

              console.log("[UI] open MarkerPageDialog");
              setOpenMarkerDialog(true);
            }}
          >
            Thêm AR (marker)
          </Button>

          <Button
            onClick={handleSave}
            disabled={updatePage.isPending || createPageIllustration.isPending}
          >
            {updatePage.isPending || createPageIllustration.isPending
              ? "Đang lưu..."
              : "Lưu ảnh vào trang"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <MarkerPageDialog
        isOpen={openMarkerDialog}
        onClose={() => {
          console.log("[MarkerPageDialog] onClose");
          setOpenMarkerDialog(false);
        }}
        pageId={pageId ?? undefined}
        pageNumber={pageNumber}
        onSaved={async () => {
          console.log("[MarkerPageDialog] onSaved");
          setOpenMarkerDialog(false);
          onSaved?.();
        }}
      />
    </Dialog>
  );
}

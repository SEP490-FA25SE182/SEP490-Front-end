import { useEffect, useState } from "react";
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
import { useCreatePage, useGetAllPages } from "@/services/BookManageService";
import { useToast } from "@/components/ui/use-toast";
import ImagePageDialog from "./ImagePageDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId?: string;
  onCreated?: () => void;
}

export default function EmptyPageDialog({ isOpen, onClose, chapterId, onCreated }: Props) {
  const [pageNumber, setPageNumber] = useState<number | "">("");
  // set default non-editable content
  const DEFAULT_EMPTY_PAGE_TEXT = "Xin chào, đây là trang trống. Vui lòng thêm nội dung sau.";
  const [content, setContent] = useState<string>(DEFAULT_EMPTY_PAGE_TEXT); // fixed default text
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);
  const [openImageDialog, setOpenImageDialog] = useState(false);

  const { toast } = useToast();
  const createPage = useCreatePage();
  const { data: pagesResp } = useGetAllPages(chapterId ? { chapterId } : undefined);

  useEffect(() => {
    if (!isOpen) {
      setPageNumber("");
      // reset to default text when dialog closes
      setContent(DEFAULT_EMPTY_PAGE_TEXT);
      setCreatedPageId(null);
      setOpenImageDialog(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!chapterId || pageNumber === "") {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số trang và chọn chương.",
        variant: "destructive",
      });
      return;
    }

    const list = Array.isArray(pagesResp)
      ? pagesResp
      : Array.isArray((pagesResp as any)?.content)
      ? (pagesResp as any).content
      : [];

    const duplicate = list.some(
      (p: any) => Number(p.pageNumber) === Number(pageNumber) && p.isActived !== "INACTIVE"
    );

    if (duplicate) {
      toast({
        title: "Trùng số trang",
        description: `Đã tồn tại trang số ${pageNumber}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (!createdPageId) {
        const res: any = await createPage.mutateAsync({
          pageNumber: Number(pageNumber),
          content,
          chapterId,
          isActived: "ACTIVE",
        });
        const pid = res?.pageId ?? res?.id ?? res?.page_id ?? null;
        setCreatedPageId(pid);
      } else {
        // if already created earlier, skip (update not implemented here)
      }

      toast({ title: "Lưu thành công", description: `Trang ${pageNumber} đã được lưu.` });
      onCreated?.();
      onClose();
    } catch (err: any) {
      console.error("Lỗi tạo trang:", err);
      toast({
        title: "Lỗi",
        description: err?.response?.data?.message || "Không thể tạo trang.",
        variant: "destructive",
      });
    }
  };

  const handleOpenImageDialog = async () => {
    if (!chapterId || pageNumber === "") {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số trang và nội dung trước khi thêm ảnh.",
        variant: "destructive",
      });
      return;
    }

    if (!createdPageId) {
      try {
        const res: any = await createPage.mutateAsync({
          pageNumber: Number(pageNumber),
          content,
          chapterId,
          isActived: "ACTIVE",
        });
        const pid = res?.pageId ?? res?.id ?? res?.page_id ?? null;
        setCreatedPageId(pid);
      } catch (err: any) {
        toast({
          title: "Tạo trang thất bại",
          description: err?.response?.data?.message || "Không thể tạo trang để gắn ảnh.",
          variant: "destructive",
        });
        return;
      }
    }

    setOpenImageDialog(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo trang ảnh (trang trống)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="mb-2">Số trang</Label>
            <Input
              type="number"
              value={pageNumber as any}
              onChange={(e) => setPageNumber(e.target.value === "" ? "" : Number(e.target.value))}
              className="bg-gray-100 border border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <Label className="mb-2">Nội dung</Label>
            <div className="border rounded bg-gray-900 p-2">
              <textarea
                value={content}
                readOnly
                rows={4}
                className="w-full bg-transparent text-gray-200 resize-none outline-none p-2"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Huỷ</Button>
            <Button onClick={handleOpenImageDialog} disabled={createPage.isPending}>Thêm ảnh</Button>
          </div>

          <div>
            <Button onClick={handleSave} disabled={createPage.isPending}>
              {createPage.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <ImagePageDialog
        isOpen={openImageDialog}
        onClose={() => setOpenImageDialog(false)}
        pageId={createdPageId}
        pageNumber={typeof pageNumber === "number" ? pageNumber : undefined}
        chapterId={chapterId}
        onSaved={() => {
          setOpenImageDialog(false);
          onCreated?.();
        }}
      />
    </Dialog>
  );
}
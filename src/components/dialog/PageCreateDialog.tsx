// src/components/author/PageCreateDialog.tsx
import React, { useState, useEffect } from "react";
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId?: string;
  onCreated?: () => void;
}

export const PageCreateDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  chapterId,
  onCreated,
}) => {
  const [pageNumber, setPageNumber] = useState<number | "">("");
  const [content, setContent] = useState(
    "Xin chào, đây là trang trống. Vui lòng thêm nội dung sau."
  );
  const { toast } = useToast();

  const createPage = useCreatePage();
  const { data: pagesResp } = useGetAllPages(
    chapterId ? { chapterId } : undefined
  );

  useEffect(() => {
    if (!isOpen) {
      setPageNumber("");
      setContent("Xin chào, đây là trang trống. Vui lòng thêm nội dung sau.");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!chapterId || pageNumber === "") {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số trang và đảm bảo chương đã được chọn.",
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
      (p: any) =>
        Number(p.pageNumber) === Number(pageNumber) &&
        p.isActived !== "INACTIVE"
    );

    if (duplicate) {
      toast({
        title: "Trùng số trang",
        description: `Đã tồn tại trang số ${pageNumber} trong chương này.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createPage.mutateAsync({
        pageNumber: Number(pageNumber),
        content,
        chapterId,
        isActived: "ACTIVE",
      });

      toast({
        title: "Tạo trang thành công",
        description: `Trang ${pageNumber} đã được tạo.`,
      });

      onCreated?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Tạo trang thất bại",
        description:
          err?.response?.data?.message ||
          "Đã xảy ra lỗi khi tạo trang. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo trang trống mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="mb-3">Số trang</Label>
            <Input
              type="number"
              value={pageNumber as any}
              onChange={(e) =>
                setPageNumber(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="Ví dụ: 1"
            />
          </div>

          <div>
            <Label className="mb-3">Nội dung</Label>
            <Input
              readOnly
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={createPage.isPending}>
            {createPage.isPending ? "Đang tạo..." : "Tạo trang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

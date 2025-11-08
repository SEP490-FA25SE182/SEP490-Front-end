import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateChapter, useGetAllChapters } from "@/services/BookManageService";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string;
  onCreated?: () => void;
}

export const ChapterCreateDialog: React.FC<Props> = ({ isOpen, onClose, bookId, onCreated }) => {
  const [chapterName, setChapterName] = useState("");
  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [decription, setDecription] = useState("");
  const { toast } = useToast();
  const createChapter = useCreateChapter();
  const { data: chaptersResp } = useGetAllChapters(
    bookId ? { bookId } : undefined
  );

  useEffect(() => {
    if (!isOpen) {
      setChapterName("");
      setChapterNumber("");
      setDecription("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!chapterName.trim() || chapterNumber === "" || !bookId) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập tên chương, số chương và đảm bảo sách đã được chọn.",
        variant: "destructive",
      });
      return;
    }

    const chapters = Array.isArray(chaptersResp)
      ? chaptersResp
      : Array.isArray((chaptersResp as any)?.content)
        ? (chaptersResp as any).content
        : [];

    const duplicate = chapters.some(
      (c: any) => Number(c.chapterNumber) === Number(chapterNumber) && c.isActived !== "INACTIVE"
    );

    if (duplicate) {
      toast({
        title: "Trùng số thứ tự",
        description: `Đã tồn tại chương số ${chapterNumber} trong sách này. Vui lòng chọn số khác.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await createChapter.mutateAsync({
        chapterName: chapterName.trim(),
        chapterNumber: Number(chapterNumber),
        decription: decription.trim(),
        bookId,
      });

      toast({
        title: "Tạo chương thành công",
        description: `“${chapterName}” đã được tạo.`,
      });

      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Tạo chapter thất bại:", err);
      toast({
        title: "Tạo chương thất bại",
        description: "Đã xảy ra lỗi khi tạo chương. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo chương mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="mb-3">Tên chương</Label>
            <Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="Ví dụ: Chương 1 - Khởi đầu" />
          </div>

          <div>
            <Label className="mb-3">Thứ tự chương</Label>
            <Input
              type="number"
              value={chapterNumber as any}
              onChange={(e) => setChapterNumber(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ví dụ: 1"
            />
          </div>

          <div>
            <Label className="mb-3">Mô tả</Label>
            <Textarea value={decription} onChange={(e) => setDecription(e.target.value)} placeholder="Mô tả ngắn (tuỳ chọn)" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">Huỷ</Button>
          <Button onClick={handleSubmit}>
            Tạo chương
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

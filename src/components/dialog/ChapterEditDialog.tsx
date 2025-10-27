import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateChapter } from "@/services/BookManageService";
import { useToast } from "@/components/ui/use-toast";
import type { Chapter } from "@/services/BookManageService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapter?: Chapter | null;
  onUpdated?: () => void;
}

export const ChapterEditDialog: React.FC<Props> = ({ isOpen, onClose, chapter, onUpdated }) => {
  const [chapterName, setChapterName] = useState("");
  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [decription, setDecription] = useState("");
  const updateChapter = useUpdateChapter();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && chapter) {
      setChapterName(chapter.chapterName || "");
      setChapterNumber(chapter.chapterNumber ?? "");
      setDecription(chapter.decription || "");
    }
    if (!isOpen) {
      setChapterName("");
      setChapterNumber("");
      setDecription("");
    }
  }, [isOpen, chapter]);

  const handleSave = async () => {
    if (!chapter) return;
    if (!chapterName.trim() || chapterNumber === "") {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập tên chương và số chương.", variant: "destructive" });
      return;
    }

    try {
      await updateChapter.mutateAsync({
        id: chapter.chapterId as string,
        data: {
          chapterName: chapterName.trim(),
          chapterNumber: Number(chapterNumber),
          decription: decription.trim(),
          // keep bookId unchanged
        },
      });

      toast({ title: "Cập nhật thành công", description: `Chương "${chapterName}" đã được cập nhật.` });
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error("Cập nhật chapter lỗi:", err);
      toast({ title: "Cập nhật thất bại", description: "Không thể cập nhật chương. Vui lòng thử lại.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa chương</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label>Tên chương</Label>
            <Input value={chapterName} onChange={(e) => setChapterName(e.target.value)} placeholder="Tên chương" />
          </div>

          <div>
            <Label>Số chương</Label>
            <Input
              type="number"
              value={chapterNumber as any}
              onChange={(e) => setChapterNumber(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Số chương"
            />
          </div>

          <div>
            <Label>Mô tả</Label>
            <Textarea value={decription} onChange={(e) => setDecription(e.target.value)} placeholder="Mô tả ngắn (tuỳ chọn)" />
          </div>

          <div>
            <Label>Sách (không thể chỉnh)</Label>
            <Input value={chapter?.bookId ?? ""} readOnly />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="mr-2">Huỷ</Button>
          <Button onClick={handleSave}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterEditDialog;

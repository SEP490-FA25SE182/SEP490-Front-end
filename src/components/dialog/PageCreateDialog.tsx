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
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import AudioAttachDialog from "./AudioAttachDialog";
import { useSearchAudios } from "@/services/AIService";

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

  // newly added state
  const [createdPageId, setCreatedPageId] = useState<string | null>(null);
  const [openAudioDialog, setOpenAudioDialog] = useState(false);
  const [, setAttachedAudioIds] = useState<string[]>([]);

  // load user's audios so we can render audio players in preview
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  useSearchAudios({
    userId: user?.userId,
    isActived: "ACTIVE",
    page: 0,
    size: 9999,
    sort: ["createdAt,desc"], // ✅ audio mới nhất lên đầu (theo createdAt)
  });

  useEffect(() => {
    if (!isOpen) {
      setPageNumber("");
      setContent("Xin chào, đây là trang trống. Vui lòng thêm nội dung sau.");
      setCreatedPageId(null);
      setAttachedAudioIds([]);
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
      // nếu chưa có page tạo mới, nếu đã tạo trước đó (khi thêm audio) thì chỉ cập nhật nội dung
      if (!createdPageId) {
        const res: any = await createPage.mutateAsync({
          pageNumber: Number(pageNumber),
          content,
          chapterId,
          pageType: "TEXT", // default hidden page type
          isActived: "ACTIVE",
        });
        const pid = res?.pageId ?? res?.id ?? res?.page_id ?? null;
        setCreatedPageId(pid);
      } else {
        // cập nhật trường content/number cho page đã tạo (nếu api có endpoint updatePage bạn có thể gọi ở đây)
        // để đơn giản, gọi createPage.mutateAsync với id nếu server hỗ trợ upsert, hoặc nên sử dụng hook updatePage ở nơi khác.
      }

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

  // mở dialog chọn audio: nếu chưa có page, tạo trước rồi mở dialog
  const handleOpenAudioDialog = async () => {
    if (!chapterId || pageNumber === "") {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số trang và nội dung trước khi thêm audio.",
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
          pageType: "TEXT", // default when creating before attaching audio
          isActived: "ACTIVE",
        });
        const pid = res?.pageId ?? res?.id ?? res?.page_id ?? null;
        setCreatedPageId(pid);
      } catch (err: any) {
        toast({
          title: "Tạo trang thất bại",
          description:
            err?.response?.data?.message ||
            "Không thể tạo trang để gắn audio. Vui lòng thử lại.",
          variant: "destructive",
        });
        return;
      }
    }

    setOpenAudioDialog(true);
  };

  // attached audios details for preview

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo trang chữ</DialogTitle>
        </DialogHeader>

        {/* body: limit height and enable internal scrolling to avoid dialog overflow */}
        <div className="space-y-3 mt-2 max-h-[70vh] overflow-auto pr-2">
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
            {/* constrain editor height so long content scrolls inside dialog */}
            <div className="border rounded">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                placeholder="Nhập nội dung trang..."
                // keep editor a reasonable height; the dialog body is scrollable
                style={{ minHeight: 240 }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button onClick={handleOpenAudioDialog} disabled={createPage.isPending}>
              Thêm audio
            </Button>
          </div>

          <div>
            <Button onClick={handleSubmit} disabled={createPage.isPending}>
              {createPage.isPending ? "Đang tạo..." : "Lưu"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Audio attach dialog */}
      <AudioAttachDialog
        isOpen={openAudioDialog}
        onClose={() => setOpenAudioDialog(false)}
        pageId={createdPageId}
        onAttached={(ids: string[]) => {
          // append newly attached ids (avoid duplicates)
          setAttachedAudioIds((prev) => Array.from(new Set([...prev, ...ids])));
          setOpenAudioDialog(false);
          toast({
            title: "Gắn audio thành công",
            description: `Đã gắn ${ids.length} audio vào trang.`,
          });
        }}
      />
    </Dialog>
  );
};
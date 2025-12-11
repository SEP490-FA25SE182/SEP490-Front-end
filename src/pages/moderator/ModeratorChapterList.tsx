import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ModeratorLayout from "./ModeratorLayout";
import { getAllChapters } from "@/services/BookManageService";
import { Button } from "@/components/ui/button";
import { updateChapter } from "@/services/BookManageService";
import { getBookById } from "@/services/BookManageService";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";



import { ChevronDown } from "lucide-react";


import { Textarea } from "@/components/ui/textarea";


export default function ModeratorChapterList() {
  const { bookId } = useParams<{ bookId: string }>();
  const [chapters, setChapters] = useState<any[]>([]);
    const { state } = useLocation() as any;


  const [open, setOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [comment, setComment] = useState("");

  const navigate = useNavigate();

  const [authorId, setAuthorId] = useState<string | null>(state?.authorId ?? null);

// Nếu reload mất state → fetch lại authorId từ bookId
useEffect(() => {
  if (!authorId && bookId) {
    getBookById(bookId).then((book: any) => {
      setAuthorId(book.authorId);
    });
  }
}, [authorId, bookId]);

  useEffect(() => {
    const load = async () => {
      const res = await getAllChapters({ bookId });
      const list = Array.isArray(res) ? res : res.content ?? [];
      setChapters(list.filter((c: any) => c.progressStatus === 0));
    };
    load();
  }, [bookId]);






  const openDialog = (ch: any) => {
    setSelectedChapter(ch);
    setComment("");
    setOpen(true);
  };

  const handleReview = async (status: number) => {
    if (!selectedChapter) return;

    await updateChapter(selectedChapter.chapterId, {
      chapterName: selectedChapter.chapterName,
      chapterNumber: selectedChapter.chapterNumber,
      decription: selectedChapter.decription,
      bookId: selectedChapter.bookId,
      progressStatus: status,
      review: comment,
    });

    setChapters(prev =>
      prev.filter(c => c.chapterId !== selectedChapter.chapterId)
    );

    setOpen(false);
  };



  return (
    <ModeratorLayout
      title="Chapters cần duyệt"
      breadcrumb={[
        { label: "Moderator", to: "/moderator" },
        { label: "Chapters" },
      ]}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {chapters.map((ch) => (
          <div
            key={ch.chapterId}
            className="bg-white/5 p-3 rounded text-center"
          >
            <div className="text-sm">{ch.chapterName}</div>
            <Button
              className="mt-2 text-xs"
              onClick={() =>
                navigate(`/moderator/chapters/${ch.chapterId}/pages`)
              }
            >
              Xem trang
            </Button>
            <Button
              className="text-xs bg-green-600 hover:bg-green-700"
              onClick={() => openDialog(ch)}
            >
              Duyệt
            </Button>

          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-[#1a2332] text-white">
          <DialogHeader>
            <DialogTitle>Duyệt chương</DialogTitle>
          </DialogHeader>

          {selectedChapter && (
            <div className="space-y-3 text-sm">
              <div>
                <b>Tên chương:</b> {selectedChapter.chapterName}
              </div>

              <div>
                <b>Thứ tự chương:</b> {selectedChapter.chapterNumber}
              </div>

              <div>
                <b>Mô tả:</b>
                <p className="text-gray-300 text-xs mt-1">
                  {selectedChapter.decription}
                </p>
              </div>

              <div>
                <b>Trạng thái:</b>{" "}
                <span className="text-yellow-400 font-medium">
                  Đang kiểm duyệt
                </span>
              </div>

              {/* Comment + dropdown */}
              <div className="relative">
                <Textarea
                  placeholder="Nhập lý do..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="pr-12 bg-white/10 text-white"
                />

                <div className="absolute top-1 right-1">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="h-8 w-8 bg-white/20 flex items-center justify-center rounded">
                        <ChevronDown className="w-4 h-4 text-white" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Content className="bg-[#1a2332] text-white p-2 rounded">
                      <DropdownMenu.Item onClick={() => setComment("Nội dung không phù hợp")}>
                        Nội dung không phù hợp
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onClick={() => setComment("Thiếu nội dung chương")}>
                        Thiếu nội dung chương
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onClick={() => setComment("Vi phạm chính sách")}>
                        Vi phạm chính sách
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
              </div>



              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button

                  className="bg-red-600"
                  onClick={() => handleReview(1)}
                >
                  Từ chối
                </Button>

                <Button
                  className="bg-green-600"
                  onClick={() => handleReview(2)}
                >
                  Duyệt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </ModeratorLayout>
  );
}

import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useSearchQuizzes, type Quiz } from "@/services/QuizService";
import { useGetChapterById } from "@/services/BookManageService";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuizDetailDialog from "@/components/dialog/QuizDetailDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId?: string;
  onSelected?: (quiz: Quiz) => void;
}

const QuizChapterDialog: React.FC<Props> = ({ isOpen, onClose, chapterId }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [openDetailDialog, setOpenDetailDialog] = React.useState(false);
  const [detailQuizId, setDetailQuizId] = React.useState<string | null>(null);

  const params = {
    page: 0,
    size: 100,
    chapterId: chapterId ?? undefined,
    isActived: "ACTIVE",
  };
  const { data, isLoading, isError, refetch } = useSearchQuizzes(params);
  // fetch chapter info to display chapterName
  const { data: chapter } = useGetChapterById(chapterId ?? "");

  useEffect(() => {
    if (isOpen) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chapterId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[80vw] max-w-[95vw] bg-white text-black rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">
            Quiz của {chapter?.chapterName ?? chapterId ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-3 text-sm text-gray-600">Danh sách quiz theo chương</div>

          <div>
            {isLoading ? (
              <div className="text-sm text-gray-500">Đang tải quiz...</div>
            ) : isError ? (
              <div className="text-sm text-red-500">Lỗi khi tải quiz.</div>
            ) : !(
              data &&
              Array.isArray((data as any).content) &&
              (data as any).content.length > 0
            ) ? (
              <div className="text-sm text-gray-500">Không tìm thấy quiz cho chương này.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(data as any).content.map((q: Quiz) => {
                  const qId = q.quizId ?? q.id;
                  return (
                    <div key={qId ?? `${q.title}-${Math.random()}`} className="relative">
                      {/* dropdown in top-right of each quiz card */}
                      <div className="absolute top-2 right-2 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="h-6 w-6 rounded-full bg-white/80 flex items-center justify-center text-black hover:bg-white"
                              aria-label="options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!qId) {
                                  toast({ title: "Không tìm thấy quizId", variant: "destructive" });
                                  return;
                                }
                                setDetailQuizId(qId);
                                setOpenDetailDialog(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!qId) {
                                  toast({ title: "Không tìm thấy quizId", variant: "destructive" });
                                  return;
                                }
                                // navigate to quiz edit page (adjust route if different)
                                navigate(`/author/quizzes/${qId}/edit`);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Sửa nội dung
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div
                        // make card non-clickable — only dropdown is interactive
                        className="rounded border p-3 bg-white text-black shadow-sm transition"
                        onClick={(e) => {
                          // prevent accidental propagation to dialog background or parent handlers
                          e.stopPropagation();
                        }}
                        role="group"
                        aria-disabled="true"
                      >
                        <div className="font-medium text-gray-900 truncate">{q.title}</div>
                        <div className="text-xs text-gray-600 mt-1">Tổng điểm: {q.totalScore ?? "-"}</div>
                        <div className="text-xs text-gray-600">Số câu: {q.questionCount ?? "-"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onClose()} className="text-black">Đóng</Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Quiz detail dialog instance */}
      <QuizDetailDialog
        isOpen={openDetailDialog}
        onClose={() => {
          setOpenDetailDialog(false);
          setDetailQuizId(null);
        }}
        quizId={detailQuizId ?? undefined}
      />
    </Dialog>
  );
};

export default QuizChapterDialog;
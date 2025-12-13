import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSearchQuizzes, type Quiz } from "@/services/QuizService";
import { useGetChapterById } from "@/services/BookManageService";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import QuizDetailDialog from "@/components/dialog/QuizDetailDialog";
import QuizEditDialog from "@/components/dialog/QuizEditDialog";
import QuizCreateDialog from "@/components/dialog/QuizCreateDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId?: string;
  onSelected?: (quiz: Quiz) => void;
}

const QuizChapterDialog: React.FC<Props> = ({ isOpen, onClose, chapterId }) => {
  const { toast } = useToast();

  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [detailQuizId, setDetailQuizId] = useState<string | null>(null);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editQuizId, setEditQuizId] = useState<string | null>(null);

  // NEW: create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [lastCreatedQuizId, setLastCreatedQuizId] = useState<string | null>(
    null
  );

  const params = useMemo(
    () => ({
      page: 0,
      size: 100,
      chapterId: chapterId ?? undefined,
      isActived: "ACTIVE",
    }),
    [chapterId]
  );

  const { data, isLoading, isError, refetch } = useSearchQuizzes(params);

  // fetch chapter info to display chapterName
  const { data: chapter } = useGetChapterById(chapterId ?? "");

  useEffect(() => {
    if (isOpen) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chapterId]);

  const handleCreated = () => {
    toast({ title: "Tạo quiz thành công" });
    setOpenCreate(false);
    refetch(); // quay về QuizChapterDialog và load quiz mới
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="w-[80vw] max-w-[95vw] bg-white text-black rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-black">
              Quiz của {chapter?.chapterName ?? chapterId ?? ""}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="mb-3 text-sm text-gray-600">
              Danh sách quiz theo chương
            </div>

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
                <div className="text-sm text-gray-500">
                  Không tìm thấy quiz cho chương này.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(data as any).content.map((q: Quiz) => {
                    const qId = q.quizId ?? q.id;

                    return (
                      <div key={qId ?? `${q.title}-${Math.random()}`} className="relative">
                        {/* dropdown for each quiz card */}
                        <div className="absolute top-2 right-2 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 bg-white/0 text-gray-600"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailQuizId(qId ?? null);
                                  setOpenDetailDialog(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditQuizId(qId ?? null);
                                  setOpenEditDialog(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Sửa quiz
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div
                          className={[
                            "rounded border p-3 bg-white text-black shadow-sm transition",
                            qId && lastCreatedQuizId === qId
                              ? "ring-2 ring-purple-500"
                              : "",
                          ].join(" ")}
                          role="group"
                        >
                          <div className="font-medium text-gray-900 truncate">
                            {q.title}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Tổng điểm: {q.totalScore ?? "-"}
                          </div>
                          <div className="text-xs text-gray-600">
                            Số câu: {q.questionCount ?? "-"}
                          </div>
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
              <Button
                variant="ghost"
                onClick={() => onClose()}
                className="text-black"
              >
                Đóng
              </Button>

              {/* NEW: create quiz button */}
              <Button
                onClick={() => setOpenCreate(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!chapterId}
              >
                Tạo Quiz
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>

        {/* quiz detail dialog */}
        <QuizDetailDialog
          isOpen={openDetailDialog}
          onClose={() => {
            setOpenDetailDialog(false);
            setDetailQuizId(null);
          }}
          quizId={detailQuizId ?? undefined}
        />

        <QuizEditDialog
          isOpen={openEditDialog}
          onClose={() => {
            setOpenEditDialog(false);
            setEditQuizId(null);
          }}
          quizId={editQuizId ?? undefined}
        />
      </Dialog>

      {/* NEW: quiz create dialog */}
      <QuizCreateDialog
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        initialChapterId={chapterId ?? undefined}
        onCreated={handleCreated}
        onQuizFullyCreated={(quizId) => {
          // highlight quiz vừa tạo
          setLastCreatedQuizId(quizId);
        }}
      />
    </>
  );
};

export default QuizChapterDialog;

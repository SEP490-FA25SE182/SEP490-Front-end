import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetQuizPlayById } from "@/services/QuizService";
import QuizDetailDialog from "@/components/dialog/QuizDetailDialog";
import QuizEditDialog from "@/components/dialog/QuizEditDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId?: string | null;
  quizId?: string | null | undefined;
}

const QuizChapterDialog: React.FC<Props> = ({ isOpen, onClose, chapterId }) => {
  const [openDetailDialog, setOpenDetailDialog] = React.useState(false);
  const [detailQuizId, setDetailQuizId] = React.useState<string | null>(null);
  // edit dialog state (open from chapter dropdown) — avoids client-side navigation to non-existent route
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editQuizId, ] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetQuizPlayById(chapterId ?? undefined);

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chapterId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="xl" className="w-[80vw] max-w-[95vw] bg-white text-black rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">
            {data ? data.title : chapterId ? `Chương ${chapterId}` : "Chi tiết chương"}
          </DialogTitle>
        </DialogHeader>

        {/* constrained body with internal scrollbar to prevent dialog overflow */}
        <div className="mt-4">
          <div className="text-sm text-gray-700 mb-3">
            Tổng điểm: <strong>{data?.totalScore ?? "-"}</strong> — Số câu: <strong>{data?.questionCount ?? "-"}</strong>
          </div>

          <div className="max-h-[65vh] overflow-auto pr-4 space-y-3">
            {isLoading ? (
              <div className="text-sm text-gray-600">Đang tải...</div>
            ) : isError ? (
              <div className="text-sm text-red-500">Lỗi khi tải quiz.</div>
            ) : !data ? (
              <div className="text-sm text-gray-600">Không tìm thấy dữ liệu quiz.</div>
            ) : (
              /* questions displayed two cards per row */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(data.questions || []).map((q, qi) => (
                  <div key={q.questionId ?? `q-${qi}`} className="p-4 border rounded bg-gray-50">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 wrap-break-word">Câu {qi + 1} — {q.content}</div>
                        <div className="text-xs text-gray-500 mt-1">Điểm: {q.score}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.answers || []).map((a, ai) => (
                        <div
                          key={a.answerId ?? `a-${ai}`}
                          className={`p-2 rounded border ${a.isCorrect ? "border-green-400 bg-green-50" : "bg-white border-gray-200"}`}
                        >
                          <div className="text-sm text-gray-800 wrap-break-word">{a.content}</div>
                          <div className="text-xs text-gray-500 mt-1">{a.isCorrect ? "Đáp án đúng" : ""}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onClose()}>Đóng</Button>
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

      {/* Quiz edit dialog (opened from chapter dropdown) */}
      <QuizEditDialog
        isOpen={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        quizId={editQuizId ?? null}
        onSaved={() => {
          setOpenEditDialog(false);
          // refresh quizzes list
          refetch();
        }}
      />
    </Dialog>
  );
};

export default QuizChapterDialog;
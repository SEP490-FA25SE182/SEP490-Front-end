import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetQuizPlayById } from "@/services/QuizService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quizId?: string | null;
}

const QuizDetailDialog: React.FC<Props> = ({ isOpen, onClose, quizId }) => {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetQuizPlayById(quizId ?? undefined);

  React.useEffect(() => {
    if (isOpen && quizId) {
      refetch();
    }
  }, [isOpen, quizId, refetch]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent size="xl" className="w-[80vw] max-w-[95vw] bg-white text-black rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">
            {data ? data.title : "Chi tiết quiz"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="text-sm text-gray-700 mb-3">
            Tổng điểm: <strong>{data?.totalScore ?? "-"}</strong> — Số câu:{" "}
            <strong>{data?.questionCount ?? "-"}</strong>
          </div>

          <div className="max-h-[65vh] overflow-auto pr-4 space-y-3">
            {isLoading ? (
              <div className="text-sm text-gray-600">Đang tải...</div>
            ) : isError ? (
              <div className="text-sm text-red-500">Lỗi khi tải quiz.</div>
            ) : !data ? (
              <div className="text-sm text-gray-600">
                Không tìm thấy dữ liệu quiz.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.questions.map((q, qi) => (
                  <div key={q.questionId} className="p-4 border rounded bg-gray-50">
                    <div className="font-medium text-gray-800">
                      Câu {qi + 1} — {q.content}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Điểm: {q.score}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.answers.map((a, ai) => (
                        <div
                          key={a.answerId ?? `a-${ai}`}
                          className={`p-2 rounded border ${
                            a.isCorrect
                              ? "border-green-400 bg-green-50"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="text-sm text-gray-800">
                            {a.content}
                          </div>
                          {a.isCorrect && (
                            <div className="text-xs text-gray-500 mt-1">
                              Đáp án đúng
                            </div>
                          )}
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
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuizDetailDialog;

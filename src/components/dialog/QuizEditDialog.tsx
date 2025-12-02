import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  useGetQuizPlayById,
  useGetQuizById,
  useUpdateQuiz,
  useUpdateQuestion,
  useUpdateAnswer,
  type QuizPlay,
  type PlayQuestion,
  type PlayAnswer,
} from "@/services/QuizService";
import { useNavigate } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quizId?: string | null;
  onSaved?: () => void;
}

export default function QuizEditDialog({ isOpen, onClose, quizId, onSaved }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // fetch playable quiz (contains questions + answers)
  const {
    data: playData,
    isLoading,
    isError,
    refetch,
  } = useGetQuizPlayById(quizId ?? undefined);

  // also fetch quiz meta (title) to allow updating other fields if needed
  const { data: quizMeta } = useGetQuizById(quizId ?? undefined);

  const updateQuiz = useUpdateQuiz();
  const updateQuestion = useUpdateQuestion();
  const updateAnswer = useUpdateAnswer();

  // local editable state
  const [title, setTitle] = useState<string>("");
  const [questions, setQuestions] = useState<PlayQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quizId]);

  useEffect(() => {
    if (playData) {
      setQuestions((playData as QuizPlay).questions?.map((q) => ({ ...q })) ?? []);
    }
    if (quizMeta) {
      setTitle((quizMeta as any).title ?? "");
    }
  }, [playData, quizMeta]);

  const handleQuestionChange = (index: number, changes: Partial<PlayQuestion>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...changes };
      return copy;
    });
  };

  const handleAnswerChange = (qIndex: number, aIndex: number, changes: Partial<PlayAnswer>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      const answers = (q.answers ?? []).map((a) => ({ ...a }));
      answers[aIndex] = { ...answers[aIndex], ...changes } as PlayAnswer;
      q.answers = answers;
      copy[qIndex] = q;
      return copy;
    });
  };

  const saveQuizMeta = async () => {
    if (!quizId) return;
    try {
      setSaving(true);
      await updateQuiz.mutateAsync({ id: quizId, data: { ...(quizMeta as any), title } });
      toast({ title: "Cập nhật quiz thành công" });
      onSaved?.();
      refetch();
    } catch (err) {
      console.error(err);
      toast({ title: "Lỗi khi cập nhật quiz", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveQuestionAndAnswers = async (q: PlayQuestion) => {
    try {
      setSaving(true);
      // update question (API expects Question shape; map fields)
      if (q.questionId) {
        await updateQuestion.mutateAsync({
          id: q.questionId,
          data: {
            // minimal required payload: quizId, content, score, answerCount
            quizId: quizId as string,
            content: q.content,
            score: q.score,
            answerCount: q.answerCount ?? (q.answers?.length ?? 0),
            isActived: "ACTIVE",
          } as any,
        });
      }

      // update answers
      if (q.answers && q.answers.length) {
        for (const a of q.answers) {
          if (!a.answerId) continue;
          await updateAnswer.mutateAsync({
            id: a.answerId,
            data: {
              content: a.content,
              isCorrect: a.isCorrect,
              questionId: q.questionId ?? "",
              isActived: "ACTIVE",
            } as any,
          });
        }
      }

      toast({ title: "Cập nhật câu hỏi thành công" });
      refetch();
    } catch (err) {
      console.error(err);
      toast({ title: "Lỗi khi cập nhật câu hỏi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (!quizId) return;
    try {
      setSaving(true);
      // update quiz meta first
      await updateQuiz.mutateAsync({ id: quizId, data: { ...(quizMeta as any), title } });
      // update all questions & answers sequentially
      for (const q of questions) {
        if (q.questionId) {
          await updateQuestion.mutateAsync({
            id: q.questionId,
            data: {
              quizId: quizId,
              content: q.content,
              score: q.score,
              answerCount: q.answerCount ?? (q.answers?.length ?? 0),
              isActived: "ACTIVE",
            } as any,
          });
        }
        if (q.answers && q.answers.length) {
          for (const a of q.answers) {
            if (!a.answerId) continue;
            await updateAnswer.mutateAsync({
              id: a.answerId,
              data: {
                content: a.content,
                isCorrect: a.isCorrect,
                questionId: q.questionId ?? "",
                isActived: "ACTIVE",
              } as any,
            });
          }
        }
      }
      toast({ title: "Lưu tất cả thay đổi thành công" });
      onSaved?.();
      refetch();
    } catch (err) {
      console.error(err);
      toast({ title: "Lỗi khi lưu thay đổi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[80vw] max-w-[95vw] bg-white text-black rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">
            Chỉnh sửa Quiz - {quizMeta ? (quizMeta as any).title : quizId ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Tiêu đề Quiz</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-1">Chỉnh sửa tiêu đề quiz tại đây.</div>
            <div className="mt-2 flex gap-2">
              <Button onClick={saveQuizMeta} disabled={saving}>
                Lưu tiêu đề
              </Button>
              <Button variant="ghost" onClick={() => { if (quizId) navigate(`/author/quizzes/${quizId}/edit`); }}>
                Mở trang chỉnh sửa đầy đủ
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-700 mb-2">Câu hỏi</div>

            <div className="max-h-[60vh] overflow-auto pr-4 space-y-4">
              {isLoading ? (
                <div className="text-sm text-gray-600">Đang tải dữ liệu...</div>
              ) : isError ? (
                <div className="text-sm text-red-500">Lỗi khi tải dữ liệu quiz.</div>
              ) : !questions || questions.length === 0 ? (
                <div className="text-sm text-gray-600">Không có câu hỏi.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {questions.map((q, qi) => (
                    <div key={q.questionId ?? `q-${qi}`} className="p-4 border rounded bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-sm font-medium">Câu {qi + 1}</div>
                          <textarea
                            className="w-full mt-2 border rounded px-3 py-2"
                            value={q.content ?? ""}
                            onChange={(e) => handleQuestionChange(qi, { content: e.target.value })}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <label className="text-xs text-gray-600">Điểm:</label>
                            <input
                              type="number"
                              className="w-24 border rounded px-2 py-1"
                              value={q.score ?? 0}
                              onChange={(e) => handleQuestionChange(qi, { score: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Button size="sm" onClick={() => saveQuestionAndAnswers(q)} disabled={saving}>
                            Lưu câu
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.answers || []).map((a, ai) => (
                          <div key={a.answerId ?? `a-${ai}`} className={`p-2 rounded border ${a.isCorrect ? "border-green-400 bg-green-50" : "bg-white border-gray-200"}`}>
                            <div className="flex items-center justify-between gap-2">
                              <input
                                className="flex-1 border-none bg-transparent px-1 py-1"
                                value={a.content}
                                onChange={(e) => handleAnswerChange(qi, ai, { content: e.target.value })}
                              />
                              <label className="ml-2 flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!a.isCorrect}
                                  onChange={(e) => handleAnswerChange(qi, ai, { isCorrect: e.target.checked })}
                                />{" "}
                                Đúng
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">Tổng {questions.length} câu</div>
              <div className="flex gap-2">
                <Button onClick={saveAll} disabled={saving}>
                  Lưu tất cả
                </Button>
                <Button variant="ghost" onClick={() => refetch()}>Tải lại</Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onClose()}>Đóng</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
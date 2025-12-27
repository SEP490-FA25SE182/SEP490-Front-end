import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetQuizById,
  useGetQuizPlayById,
  useUpdateQuiz,
  useUpdateQuestion,
  useUpdateAnswer,
  type QuizPlay,
} from "@/services/QuizService";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quizId?: string | null;
}

const QuizEditDialog: React.FC<Props> = ({ isOpen, onClose, quizId }) => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: playData, isLoading, isError, refetch } = useGetQuizPlayById(
    quizId ?? undefined
  );
  //  lấy quiz meta để giữ chapterId + các field khác
  const { data: quizMeta } = useGetQuizById(quizId ?? undefined);

  const updateQuiz = useUpdateQuiz();
  const updateQuestion = useUpdateQuestion();
  const updateAnswer = useUpdateAnswer();

  const [local, setLocal] = useState<QuizPlay | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && quizId) {
      refetch();
    }
  }, [isOpen, quizId, refetch]);

  useEffect(() => {
    if (playData) {
      // clone to local editable state
      setLocal(JSON.parse(JSON.stringify(playData)));
    } else {
      setLocal(null);
    }
  }, [playData]);

  const handleChangeQuizMeta = (
    field: keyof Pick<QuizPlay, "title" | "totalScore">,
    value: any
  ) => {
    if (!local) return;
    setLocal((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleChangeQuestion = (
    qIndex: number,
    field: "content" | "score",
    value: any
  ) => {
    if (!local) return;
    setLocal((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      questions[qIndex] = { ...questions[qIndex], [field]: value };
      return { ...prev, questions };
    });
  };

  const handleChangeAnswer = (
    qIndex: number,
    aIndex: number,
    field: "content" | "isCorrect",
    value: any
  ) => {
    if (!local) return;
    setLocal((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions];
      const answers = [...questions[qIndex].answers];
      answers[aIndex] = { ...answers[aIndex], [field]: value };
      questions[qIndex] = { ...questions[qIndex], answers };
      return { ...prev, questions };
    });
  };

  const validateBeforeSave = () => {
    if (!local) return { ok: false, message: "Không có dữ liệu." };

    // validate quiz meta
    if (!local.title?.trim()) return { ok: false, message: "Thiếu tiêu đề quiz." };
    if (!Number(local.totalScore) || Number(local.totalScore) <= 0)
      return { ok: false, message: "Tổng điểm phải > 0." };

    // validate each question + answers (allow multiple correct)
    for (let qi = 0; qi < local.questions.length; qi++) {
      const q = local.questions[qi];

      if (!q.content?.trim())
        return { ok: false, message: `Câu ${qi + 1} chưa có nội dung.` };

      if (!Number(q.score) || Number(q.score) <= 0)
        return { ok: false, message: `Điểm của câu ${qi + 1} phải > 0.` };

      if (!q.answers || q.answers.length === 0)
        return { ok: false, message: `Câu ${qi + 1} chưa có đáp án.` };

      // nội dung đáp án
      for (let ai = 0; ai < q.answers.length; ai++) {
        if (!q.answers[ai].content?.trim()) {
          return {
            ok: false,
            message: `Đáp án ${ai + 1} của câu ${qi + 1} chưa có nội dung.`,
          };
        }
      }

      // ít nhất 1 đáp án đúng (KHÔNG giới hạn nhiều)
      const correctCount = q.answers.reduce(
        (s, a) => s + (a.isCorrect ? 1 : 0),
        0
      );
      if (correctCount === 0) {
        return {
          ok: false,
          message: `Câu ${qi + 1} phải có ít nhất 1 đáp án đúng.`,
        };
      }
    }

    // (tuỳ bạn) check tổng điểm câu bằng totalScore
    const sumQuestionScore = local.questions.reduce((s, q) => s + Number(q.score || 0), 0);
    if (sumQuestionScore !== Number(local.totalScore || 0)) {
      return {
        ok: false,
        message: `Tổng điểm các câu (${sumQuestionScore}) phải bằng tổng điểm quiz (${local.totalScore}).`,
      };
    }

    return { ok: true as const };
  };

  const handleSave = async () => {
    if (!local || !quizId) return;
    const v = validateBeforeSave();
    if (!v.ok) {
      toast({
        title: "Không thể lưu",
        description: v.message,
        variant: "destructive",
      });
      return;
    }

    if (!quizMeta) {
      toast({
        title: "Không tìm thấy quiz gốc",
        description: "Không thể lưu vì thiếu thông tin quiz.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      //  Update quiz meta, giữ nguyên chapterId và các field khác từ quizMeta
      await updateQuiz.mutateAsync({
        id: quizId,
        data: {
          ...quizMeta, // giữ chapterId, attemptCount, createdAt,...
          quizId, // ghi đè lại id nếu cần
          title: local.title,
          totalScore: local.totalScore,
          questionCount: local.questionCount,
        } as any,
      });

      //  Update questions & answers
      for (const q of local.questions) {
        if (q.questionId) {
          await updateQuestion.mutateAsync({
            id: q.questionId,
            data: {
              id: q.questionId,
              quizId,
              content: q.content,
              score: q.score,
              answerCount: q.answerCount ?? q.answers.length,
              isActived: "ACTIVE",
            } as any,
          });
        }

        for (const a of q.answers) {
          const aid = a.answerId ?? (a as any).id;
          if (aid) {
            await updateAnswer.mutateAsync({
              id: aid,
              data: {
                id: aid,
                questionId: q.questionId ?? "",
                content: a.content,
                isCorrect: a.isCorrect,
                isActived: "ACTIVE",
              } as any,
            });
          }
        }
      }

      //  Invalidate cache
      qc.invalidateQueries({ queryKey: ["quizzes", "play", quizId] });
      qc.invalidateQueries({ queryKey: ["quizzes", "search"] });

      toast({
        title: "Lưu thành công",
        description: "Đã cập nhật quiz.",
      });
      onClose();
    } catch (err) {
      toast({
        title: "Lưu thất bại",
        description: "Có lỗi khi lưu. Thử lại.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        size="xl"
        className="w-[85vw] max-w-[95vw] bg-white text-black rounded-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-black">
            {local ? `Chỉnh sửa: ${local.title}` : "Chỉnh sửa quiz"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="text-sm text-gray-600">Đang tải...</div>
          ) : isError ? (
            <div className="text-sm text-red-500">
              Lỗi khi tải dữ liệu quiz.
            </div>
          ) : !local ? (
            <div className="text-sm text-gray-600">
              Không có dữ liệu để chỉnh sửa.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  value={local.title}
                  onChange={(e) =>
                    handleChangeQuizMeta("title", e.target.value)
                  }
                  placeholder="Tiêu đề quiz"
                />
                <Input
                  value={String(local.totalScore ?? "")}
                  onChange={(e) =>
                    handleChangeQuizMeta(
                      "totalScore",
                      Number(e.target.value || 0)
                    )
                  }
                  placeholder="Tổng điểm"
                  type="number"
                />
                <Input
                  value={String(local.questionCount ?? "")}
                  disabled
                  placeholder="Số câu"
                />
              </div>

              <div className="max-h-[60vh] overflow-auto pr-4 space-y-3">
                {local.questions.map((q, qi) => (
                  <div
                    key={q.questionId ?? qi}
                    className="p-4 border rounded bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <Textarea
                          value={q.content}
                          onChange={(e) =>
                            handleChangeQuestion(qi, "content", e.target.value)
                          }
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Điểm:
                          <Input
                            className="w-24 inline-block ml-2"
                            type="number"
                            value={String(q.score ?? 0)}
                            onChange={(e) =>
                              handleChangeQuestion(
                                qi,
                                "score",
                                Number(e.target.value || 0)
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.answers.map((a, ai) => (
                        <div
                          key={a.answerId ?? ai}
                          className={`p-2 rounded border ${a.isCorrect
                            ? "border-green-400 bg-green-50"
                            : "bg-white border-gray-200"
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!a.isCorrect}
                              onChange={(e) =>
                                handleChangeAnswer(
                                  qi,
                                  ai,
                                  "isCorrect",
                                  e.target.checked
                                )
                              }
                            />
                            <Textarea
                              value={a.content}
                              onChange={(e) =>
                                handleChangeAnswer(
                                  qi,
                                  ai,
                                  "content",
                                  e.target.value
                                )
                              }
                            />
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
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button onClick={handleSave} disabled={saving || !local}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuizEditDialog;

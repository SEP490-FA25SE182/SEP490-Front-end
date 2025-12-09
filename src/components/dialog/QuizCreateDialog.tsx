// QuizCreateDialog.tsx
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
import { useToast } from "@/components/ui/use-toast";
import { useCreateQuiz, type Quiz } from "@/services/QuizService";
import QuestionCreateDialog from "@/components/dialog/QuestionCreateDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  onQuizFullyCreated?: (quizId: string) => void;
  initialChapterId?: string;
}

const QuizCreateDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreated,
  onQuizFullyCreated,
  initialChapterId,
}) => {
  const { toast } = useToast();
  const createQuiz = useCreateQuiz();

  // mở dialog question sau khi tạo quiz
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [createdQuizFull, setCreatedQuizFull] = useState<Quiz | null>(null);

  // NEW: lưu cấu hình dành riêng cho bước tạo câu hỏi
  const [questionConfig, setQuestionConfig] = useState<{
    totalScore: number;
    questionCount: number;
  } | null>(null);

  const [form, setForm] = useState({
    title: "",
    totalScore: 100,
    attemptCount: 1,
    questionCount: 1,
    chapterId: initialChapterId ?? "",
  });

  // limits
  const MAX_TOTAL_SCORE = 10000;
  const MAX_ATTEMPT = 1000;
  const MAX_QUESTION_COUNT = 1000;

  useEffect(() => {
    if (!isOpen) {
      // reset form khi dialog quiz đóng – KHÔNG ảnh hưởng tới questionConfig
      setForm({
        title: "",
        totalScore: 0,
        attemptCount: 1,
        questionCount: 1,
        chapterId: initialChapterId ?? "",
      });
      return;
    }
    setForm((f) => ({ ...f, chapterId: initialChapterId ?? f.chapterId }));
  }, [isOpen, initialChapterId]);

  const isFormValid = Boolean(
    form.title?.toString().trim() &&
      form.chapterId?.toString().trim() &&
      Number(form.totalScore) > 0 &&
      Number(form.totalScore) <= MAX_TOTAL_SCORE &&
      Number((form as any).attemptCount) > 0 &&
      Number((form as any).attemptCount) <= MAX_ATTEMPT &&
      Number((form as any).questionCount) > 0 &&
      Number((form as any).questionCount) <= MAX_QUESTION_COUNT
  );

  const handleSubmit = async () => {
    // validate tất cả field bắt buộc, show toast nếu thiếu
    const missing: string[] = [];
    if (!form.title?.toString().trim()) missing.push("Tiêu đề");
    if (!form.chapterId?.toString().trim()) missing.push("Chapter ID");
    if (!form.totalScore || Number(form.totalScore) <= 0) missing.push("Tổng điểm");
    if (!Number((form as any).attemptCount) || Number((form as any).attemptCount) <= 0)
      missing.push("Số lần làm quiz");
    if (!Number((form as any).questionCount) || Number((form as any).questionCount) <= 0)
      missing.push("Số câu hỏi");

    // validate max limits
    const exceed: string[] = [];
    if (Number(form.totalScore) > MAX_TOTAL_SCORE) exceed.push(`Tổng điểm (max ${MAX_TOTAL_SCORE})`);
    if (Number((form as any).attemptCount) > MAX_ATTEMPT) exceed.push(`Số lần làm quiz (max ${MAX_ATTEMPT})`);
    if (Number((form as any).questionCount) > MAX_QUESTION_COUNT) exceed.push(`Số câu hỏi (max ${MAX_QUESTION_COUNT})`);

    if (missing.length > 0) {
      toast({
        title: "Thiếu thông tin",
        description: `Vui lòng nhập/điền hợp lệ: ${missing.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    if (exceed.length > 0) {
      toast({
        title: "Giá trị vượt giới hạn",
        description: `Vui lòng điều chỉnh: ${exceed.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      const totalScoreNumber = Number(form.totalScore) || 100;
      const questionCountNumber =
        Number((form as any).questionCount) || 1;

      const createdQuiz = await createQuiz.mutateAsync({
        title: form.title,
        totalScore: totalScoreNumber,
        chapterId: form.chapterId,
        isActived: "ACTIVE",
        attemptCount: Number((form as any).attemptCount),
        questionCount: questionCountNumber,
      });

      toast({ title: "Tạo quiz thành công" });
      onCreated?.();

      // lưu cấu hình cho bước tạo question – KHÔNG bị reset khi dialog quiz đóng
      setQuestionConfig({
        totalScore: totalScoreNumber,
        questionCount: questionCountNumber,
      });

      setCreatedQuizId(createdQuiz?.id ?? createdQuiz?.quizId ?? null);
      setCreatedQuizFull(createdQuiz);
      setOpenQuestionDialog(true);

      // chỉ đóng UI dialog quiz, component vẫn còn để render QuestionCreateDialog
      onClose();
    } catch (err: any) {
      toast({
        title: "Lỗi khi tạo quiz",
        description:
          err?.response?.data?.message ||
          "Không thể tạo quiz, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="w-[70vw] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>Tạo Quiz mới</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Tên Quiz
              </label>
              <Input
                value={form.title}
                onChange={(e: any) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Tiêu đề quiz..."
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Tổng điểm
                </label>
                <Input
                  type="number"
                  value={form.totalScore}
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      totalScore: Math.max(0, Math.min(MAX_TOTAL_SCORE, Number(e.target.value || 0))),
                    })
                  }
                  min={0}
                  max={MAX_TOTAL_SCORE}
                  placeholder="Tổng điểm"
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Số lần làm quiz
                </label>
                <Input
                  type="number"
                  value={(form as any).attemptCount}
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      attemptCount: Math.max(1, Math.min(MAX_ATTEMPT, Number(e.target.value || 1))),
                    })
                  }
                  min={1}
                  max={MAX_ATTEMPT}
                  placeholder="Số lần làm quiz"
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Số câu hỏi
                </label>
                <Input
                  type="number"
                  value={(form as any).questionCount}
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      questionCount: Math.max(1, Math.min(MAX_QUESTION_COUNT, Number(e.target.value || 1))),
                    })
                  }
                  min={1}
                  max={MAX_QUESTION_COUNT}
                  placeholder="Số câu hỏi"
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => onClose()}
              className="mr-2"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={createQuiz.status === "pending" || !isFormValid}
            >
              {createQuiz.status === "pending"
                ? "Đang tạo..."
                : "Tạo Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tạo câu hỏi cho quiz vừa tạo */}
      <QuestionCreateDialog
        isOpen={openQuestionDialog}
        onClose={() => {
          setOpenQuestionDialog(false);
          setCreatedQuizId(null);
          setCreatedQuizFull(null);
          setQuestionConfig(null); // reset cấu hình cho lần tạo quiz sau
        }}
        quizId={createdQuizId}
        quiz={createdQuizFull}
        getCurrentQuiz={() =>
          createdQuizFull?.quizId ??
          createdQuizFull?.id ??
          (createdQuizFull as any)?.quizzId ??
          createdQuizId ??
          null
        }
        questionCount={questionConfig?.questionCount ?? 1}
        totalScore={questionConfig?.totalScore ?? 100}
        onCreated={(quizIdFromDialog) => {
          // dọn state local
          setOpenQuestionDialog(false);
          setCreatedQuizId(null);
          setCreatedQuizFull(null);
          setQuestionConfig(null);

          // báo lên trên (AuthorModelView) để preview Unity
          if (quizIdFromDialog) {
            onQuizFullyCreated?.(quizIdFromDialog);
          } else if (createdQuizId) {
            onQuizFullyCreated?.(createdQuizId);
          }

          // nếu muốn vẫn dùng onCreated cũ để cho QuizViewDialog refetch
          onCreated?.();
        }}
      />
    </>
  );
};

export default QuizCreateDialog;

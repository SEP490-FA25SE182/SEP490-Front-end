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

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({
        title: "Thiếu tiêu đề",
        description: "Vui lòng nhập tiêu đề quiz.",
        variant: "destructive",
      });
      return;
    }
    if (!form.chapterId.trim()) {
      toast({
        title: "Thiếu chapterId",
        description: "Vui lòng nhập chapterId (ID chương).",
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
                      totalScore: Number(e.target.value),
                    })
                  }
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
                      attemptCount: Number(e.target.value),
                    })
                  }
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
                      questionCount: Number(e.target.value),
                    })
                  }
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
              disabled={createQuiz.status === "pending"}
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

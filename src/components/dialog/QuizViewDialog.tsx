import React, { useEffect, useState } from "react";
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
  useSearchQuizzes,
  type Quiz,
  type QuizSearchParams,
} from "@/services/QuizService";
import QuizCreateDialog from "@/components/dialog/QuizCreateDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  authorId?: string | null; // sẽ truyền từ AssetToolPanel (getCurrentUserId)
  initialChapterId?: string | null;
  onSelected?: (quiz: Quiz) => void;
  onCreated?: () => void;
  onQuizFullyCreated?: (quizId: string) => void;
}

const QuizViewDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  authorId,
  initialChapterId,
  onSelected,
  onCreated,
  onQuizFullyCreated,
}) => {
  const { toast } = useToast();
  const [params, setParams] = useState<QuizSearchParams>({
    page: 0,
    size: 50,
    chapterId: initialChapterId ?? undefined,
    isActived: "ACTIVE",
  });

  useEffect(() => {
    setParams((p) => ({
      ...p,
      chapterId: initialChapterId ?? undefined,
    }));
  }, [authorId, initialChapterId]);

  const { data, isLoading, isError, refetch } = useSearchQuizzes(params);

  useEffect(() => {
    console.log("QuizViewDialog data =", data);
  }, [data]);

  const [openCreate, setOpenCreate] = useState(false);

  const handleCreated = () => {
    refetch();
    toast({ title: "Tạo quiz thành công" });
    setOpenCreate(false);
    onCreated?.();
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
            <DialogTitle className="text-black">Quiz của bạn</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="mb-3 text-sm text-gray-600">
              Danh sách quiz được tạo
            </div>

            <div>
              {isLoading ? (
                <div className="text-sm text-gray-500">Đang tải quiz...</div>
              ) : isError ? (
                <div className="text-sm text-red-500">
                  Lỗi khi tải quiz.
                </div>
              ) : !(
                data &&
                Array.isArray((data as any).content) &&
                (data as any).content.length > 0
              ) ? (
                <div className="text-sm text-gray-500">
                  Không tìm thấy quiz.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(data as any).content.map((q: Quiz) => (
                    <div
                      key={q.quizId ?? q.id ?? `${q.title}-${Math.random()}`}
                      className="rounded border p-3 bg-white text-black shadow-sm hover:shadow-md transition cursor-pointer"
                      onClick={() => {
                        const quizId = q.quizId ?? q.id;
                        if (!quizId) {
                          toast({
                            title: "Không tìm thấy quizId",
                            description: "Quiz này không có id hợp lệ.",
                            variant: "destructive",
                          });
                          return;
                        }
                        // báo ra ngoài cho AssetToolPanel / AuthorModelView
                        onSelected?.(q);
                        // đóng dialog lại
                        onClose();
                      }}
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
                  ))}
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
              <Button
                onClick={() => setOpenCreate(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Tạo Quiz
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuizCreateDialog
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        initialChapterId={initialChapterId ?? undefined}
        onCreated={handleCreated}
        onQuizFullyCreated={onQuizFullyCreated}
      />
    </>
  );
};

export default QuizViewDialog;

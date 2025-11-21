import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
    useCreateQuestion,
    useCreateAnswer,
    type Quiz,
} from "@/services/QuizService";

interface AnswerForm {
    content: string;
    isCorrect: boolean;
    saved?: boolean;
    id?: string;
}

interface QuestionForm {
    content: string;
    score: number;
    answerCount: number;
    saved?: boolean;
    id?: string;
    answers?: AnswerForm[];
    answersSaved?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
    quizId: string | null;
    quiz?: Quiz | null;
    getCurrentQuiz?: () => string | null;
    questionCount: number;
    totalScore: number;
}

const QuestionCreateDialog: React.FC<Props> = ({
    isOpen,
    onClose,
    onCreated,
    quizId: initialQuizId,
    quiz: quizFromProps,
    getCurrentQuiz,
    questionCount,
    totalScore,
}) => {
    const { toast } = useToast();
    const createQuestion = useCreateQuestion();
    const createAnswer = useCreateAnswer();

    const quizObj = quizFromProps ?? null;
    const extractIdFromObj = (q: any) =>
        q?.id ?? q?.quizId ?? q?.quizzId ?? null;

    const effectiveQuizId =
        extractIdFromObj(quizObj) ||
        (typeof getCurrentQuiz === "function" ? getCurrentQuiz() : null) ||
        initialQuizId ||
        null;

    useEffect(() => {
        console.log("QuestionCreateDialog effectiveQuizId resolution:", {
            initialQuizId,
            quizFromProps,
            extractedFromQuizObj: extractIdFromObj(quizFromProps),
            getCurrentQuizValue:
                typeof getCurrentQuiz === "function" ? getCurrentQuiz() : null,
            effectiveQuizId,
        });
    }, [initialQuizId, quizFromProps, getCurrentQuiz, effectiveQuizId]);

    const [forms, setForms] = useState<QuestionForm[]>(
        () =>
            new Array(Math.max(1, questionCount)).fill(0).map(() => ({
                content: "",
                score: 0,
                answerCount: 4,
                saved: false,
                answers: [],
                answersSaved: false,
            }))
    );
    const [activeIdx, setActiveIdx] = useState(0);

    // Mỗi lần mở dialog cho quiz mới -> reset form hoàn toàn
    useEffect(() => {
        if (!isOpen) return;

        const emptyForms: QuestionForm[] = new Array(Math.max(1, questionCount))
            .fill(0)
            .map(() => ({
                content: "",
                score: 0,
                answerCount: 4,
                saved: false,
                id: undefined,
                answers: [],
                answersSaved: false,
            }));

        setForms(emptyForms);
        setActiveIdx(0);
    }, [isOpen, questionCount, effectiveQuizId]);


    const totalAssigned = useMemo(
        () => forms.reduce((s, f) => s + Number(f.score || 0), 0),
        [forms]
    );

    const remainingScore = useMemo(() => {
        const currentScore = Number(forms[activeIdx]?.score || 0);
        return Number(totalScore) - (totalAssigned - currentScore);
    }, [totalAssigned, activeIdx, forms, totalScore]);

    const updateField = (index: number, patch: Partial<QuestionForm>) => {
        setForms((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const initAnswersForQuestion = (qIdx: number, answersCount: number) => {
        setForms((prev) => {
            const next = [...prev];
            const q = next[qIdx];
            q.answers = new Array(Math.max(1, answersCount))
                .fill(0)
                .map(() => ({ content: "", isCorrect: false, saved: false }));
            q.answersSaved = false;
            next[qIdx] = { ...q };
            return next;
        });
    };

    const saveQuestion = async (index: number) => {
        if (!effectiveQuizId) {
            toast({
                title: "Chưa có Quiz",
                description: "Không tìm thấy quiz. Vui lòng thử lại.",
                variant: "destructive",
            });
            return;
        }

        const q = forms[index];
        if (!q.content.trim()) {
            toast({
                title: "Thiếu nội dung",
                description: `Câu ${index + 1} chưa có nội dung.`,
                variant: "destructive",
            });
            setActiveIdx(index);
            return;
        }

        if (Number(q.score) <= 0) {
            toast({
                title: "Điểm không hợp lệ",
                description: "Điểm câu hỏi phải lớn hơn 0.",
                variant: "destructive",
            });
            return;
        }

        if (Number(q.score) > remainingScore) {
            toast({
                title: "Vượt điểm",
                description: `Chỉ còn ${remainingScore} điểm để phân bổ.`,
                variant: "destructive",
            });
            return;
        }

        try {
            const created: any = await createQuestion.mutateAsync({
                quizId: effectiveQuizId,
                content: q.content,
                score: Number(q.score),
                answerCount: q.answerCount ?? 4,
                isActived: "ACTIVE",
            });

            // LẤY ĐÚNG questionId từ response
            const questionId =
                created.id ??
                created.questionId ??
                created.question_id ??
                created.quizQuestionId ??
                created.quiz_question_id;

            if (!questionId) {
                console.warn("Không lấy được questionId từ response createQuestion:", created);
            }

            updateField(index, { saved: true, id: questionId });
            initAnswersForQuestion(index, q.answerCount);
            toast({ title: `Đã lưu câu ${index + 1}` });
        } catch (err: any) {
            toast({
                title: "Lỗi lưu câu hỏi",
                description: err?.response?.data?.message || "Không thể lưu câu hỏi.",
                variant: "destructive",
            });
        }
    };


    const updateAnswerField = (
        qIdx: number,
        aIdx: number,
        patch: Partial<AnswerForm>
    ) => {
        setForms((prev) => {
            const next = [...prev];
            const q = { ...next[qIdx] };
            q.answers = q.answers ? [...q.answers] : [];
            q.answers[aIdx] = { ...q.answers[aIdx], ...patch };
            next[qIdx] = q;
            return next;
        });
    };

    const saveAnswersForQuestion = async (qIdx: number) => {
        const q = forms[qIdx];
        if (!q.saved || !q.id) {
            toast({
                title: "Lỗi",
                description: "Vui lòng lưu câu hỏi trước.",
                variant: "destructive",
            });
            return;
        }
        if (!q.answers || q.answers.length === 0) {
            toast({
                title: "Chưa có đáp án",
                description: "Vui lòng tạo đáp án trước.",
                variant: "destructive",
            });
            return;
        }
        for (let i = 0; i < q.answers.length; i++) {
            if (!q.answers[i].content.trim()) {
                toast({
                    title: "Thiếu nội dung",
                    description: `Đáp án ${i + 1} của câu ${qIdx + 1} chưa có nội dung.`,
                    variant: "destructive",
                });
                return;
            }
        }

        try {
            const createdAnswers = await Promise.all(
                q.answers.map((a) =>
                    createAnswer.mutateAsync({
                        questionId: q.id as string,
                        content: a.content,
                        isCorrect: !!a.isCorrect,
                        isActived: "ACTIVE",
                    })
                )
            );
            setForms((prev) => {
                const next = [...prev];
                const qq = { ...next[qIdx] };
                qq.answers = createdAnswers.map((ca: any, idx: number) => ({
                    content: ca.content ?? q.answers![idx].content,
                    isCorrect: !!(q.answers && q.answers[idx]?.isCorrect),
                    saved: true,
                    id: ca?.id ?? ca?.answerId,
                }));
                qq.answersSaved = true;
                next[qIdx] = qq;
                return next;
            });

            const isLast = qIdx === forms.length - 1;
            if (isLast) {
                toast({ title: "Quiz đã tạo thành công" });
                onCreated?.();
                onClose();
            } else {
                setActiveIdx(qIdx + 1);
                toast({
                    title: `Đáp án câu ${qIdx + 1} đã lưu, chuyển sang câu ${qIdx + 2}`,
                });
            }
        } catch (err: any) {
            toast({
                title: "Lỗi khi lưu đáp án",
                description:
                    err?.response?.data?.message || "Không thể lưu đáp án.",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="w-[90vw] sm:max-w-[70vw] max-h-[85vh] overflow-y-auto p-6">
                <DialogHeader className="pb-3">
                    <DialogTitle className="text-lg">Tạo câu hỏi cho Quiz</DialogTitle>
                </DialogHeader>

                <div className="mt-1">
                    {/* Tabs câu hỏi */}
                    <div className="flex gap-2 overflow-x-auto pb-3">
                        {forms.map((f, idx) => {
                            const isActive = idx === activeIdx;
                            const isSaved = !!f.saved;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveIdx(idx)}
                                    className={[
                                        "text-sm min-w-[80px] px-4 py-2 rounded-md border transition",
                                        "flex items-center justify-center gap-1",
                                        isActive
                                            ? "bg-purple-600 text-white border-purple-600"
                                            : "bg-neutral-700 text-neutral-100 border-neutral-600 hover:bg-neutral-600",
                                    ].join(" ")}
                                >
                                    <span>Câu {idx + 1}</span>
                                    {isSaved && <span className="text-xs">✓</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* 2 card cùng hàng trên màn hình lớn */}
                    <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* CARD CÂU HỎI */}
                        <div className="bg-[#0b1220] p-5 rounded-xl border border-white/10 h-full">
                            <div className="mb-3 text-sm text-gray-300">
                                Câu {activeIdx + 1} / {forms.length}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-2">
                                    Nội dung câu hỏi
                                </label>
                                <textarea
                                    value={forms[activeIdx]?.content}
                                    onChange={(e) =>
                                        updateField(activeIdx, { content: e.target.value })
                                    }
                                    rows={6}
                                    className="w-full p-3 rounded-md bg-white/5 text-white border border-white/10 text-sm resize-none min-h-[180px]"
                                    placeholder="Nhập nội dung câu hỏi..."
                                    disabled={forms[activeIdx]?.saved}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Điểm cho câu
                                    </label>
                                    <Input
                                        type="number"
                                        value={forms[activeIdx]?.score || ""}
                                        onChange={(e: any) => {
                                            const v = Number(e.target.value) || 0;
                                            if (v > remainingScore) {
                                                toast({
                                                    title: "Vượt quá điểm",
                                                    description: `Chỉ còn ${remainingScore} điểm để phân phối`,
                                                    variant: "destructive",
                                                });
                                                return;
                                            }
                                            updateField(activeIdx, { score: v });
                                        }}
                                        placeholder="Điểm"
                                        className="bg-white h-10"
                                        disabled={forms[activeIdx]?.saved}
                                    />
                                    <div className="text-xs text-gray-400 mt-1">
                                        Max còn lại: {remainingScore}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Số đáp án
                                    </label>
                                    <Input
                                        type="number"
                                        value={forms[activeIdx]?.answerCount}
                                        onChange={(e: any) =>
                                            updateField(activeIdx, {
                                                answerCount: Math.max(1, Number(e.target.value) || 1),
                                            })
                                        }
                                        placeholder="Số đáp án"
                                        className="bg-white h-10"
                                        disabled={forms[activeIdx]?.saved}
                                    />
                                    <div className="text-xs text-gray-400 mt-1">
                                        Sau khi lưu câu sẽ hiển thị phần nhập đáp án
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Trạng thái điểm
                                    </label>
                                    <div className="text-white">
                                        {forms[activeIdx]?.score || 0} / {totalScore}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Tổng đã phân: {totalAssigned} — Còn lại:{" "}
                                        {Number(totalScore) - totalAssigned}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2 items-center">
                                {!forms[activeIdx]?.saved ? (
                                    <Button
                                        size="sm"
                                        onClick={() => saveQuestion(activeIdx)}
                                        disabled={createQuestion.status === "pending"}
                                    >
                                        {createQuestion.status === "pending"
                                            ? "Đang lưu..."
                                            : "Lưu câu"}
                                    </Button>
                                ) : (
                                    <div className="text-sm text-green-400">Câu đã lưu</div>
                                )}
                            </div>
                        </div>

                        {/* CARD ĐÁP ÁN */}
                        {forms[activeIdx]?.saved && (
                            <div className="bg-[#07101a] p-5 rounded-xl border border-white/10 h-full">
                                <div className="mb-3 text-sm text-gray-300">
                                    Đáp án cho Câu {activeIdx + 1}
                                </div>

                                {/* không còn hàng A1 A2 A3 A4 phía trên */}

                                <div className="grid gap-3">
                                    {(forms[activeIdx]?.answers || []).map((a, ai) => {
                                        const label = String.fromCharCode(65 + ai); // A, B, C, D
                                        return (
                                            <div
                                                key={ai}
                                                className="flex gap-3 items-start text-sm"
                                            >
                                                {/* Nút label A/B/C/D */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const el = document.getElementById(
                                                            `answer-${activeIdx}-${ai}`
                                                        );
                                                        if (el) (el as HTMLTextAreaElement).focus();
                                                    }}
                                                    className={`mt-1 px-3 py-2 rounded-md border text-xs font-medium ${a.saved
                                                        ? "bg-green-600 text-white border-green-600"
                                                        : "bg-white/5 text-white/90 border-white/20"
                                                        }`}
                                                >
                                                    {label}
                                                </button>

                                                {/* Textarea đáp án */}
                                                <textarea
                                                    id={`answer-${activeIdx}-${ai}`}
                                                    value={a.content}
                                                    onChange={(e: any) =>
                                                        updateAnswerField(activeIdx, ai, {
                                                            content: e.target.value,
                                                        })
                                                    }
                                                    placeholder={`Nội dung đáp án ${ai + 1}`}
                                                    rows={3}
                                                    className="flex-1 rounded-md bg-white text-gray-900 border border-gray-200 px-3 py-2 text-sm resize-none min-h-[90px]"
                                                    disabled={a.saved}
                                                />

                                                {/* Switch đúng / sai */}
                                                <div className="flex flex-col items-center gap-1 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={!!a.isCorrect}
                                                            onCheckedChange={(checked: any) =>
                                                                updateAnswerField(activeIdx, ai, {
                                                                    isCorrect: checked,
                                                                })
                                                            }
                                                            disabled={a.saved}
                                                        />
                                                        <span className="text-gray-300 whitespace-nowrap">
                                                            Đúng
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-400 h-4">
                                                        {a.saved ? "Đã lưu" : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <Button
                                        size="sm"
                                        onClick={() => saveAnswersForQuestion(activeIdx)}
                                        disabled={createAnswer.status === "pending"}
                                    >
                                        {createAnswer.status === "pending"
                                            ? "Đang lưu..."
                                            : "Lưu đáp án"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between text-sm">
                        <div className="text-gray-400">
                            Tổng điểm quiz: {totalScore} — Tổng đã phân: {totalAssigned}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                Hủy
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter />
            </DialogContent>
        </Dialog>
    );
};

export default QuestionCreateDialog;

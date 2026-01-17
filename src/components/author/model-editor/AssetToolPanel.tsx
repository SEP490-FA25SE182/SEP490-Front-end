import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import GLBThumbnail from "./GLBThumbnail";
import { useGetMarkerById } from "@/services/ARService";
import QuizViewDialog from "@/components/dialog/QuizViewDialog";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUserId } from "@/utils/authStorage";
import { useSearchAudios } from "@/services/AIService";

type AssetToolPanelProps = {
  panelType: "image" | "model" | "quiz" | "audio";
  onClose: () => void;
  currentChapterId?: string;

  // 3D Assets
  assets: any[];
  assetsLoading: boolean;
  onAddExistingModel: (asset: any, assetUrl: string) => void;

  // audio callback
  onAddAudio?: (audio: any, audioUrl: string) => void;

  // marker image
  markerImageUrl?: string;
  markerId?: string;

  // actions
  onUploadClick: () => void;
  onOpenCreateAIDialog: () => void;

  // quiz callbacks
  onQuizFullyCreated?: (quizId: string) => void;
  onPreviewQuiz?: (quizId: string) => void;
};

export default function AssetToolPanel({
  panelType,
  onClose,
  assets,
  assetsLoading,
  onAddExistingModel,
  onAddAudio,
  onUploadClick,
  onOpenCreateAIDialog,
  markerImageUrl,
  markerId,
  currentChapterId,
  onQuizFullyCreated,
  onPreviewQuiz,
}: AssetToolPanelProps) {
  const quizThumbnailUrl =
    "https://media.sketchfab.com/models/2260e525086943c6ab6e23f1330d7a34/thumbnails/cdb21be6f55d409aa616a4ad537cf26b/e1899cfeeaea43ac8bf510b8d25deda4.jpeg";

  const { data: marker, isLoading: markerLoading } = useGetMarkerById(markerId);

  const getDisplayImageUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("gs://")) {
      const parts = url.split("/");
      const bucket = parts[2];
      const path = parts.slice(3).join("/");
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        path
      )}?alt=media`;
    }
    if (
      (url.includes("firebasestorage.googleapis.com") &&
        url.includes("alt=media")) ||
      url.startsWith("http")
    ) {
      return url;
    }
    return url;
  };

  const displayImageUrl = getDisplayImageUrl(marker?.imageUrl ?? markerImageUrl);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const { toast } = useToast();

  const [authorId, setAuthorId] = useState<string | null>(null);
  useEffect(() => {
    const uid = getCurrentUserId();
    if (uid) setAuthorId(uid);
  }, []);

    const {
    data: audiosResp,
    isLoading: audiosLoading,
  } = useSearchAudios(authorId ? { userId: authorId, size: 9999 } : { size: 9999 });
  const audios: any[] = audiosResp ?? [];

  const sortedAudios = useMemo(() => {
    return (audios ?? [])
      .slice()
      .sort((a: any, b: any) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        if (tb !== ta) return tb - ta;

        // tie-breaker để list ổn định
        const na = String(a.title ?? a.fileName ?? a.audioId ?? a.id ?? "");
        const nb = String(b.title ?? b.fileName ?? b.audioId ?? b.id ?? "");
        return na.localeCompare(nb);
      });
  }, [audios]);

  const sortedAssets = useMemo(() => {
    return (assets ?? [])
      .slice()
      .sort((a: any, b: any) => {
        const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        if (tb !== ta) return tb - ta;

        // tie-breaker cho ổn định (đỡ nhảy thứ tự)
        const na = String(a.title ?? a.fileName ?? a.asset3DId ?? a.id ?? "");
        const nb = String(b.title ?? b.fileName ?? b.asset3DId ?? b.id ?? "");
        return na.localeCompare(nb);
      });
  }, [assets]);

  return (
    <div className="w-72 bg-[#0f172a] border-r border-white/6 p-4 flex flex-col h-full">
      <div className="fflex-1 min-h-0 overflow-auto pr-1">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-semibold capitalize">
            {panelType === "model"
              ? "3D Model"
              : panelType === "quiz"
                ? "Quiz"
                : panelType === "audio"
                  ? "Audio"
                  : "Ảnh Marker"}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-gray-300 mb-4">
          {panelType === "model"
            ? "Chọn cách thêm mô hình 3D vào scene."
            : panelType === "quiz"
              ? "Chọn quiz để tạo quiz mới."
              : panelType === "audio"
                ? "Chọn audio để gắn vào scene."
                : ""}
        </div>

        {panelType === "model" && (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <div className="text-sm text-gray-300 mb-2">Models của bạn</div>

              <div className="grid grid-cols-2 gap-2">
                {assetsLoading ? (
                  <div className="text-sm text-gray-400 col-span-full">
                    Đang tải models...
                  </div>
                ) : sortedAssets.length === 0 ? (
                  <div className="text-sm text-gray-500 col-span-full">
                    Không có model 3D.
                  </div>
                ) : (
                  sortedAssets.map((a: any) => {
                    const rawUrl = a.assetUrl ?? a.url ?? a.fileUrl ?? "";
                    const assetUrl = typeof rawUrl === "string" ? rawUrl : "";
                    const isGlb = assetUrl.toLowerCase().includes(".glb");

                    return (
                      <button
                        key={a.asset3DId ?? a.id}
                        type="button"
                        onClick={() => onAddExistingModel(a, assetUrl)}
                        className="rounded border p-1 overflow-hidden focus:outline-none bg-[#081323] hover:border-purple-500"
                      >
                        <div className="w-full aspect-4/3 bg-gray-100 flex items-center justify-center overflow-hidden">
                          {assetUrl && isGlb ? (
                            <div className="w-full h-full">
                              <GLBThumbnail url={assetUrl} />
                            </div>
                          ) : assetUrl && !isGlb ? (
                            <div className="text-[10px] text-gray-500 p-2 text-center">
                              File không phải .glb
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 p-2">No preview</div>
                          )}
                        </div>

                        <div className="text-xs mt-2 text-left text-gray-200 truncate">
                          {a.title ?? a.fileName ?? a.asset3DId ?? a.id}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ... phần quiz & image giữ nguyên ... */}
        {panelType === "quiz" && (
          <div className="mt-4">
            <div className="text-sm text-gray-300 mb-2">Quiz của bạn</div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setQuizDialogOpen(true)}
                className="rounded border p-2 overflow-hidden focus:outline-none bg-[#081323] hover:border-purple-500 text-left"
              >
                <div className="w-full aspect-4/3 bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                  <img
                    src={quizThumbnailUrl}
                    alt="Trò chơi mở cửa"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs mt-2 text-gray-200 font-medium truncate">Trò chơi mở cửa</div>
                <div className="text-[11px] text-gray-400 mt-1">Một quiz để tăng trải nghiệm người dùng.</div>
              </button>
            </div>
          </div>
        )}

        {panelType === "image" && (
          <div className="mt-4">
            {markerLoading ? (
              <div className="text-sm text-gray-400">Đang tải marker...</div>
            ) : displayImageUrl ? (
              <div className="w-full bg-[#020617] rounded border border-white/10 p-2">
                <div className="w-full aspect-square overflow-hidden rounded bg-black/40 flex items-center justify-center">
                  <img
                    src={displayImageUrl}
                    alt="Marker image"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Chưa có ảnh marker cho marker này.</div>
            )}
          </div>
        )}

        {panelType === "audio" && (
          <div className="mt-4">
            <div className="text-sm text-gray-300 mb-2">Audio của bạn</div>

            <div className="flex flex-col gap-2">
              {audiosLoading ? (
                <div className="text-sm text-gray-400">Đang tải audio...</div>
              ) : audios.length === 0 ? (
                <div className="text-sm text-gray-500">Không có audio.</div>
              ) : (
                sortedAudios.map((a: any) => {
                  const audioUrl = a.audioUrl ?? a.url ?? a.fileUrl ?? "";
                  return (
                    <div
                      key={a.audioId ?? a.id}
                      className="rounded border p-2 overflow-hidden bg-[#081323] hover:border-purple-500 flex items-center gap-2"
                    >
                      <div className="flex-1 text-left">
                        <div className="text-xs text-gray-200 font-medium truncate">
                          {a.title ?? a.fileName ?? a.audioId ?? a.id}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">Duration: {a.durationMs ? `${Math.round(a.durationMs / 1000)}s` : "—"}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {audioUrl ? (
                          <audio src={audioUrl} controls className="w-28" />
                        ) : null}
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!audioUrl) {
                              toast({ title: "Audio không có url", variant: "destructive" });
                              return;
                            }
                            onAddAudio?.(a, audioUrl);
                            toast({ title: "Đã chọn audio", description: a.title ?? "" });
                          }}
                        >
                          Chọn
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* BUTTONS bottom */}
      <div className="mt-4 flex gap-3 shrink-0">
        {panelType === "model" && (
          <>
            <Button className="flex-1 bg-white text-black hover:bg-gray-200" onClick={onUploadClick}>
              Upload Model
            </Button>

            <Button
              className="flex-1 bg-linear-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:text-white"
              onClick={onOpenCreateAIDialog}
            >
              Tạo với AI
            </Button>
          </>
        )}
      </div>

      <QuizViewDialog
        isOpen={quizDialogOpen}
        onClose={() => setQuizDialogOpen(false)}
        authorId={authorId}
        initialChapterId={currentChapterId}
        onCreated={() => {
          setQuizDialogOpen(false);
          toast({ title: "Tạo quiz thành công!" });
        }}
        onQuizFullyCreated={onQuizFullyCreated}
        onSelected={(quiz) => {
          const quizId = quiz.quizId ?? quiz.id;
          if (!quizId) {
            toast({
              title: "Không tìm thấy quizId",
              description: "Quiz này không có id hợp lệ.",
              variant: "destructive",
            });
            return;
          }
          onPreviewQuiz?.(quizId);
        }}
      />
    </div>
  );
}

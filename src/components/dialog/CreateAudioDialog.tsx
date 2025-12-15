import React, { useEffect, useState, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useGenerateTTS, useUploadTTSFile } from "@/services/AIService";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUserId } from "@/utils/authStorage";
import { getUserByEmail } from "@/services/UserService";
import LoadingThreeDotsJumping from "@/components/loading/LoadingThreeDotsJumping";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId?: string;
  onCreated?: () => void;
}

const VOICE_OPTIONS = [
  { name: "Zephyr", desc: "Sáng, tông cao" },
  { name: "Puck", desc: "Sôi nổi, tông trung" },
  { name: "Charon", desc: "Điềm đạm, tông trầm" },
  { name: "Kore", desc: "Dứt khoát, tông trung" },
  { name: "Fenrir", desc: "Hào hứng, hơi trầm" },
  { name: "Leda", desc: "Ấm áp, thân thiện" },
  { name: "Orus", desc: "Trầm, uy nghiêm" },
  { name: "Aoede", desc: "Mềm mại, thư thái" },
  { name: "Callirrhoe", desc: "Biểu cảm, kể chuyện" },
  { name: "Autonoe", desc: "Trung tính, cân bằng" },
  { name: "Enceladus", desc: "Rõ ràng, chính xác" },
  { name: "Iapetus", desc: "Rền, vang" },
  { name: "Umbriel", desc: "Êm, dịu" },
  { name: "Algieba", desc: "Mượt, tự nhiên" },
  { name: "Despina", desc: "Nhẹ, gọn" },
  { name: "Erinome", desc: "Vui tươi, năng lượng" },
  { name: "Algenib", desc: "Trang nhã, chuẩn mực" },
  { name: "Rasalgethi", desc: "Mạnh mẽ, kịch tính" },
  { name: "Laomedeia", desc: "Nhẹ nhàng, tinh tế" },
  { name: "Achernar", desc: "Gần gũi, conversational" },
  { name: "Alnilam", desc: "Mượt, tông trung" },
  { name: "Schedar", desc: "Chậm rãi, bình tĩnh" },
  { name: "Gacrux", desc: "Ấm, nam trầm" },
  { name: "Pulcherrima", desc: "Sáng, lanh lợi" },
  { name: "Achird", desc: "Trung tính, thân thiện" },
  { name: "Zubenelgenubi", desc: "Kể chuyện, rõ ràng" },
  { name: "Vindemiatrix", desc: "Ổn định, nhiều thông tin" },
  { name: "Sadachbia", desc: "Nhẹ, thư giãn" },
  { name: "Sadaltager", desc: "Tròn trịa, cân bằng" },
  { name: "Sulafat", desc: "Gần gũi, ấm" },
];

// Reorder languages so default is Vietnamese (vi)
const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "Tiếng Anh" },
];

const CreateAudioDialog: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [audioData, setAudioData] = useState({
    title: "", // used as filename for import
    text: "",
    voiceName: VOICE_OPTIONS[0].name,
    language: LANGUAGES[0].code, // default to 'vi'
    format: "wav",
    model: "gemini-2.5-flash-preview-tts",
    file: null as File | null, // added file field
  });

  // mode: 'import' = uploading local file, 'ai' = generate from text
  const [mode, setMode] = useState<"import" | "ai">("import");

  const { toast } = useToast();
  const generateTTS = useGenerateTTS();
  const uploadTTS = useUploadTTSFile(); // upload endpoint (meta: filename + language)
  const { user } = useAuth();
  const [authorId, setAuthorId] = useState<string | null>(null);

  // preview url for selected local file
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuthorId = async () => {
      try {
        const uidFromStorage = getCurrentUserId();
        if (uidFromStorage) {
          setAuthorId(uidFromStorage);
          return;
        }
        if (user?.userId) {
          setAuthorId(user.userId);
          return;
        }
        if (user?.email) {
          const currentUser = await getUserByEmail(user.email);
          if (currentUser?.userId) {
            setAuthorId(currentUser.userId);
            return;
          }
        }
      } catch (error) {
        console.error("❌ Lỗi khi xác định authorId:", error);
      }
    };
    fetchAuthorId();
  }, [user]);

  useEffect(() => {
    if (!isOpen) {
      setAudioData({
        title: "",
        text: "",
        voiceName: VOICE_OPTIONS[0].name,
        language: LANGUAGES[0].code,
        format: "wav",
        model: "gemini-2.5-flash-preview-tts",
        file: null,
      });
      setPreviewUrl(null);
      setMode("import");
    }
  }, [isOpen]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setAudioData((s) => ({ ...s, file: null }));
      setPreviewUrl(null);
      return;
    }

    // allowed mime types/extensions
    const allowedMime = [
      "audio/mpeg", // mp3
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/opus",
      "audio/mp4",
      "audio/x-m4a",
      "audio/m4a",
      "audio/flac",
      "audio/x-flac",
    ];

    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const allowedExt = ["mp3", "wav", "ogg", "m4a", "flac"];

    if (!(allowedMime.includes(f.type) || allowedExt.includes(ext))) {
      toast({
        title: "Định dạng không hợp lệ",
        description: "Chỉ chấp nhận file mp3|wav|ogg|m4a|flac.",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    setAudioData((s) => ({ ...s, file: f }));

    // create preview url
    try {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } catch (err) {
      setPreviewUrl(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!authorId) {
      toast({
        title: "Không tìm thấy tác giả",
        description: "Không thể xác định authorId. Vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (mode === "import") {
        if (!audioData.file) {
          toast({
            title: "Chưa chọn file",
            description: "Vui lòng chọn file audio để tải lên.",
            variant: "destructive",
          });
          return;
        }

        // lấy tên file để lưu (nếu chưa nhập thì dùng tên file không có đuôi)
        const baseNameFromFile =
          audioData.file.name.replace(/\.[^.]+$/, "") || "audio-upload";

        const meta = {
          filename: audioData.title || baseNameFromFile,
          language: audioData.language,
        };

        // 🔥 GỌI API upload thực sự
        await uploadTTS.mutateAsync({
          userId: authorId,
          meta,
          file: audioData.file,
        });

        toast({
          title: "Upload thành công",
          description: "Audio đã được tải lên và lưu.",
        });

        onCreated?.();
        onClose();
        return;
      }

      // mode === "ai"
      if (!audioData.text.trim()) {
        toast({
          title: "Thiếu nội dung",
          description: "Vui lòng nhập nội dung TTS để tạo audio bằng AI.",
          variant: "destructive",
        });
        return;
      }

      await generateTTS.mutateAsync({
        userId: authorId,
        meta: {
          text: audioData.text,
          voiceName: audioData.voiceName,
          title: audioData.title || "audio-tts",
          language: audioData.language,
          format: audioData.format,
          model: audioData.model,
        },
      });

      toast({
        title: "Tạo audio thành công",
        description: "Audio TTS đã được sinh thành công.",
      });
      onCreated?.();
      onClose();
    } catch (err: any) {
      console.error("❌ Lỗi khi tạo/upload audio:", err);
      toast({
        title: "Lỗi khi tạo/upload audio",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Không thể hoàn tất thao tác, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Normalize various mutation-state shapes (some hooks may expose isPending / isLoading or status)
  const isGeneratePending =
    "isPending" in generateTTS
      ? (generateTTS as any).isPending
      : ((generateTTS as any).status === "pending" || (generateTTS as any).status === "loading");

  const isUploadPending =
    "isPending" in uploadTTS
      ? (uploadTTS as any).isPending
      : ((uploadTTS as any).status === "pending" || (uploadTTS as any).status === "loading");

  const isProcessing = Boolean(isGeneratePending || isUploadPending);

  // đường dẫn sample theo voiceName (file để trong public/audio_files/<VoiceName>.wav)
  const voiceSampleSrc = `/audio_files/${audioData.voiceName}.wav`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tạo Audio (TTS)</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4 flex-1 overflow-auto pr-2">
          {/* IMPORT FROM LOCAL FILE */}
          <div className="border p-3 rounded">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Import audio từ máy</div>
                <div className="text-xs text-gray-500">
                  Chọn file và đặt tên
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Tên file
                </label>
                <Input
                  value={audioData.title}
                  onChange={(e) =>
                    setAudioData({ ...audioData, title: e.target.value })
                  }
                  placeholder="Tên file khi lưu..."
                  className="bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Ngôn ngữ</label>
                <Select
                  value={audioData.language}
                  onValueChange={(value) =>
                    setAudioData({ ...audioData, language: value })
                  }
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Chọn ngôn ngữ" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex flex-col items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.ogg,.m4a,.flac,audio/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button onClick={handleImportClick} variant="outline">
                Chọn file audio
              </Button>

              {previewUrl && (
                <div className="mt-3 w-full flex flex-col items-center">
                  <audio controls src={previewUrl} className="w-full max-w-md" />
                  <div className="text-xs text-gray-500 mt-2">
                    Đã chọn: {audioData.file?.name} (
                    {Math.round((audioData.file?.size ?? 0) / 1024)} KB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hàng phân tách + nút AI nằm dưới khung import */}
          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-500 mb-2">
              Hoặc tạo audio bằng AI
            </div>
            <Button
              variant={mode === "ai" ? "default" : "outline"}
              className="bg-linear-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:text-white"
              onClick={() => setMode("ai")}
            >
              Tạo audio bằng AI
            </Button>
          </div>

          {/* AI PROMPT AREA - chỉ hiện khi mode === 'ai' */}
          {mode === "ai" && (
            <div className="border p-3 rounded">
              <div className="text-sm font-medium mb-2">Tạo audio bằng AI</div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Nội dung (Prompt)
                </label>
                <Textarea
                  value={audioData.text}
                  onChange={(e) =>
                    setAudioData({ ...audioData, text: e.target.value })
                  }
                  placeholder="Nhập nội dung cần chuyển thành giọng nói..."
                  className="min-h-[140px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-10 mt-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Giọng nói
                  </label>
                  {/* make first column wider and prevent overflow into the language column */}
                  <div className="min-w-0">
                    <Select
                      value={audioData.voiceName}
                      onValueChange={(value) =>
                        setAudioData({ ...audioData, voiceName: value })
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300 min-w-0">
                        <SelectValue placeholder="Chọn giọng" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.name} value={opt.name}>
                            <div className="truncate">
                              {opt.name} — {opt.desc}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
 
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Ngôn ngữ
                  </label>
                  <Select
                    value={audioData.language}
                    onValueChange={(value) =>
                      setAudioData({ ...audioData, language: value })
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Chọn ngôn ngữ" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 🔊 Nghe thử giọng đã chọn */}
              <div className="mt-4">
                <div className="text-xs text-gray-600 mb-1">
                  Nghe thử giọng: <span className="font-semibold">{audioData.voiceName}</span>
                </div>
                <audio
                  controls
                  src={voiceSampleSrc}
                  className="w-full"
                  preload="none"
                >
                  Trình duyệt của bạn không hỗ trợ audio.
                </audio>
                <div className="text-[11px] text-gray-400 mt-1">
                  File: <code>/audio_files/{audioData.voiceName}.wav</code>
                </div>
              </div>
            </div>
          )}

          {/* 🔄 Loading Jumping Dots khi đang xử lý (vẫn giữ component) */}
          {isProcessing && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <LoadingThreeDotsJumping />
              <p className="text-xs text-gray-500 text-center">
                {mode === "import"
                  ? "Đang xử lý audio..."
                  : "Đang tạo audio bằng AI, vui lòng chờ..."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onClose()} className="mr-2">
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isProcessing}
          >
            {isProcessing
              ? mode === "import"
                ? "Đang tải lên..."
                : "Đang tạo..."
              : mode === "import"
                ? "Tải lên file"
                : "Tạo Audio bằng AI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAudioDialog;

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
import { useGenerateTTS, useCreateAudio } from "@/services/AIService";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUserId } from "@/utils/authStorage";
import { getUserByEmail } from "@/services/UserService";

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
];

const LANGUAGES = [
  { code: "en", label: "Tiếng Anh" },
  { code: "vi", label: "Tiếng Việt" },
];

const CreateAudioDialog: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [audioData, setAudioData] = useState({
    title: "",
    text: "",
    voiceName: VOICE_OPTIONS[0].name,
    language: LANGUAGES[0].code,
    format: "wav",
    model: "gemini-2.5-flash-preview-tts",
    file: null as File | null, // added file field
  });

  const { toast } = useToast();
  const generateTTS = useGenerateTTS();
  const createAudio = useCreateAudio(); // << useCreateAudio hook
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
    if (!audioData.text.trim() && !audioData.file) {
      toast({ title: "Thiếu nội dung", description: "Vui lòng nhập nội dung TTS hoặc chọn file audio.", variant: "destructive" });
      return;
    }
    if (!authorId) {
      toast({ title: "Không tìm thấy tác giả", description: "Không thể xác định authorId. Vui lòng đăng nhập lại.", variant: "destructive" });
      return;
    }

    try {
      // If a file is provided, upload it then call createAudio to persist record
      if (audioData.file) {
        const form = new FormData();
        form.append("file", audioData.file);
        form.append("title", audioData.title || audioData.file.name);
        form.append("userId", authorId);

        // upload file to media endpoint (kept as existing backend endpoint)
        const resp = await fetch("/api/rookie/users/media/audios", {
          method: "POST",
          body: form,
        });
        if (!resp.ok) throw new Error("Upload thất bại");

        // try parse response to obtain uploaded URL
        const uploaded = await resp.json().catch(() => null);
        const uploadedUrl =
          uploaded?.audioUrl || uploaded?.url || uploaded?.fileUrl || uploaded?.data?.audioUrl || "";

        // create audio record via useCreateAudio hook
        const fileExt = (audioData.file.name.split(".").pop() || "").toLowerCase();
        const audioRecord = {
          title: audioData.title || audioData.file.name,
          audioUrl: uploadedUrl,
          voice: audioData.voiceName,
          format: fileExt || audioData.format,
          language: audioData.language,
          durationMs: 0,
          isActived: "ACTIVE",
          userId: authorId,
        };

        await createAudio.mutateAsync([audioRecord]);

        toast({ title: "Upload thành công", description: "Audio đã được tải lên và lưu." });
        onCreated?.();
        onClose();
        return;
      }

      // Otherwise generate TTS
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

      toast({ title: "Tạo audio thành công", description: "Audio TTS đã được sinh thành công." });
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Lỗi khi tạo/upload audio",
        description: err?.response?.data?.message || err?.message || "Không thể hoàn tất thao tác, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Normalize various mutation-state shapes (some hooks may expose isPending / isLoading or status)
  const isGeneratePending =
    "isPending" in generateTTS
      ? (generateTTS as any).isPending
      : ((generateTTS as any).status === "pending" || (generateTTS as any).status === "loading");

  const isCreatePending =
    "isLoading" in createAudio
      ? (createAudio as any).isLoading
      : "isPending" in createAudio
      ? (createAudio as any).isPending
      : ((createAudio as any).status === "pending" || (createAudio as any).status === "loading");

  const isProcessing = Boolean(isGeneratePending || isCreatePending);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Tạo Audio (TTS)</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Tên audio</label>
            <Input
              value={audioData.title}
              onChange={(e) => setAudioData({ ...audioData, title: e.target.value })}
              placeholder="Tên audio..."
              className="bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Nội dung</label>
            <Textarea
              value={audioData.text}
              onChange={(e) => setAudioData({ ...audioData, text: e.target.value })}
              placeholder="Nhập nội dung cần chuyển thành giọng nói..."
              className="min-h-[140px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Giọng nói</label>
              <Select value={audioData.voiceName} onValueChange={(value) => setAudioData({ ...audioData, voiceName: value })}>
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue placeholder="Chọn giọng" />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.name} value={opt.name}>
                      {opt.name} — {opt.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Ngôn ngữ</label>
              <Select value={audioData.language} onValueChange={(value) => setAudioData({ ...audioData, language: value })}>
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

          {/* IMPORT FROM LOCAL FILE - centered with text above button */}
          <div className="flex flex-col items-center mt-2">
            <div className="text-sm text-gray-600 mb-2">hoặc chọn audio từ máy</div>

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
                  Đã chọn: {audioData.file?.name} ({Math.round((audioData.file?.size ?? 0) / 1024)} KB)
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onClose()} className="mr-2">Hủy</Button>
          <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white" disabled={isProcessing}>
            {isProcessing ? "Đang tạo..." : "Tạo Audio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAudioDialog;
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useGenerateTTS } from "@/services/AIService";
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
  });

  const { toast } = useToast();
  const generateTTS = useGenerateTTS();
  const { user } = useAuth();
  const [authorId, setAuthorId] = useState<string | null>(null);

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
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!audioData.text.trim()) {
      toast({ title: "Thiếu nội dung", description: "Vui lòng nhập nội dung để tạo audio.", variant: "destructive" });
      return;
    }
    if (!authorId) {
      toast({ title: "Không tìm thấy tác giả", description: "Không thể xác định authorId. Vui lòng đăng nhập lại.", variant: "destructive" });
      return;
    }

    try {
      await generateTTS.mutateAsync({
        userId: authorId,
        meta: {
          text: audioData.text,
          voiceName: audioData.voiceName,
          title: audioData.title || "audio-tts",
          language: audioData.language,
          format: audioData.format,
          model: audioData.model
        },
      });

      toast({ title: "Tạo audio thành công", description: "Audio TTS đã được sinh thành công." });
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Lỗi khi tạo audio",
        description: err?.response?.data?.message || "Không thể tạo audio, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Tạo Audio (TTS)</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Title</label>
            <Input
              value={audioData.title}
              onChange={(e) => setAudioData({ ...audioData, title: e.target.value })}
              placeholder="Tên audio..."
              className="bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Text</label>
            <Textarea
              value={audioData.text}
              onChange={(e) => setAudioData({ ...audioData, text: e.target.value })}
              placeholder="Nhập nội dung cần chuyển thành giọng nói..."
              className="min-h-[140px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Voice</label>
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
              <label className="block text-sm text-gray-700 mb-1">Language</label>
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
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onClose()} className="mr-2">Hủy</Button>
          <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white" disabled={generateTTS.isPending}>
            {generateTTS.isPending ? "Đang tạo..." : "Tạo Audio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAudioDialog;
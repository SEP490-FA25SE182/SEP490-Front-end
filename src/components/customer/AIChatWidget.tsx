import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  X,
  Send,
  Image as ImageIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
} from "lucide-react";
import { askGemini } from "@/services/Gemini";
import { useAuth } from "@/context/AuthContext";

type ChatMessage = {
  sender: "user" | "ai";
  text?: string;
  imageDataUrl?: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AIChatWidgetDock() {
  const { user } = useAuth();
  const userId = (user as any)?.userId || (user as any)?.id;

  //  1) vào trang đóng sẵn
  const [open, setOpen] = useState(false);

  //  history panel (3 gạch)
  const [showHistory, setShowHistory] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const lastSendRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  // =========================
  //  Local history (tạm thời)
  // =========================
  const storageKey = useMemo(
    () => `ai_chat_history_v1:${userId || "guest"}`,
    [userId]
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeConv = useMemo(
    () => conversations.find(c => c.id === activeId) || null,
    [conversations, activeId]
  );

  const messages = activeConv?.messages ?? [];

  // load history khi mount / đổi user
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const list: Conversation[] = raw ? JSON.parse(raw) : [];

      if (list.length > 0) {
        // sort mới nhất lên đầu
        list.sort((a, b) => b.createdAt - a.createdAt);
        setConversations(list);
        setActiveId(list[0].id);
      } else {
        // tạo cuộc chat đầu tiên
        const first: Conversation = {
          id: uid(),
          title: "Cuộc chat mới",
          createdAt: Date.now(),
          messages: [],
        };
        setConversations([first]);
        setActiveId(first.id);
        localStorage.setItem(storageKey, JSON.stringify([first]));
      }
    } catch {
      // ignore
    }
    // đóng panel lịch sử khi đổi user
    setShowHistory(false);
  }, [storageKey]);

  // persist history
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(conversations));
    } catch {
      // ignore
    }
  }, [conversations, storageKey]);

  const createNewConversation = () => {
    const c: Conversation = {
      id: uid(),
      title: "Cuộc chat mới",
      createdAt: Date.now(),
      messages: [],
    };
    setConversations(prev => [c, ...prev]);
    setActiveId(c.id);
    setShowHistory(false);
  };

  const updateActiveMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    if (!activeId) return;
    setConversations(prev =>
      prev.map(c => (c.id === activeId ? { ...c, messages: updater(c.messages) } : c))
    );
  };

  // auto scroll
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages, loading, imageDataUrl]);

  const handlePickImage = () => {
    if (loading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      updateActiveMessages(prev => [...prev, { sender: "ai", text: "⚠ Vui lòng chọn đúng file ảnh." }]);
      return;
    }

    const MAX_MB = 4;
    if (file.size > MAX_MB * 1024 * 1024) {
      updateActiveMessages(prev => [
        ...prev,
        { sender: "ai", text: `⚠ Ảnh quá nặng. Chọn ảnh < ${MAX_MB}MB.` },
      ]);
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);
    if (!open) setOpen(true);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !imageDataUrl) || loading) return;

    const now = Date.now();
    if (now - lastSendRef.current < 2000) {
      updateActiveMessages(prev => [...prev, { sender: "ai", text: "⏳ Chờ 2 giây rồi gửi tiếp nhé." }]);
      return;
    }
    lastSendRef.current = now;

    // push message user
    const userMsg: ChatMessage = {
      sender: "user",
      text: text || undefined,
      imageDataUrl: imageDataUrl || undefined,
    };
    updateActiveMessages(prev => [...prev, userMsg]);

    setInput("");
    setLoading(true);

    try {
      const reply = await askGemini(text || "Hãy mô tả ảnh này", imageDataUrl || undefined);
      updateActiveMessages(prev => [...prev, { sender: "ai", text: reply }]);

      // nếu cuộc chat đang “Cuộc chat mới” và có text → đặt title theo 1 đoạn ngắn
      if (activeId && text) {
        setConversations(prev =>
          prev.map(c =>
            c.id === activeId && c.title === "Cuộc chat mới"
              ? { ...c, title: text.slice(0, 28) + (text.length > 28 ? "…" : "") }
              : c
          )
        );
      }

      setImageDataUrl(null);
    } catch {
      updateActiveMessages(prev => [...prev, { sender: "ai", text: "⚠ Có lỗi xảy ra, thử lại sau nhé." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/*  TAB luôn hiện (khi đóng) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/3 z-[9999] rounded-l-xl border bg-white px-3 py-3 shadow-lg hover:bg-gray-50"
          title="Mở Trợ lý AI"
        >
          <div className="flex items-center gap-2">
            <ChevronLeft size={18} />
            <span className="text-sm font-semibold">AI</span>
          </div>
        </button>
      )}

      {/*  3) FULL HEIGHT DOCK PANEL */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-[9999] w-[420px] max-w-[92vw] border-l bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-linear-to-l from-[#764BA2] to-[#667EEA] text-white">
            <div className="flex items-center gap-2">
              {/*  2) nút 3 gạch mở history */}
              <button
                onClick={() => setShowHistory(v => !v)}
                className="rounded-md p-1 hover:bg-white/15"
                title="Lịch sử chat"
              >
                <Menu size={20} />
              </button>

              <div className="flex flex-col leading-tight">
                <span className="font-semibold">Trợ lý AI</span>
                <span className="text-xs opacity-90">
                  {userId ? `userId: ${String(userId).slice(0, 8)}…` : "chưa đăng nhập"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-white/15"
                title="Thu nhỏ"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-white/15"
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body: history + chat */}
          <div className="flex-1 flex min-h-0">
            {/* History panel */}
            {showHistory && (
              <div className="w-[180px] border-r bg-gray-50 flex flex-col min-h-0">
                <div className="p-2 flex items-center justify-between border-b">
                  <span className="text-sm font-semibold">Lịch sử</span>
                  <button
                    onClick={createNewConversation}
                    className="rounded-md p-1 hover:bg-gray-100"
                    title="Cuộc chat mới"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left rounded-lg px-2 py-2 text-xs border hover:bg-white ${
                        c.id === activeId ? "bg-white border-gray-300" : "bg-transparent border-transparent"
                      }`}
                      title={c.title}
                    >
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="opacity-60">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-2 text-[11px] opacity-70 border-t">
                  (Tạm lưu trên trình duyệt)
                </div>
              </div>
            )}

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[88%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                      m.sender === "user"
                        ? "bg-linear-to-l from-[#764BA2] to-[#667EEA] text-white ml-auto"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.text && <div>{m.text}</div>}
                    {m.imageDataUrl && (
                      <img
                        src={m.imageDataUrl}
                        alt="uploaded"
                        className="mt-2 max-w-full rounded-md border"
                      />
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm inline-block">
                    AI đang trả lời…
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Preview ảnh */}
              {imageDataUrl && (
                <div className="px-3 pb-2">
                  <div className="relative w-full rounded-lg border bg-gray-50 p-2">
                    <img src={imageDataUrl} alt="preview" className="w-full rounded-md" />
                    <button
                      type="button"
                      onClick={() => setImageDataUrl(null)}
                      className="absolute top-2 right-2 bg-white/90 border rounded-md p-1 hover:bg-white"
                      title="Bỏ ảnh"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePickImage}
                  className="border rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                  title="Gửi ảnh"
                >
                  <ImageIcon size={18} />
                </button>

                <input
                  disabled={loading || !userId} // muốn cho guest dùng thì bỏ `|| !userId`
                  className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                  placeholder={!userId ? "Đăng nhập để chat..." : "Nhập tin nhắn..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                <button
                  disabled={loading || !userId}
                  onClick={sendMessage}
                  className="text-white rounded-lg px-3 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

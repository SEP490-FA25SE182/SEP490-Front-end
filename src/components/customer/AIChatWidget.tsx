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
  RefreshCw,
} from "lucide-react";

import { askGemini, getGeminiHistoryBE, type ChatResponseDTO } from "@/services/Gemini";
import { useAuth } from "@/context/AuthContext";

type ChatMessage = {
  sender: "user" | "ai";
  text?: string;
  imageDataUrl?: string; // chỉ để hiển thị preview ở FE
};

type Conversation = {
  id: string;       // sessionId
  title: string;
  createdAt: number; // timestamp của tin nhắn mới nhất trong session
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

function toSender(role?: string): "user" | "ai" {
  return (role || "").toLowerCase() === "user" ? "user" : "ai"; // "model" -> ai
}

export default function AIChatWidgetDock() {
  const { user } = useAuth();
  const userId = (user as any)?.userId || (user as any)?.id;

  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const lastSendRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  // ===== SERVER state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const serverLoadedRef = useRef(false);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );
  const messages = activeConv?.messages ?? [];

  const updateMessagesById = (convId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: updater(c.messages), createdAt: Date.now() }
          : c
      )
    );
  };

  const createNewConversation = () => {
    const c: Conversation = {
      id: uid(),
      title: "Cuộc chat mới",
      createdAt: Date.now(),
      messages: [],
    };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setShowHistory(false);
  };

  const loadServerHistory = async (force = false) => {
    if (!userId) return;
    if (serverLoadedRef.current && !force) return;

    setServerLoading(true);
    setServerError(null);

    try {
      const list = await getGeminiHistoryBE(String(userId));
      // list: ChatResponseDTO[] (content, role, createdAt, sessionId)

      // group theo sessionId
      const map = new Map<
        string,
        {
          messages: ChatMessage[];
          firstUserText?: string;
          firstAnyText?: string;
          lastAt: number;
        }
      >();

      for (const item of list as ChatResponseDTO[]) {
        const sid = item.sessionId || "unknown";
        const sender = toSender(item.role);
        const text = item.content || "";
        const ts = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();

        if (!map.has(sid)) {
          map.set(sid, { messages: [], lastAt: ts });
        }

        const bucket = map.get(sid)!;
        bucket.messages.push({ sender, text });

        if (!bucket.firstAnyText && text.trim()) bucket.firstAnyText = text.trim();
        if (sender === "user" && !bucket.firstUserText && text.trim()) {
          bucket.firstUserText = text.trim();
        }

        bucket.lastAt = Math.max(bucket.lastAt, ts);
      }

      const serverConvs: Conversation[] = Array.from(map.entries()).map(([sid, b]) => {
        const baseTitle = b.firstUserText || b.firstAnyText || `Phiên ${sid.slice(0, 8)}…`;
        const title = baseTitle.slice(0, 28) + (baseTitle.length > 28 ? "…" : "");

        return {
          id: sid,
          title,
          createdAt: b.lastAt,
          messages: b.messages, // đã đúng thứ tự do BE trả theo thời gian tăng dần
        };
      });

      serverConvs.sort((a, b) => b.createdAt - a.createdAt);

      // merge: giữ các conv FE đang có nhưng chưa có trên server (vd: tạo mới chưa chat)
      setConversations((prev) => {
        const prevById = new Map(prev.map((c) => [c.id, c]));
        const serverIds = new Set(serverConvs.map((c) => c.id));

        const merged = serverConvs.map((sc) => {
          const existing = prevById.get(sc.id);
          // nếu FE có ảnh preview (giàu dữ liệu hơn) thì ưu tiên giữ FE
          if (existing && existing.messages.some((m) => m.imageDataUrl)) return existing;
          return sc;
        });

        const extras = prev.filter((c) => !serverIds.has(c.id));
        const all = [...extras, ...merged];
        all.sort((a, b) => b.createdAt - a.createdAt);
        return all;
      });

      setActiveId((prevActive) => prevActive ?? serverConvs[0]?.id ?? null);
      serverLoadedRef.current = true;
    } catch {
      setServerError("⚠ Không tải được lịch sử từ server.");
    } finally {
      setServerLoading(false);
    }
  };

  // Khi user đổi -> reset cache
  useEffect(() => {
    serverLoadedRef.current = false;
    setConversations([]);
    setActiveId(null);
    setServerError(null);
    setShowHistory(false);
  }, [userId]);

  // Khi mở history panel -> load /history
  useEffect(() => {
    if (!showHistory) return;
    if (!userId) return;
    loadServerHistory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, userId]);

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
      if (activeId) updateMessagesById(activeId, (prev) => [...prev, { sender: "ai", text: "⚠ Vui lòng chọn đúng file ảnh." }]);
      return;
    }

    const MAX_MB = 4;
    if (file.size > MAX_MB * 1024 * 1024) {
      if (activeId) updateMessagesById(activeId, (prev) => [...prev, { sender: "ai", text: `⚠ Ảnh quá nặng. Chọn ảnh < ${MAX_MB}MB.` }]);
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
      if (activeId) updateMessagesById(activeId, (prev) => [...prev, { sender: "ai", text: "⏳ Chờ 2 giây rồi gửi tiếp nhé." }]);
      return;
    }
    lastSendRef.current = now;

    // chưa có session -> tạo mới
    let convId = activeId;
    if (!convId) {
      const c: Conversation = { id: uid(), title: "Cuộc chat mới", createdAt: Date.now(), messages: [] };
      setConversations((prev) => [c, ...prev]);
      setActiveId(c.id);
      convId = c.id;
    }

    // push user message (FE tự biết user text + preview ảnh)
    const userMsg: ChatMessage = {
      sender: "user",
      text: text || undefined,
      imageDataUrl: imageDataUrl || undefined,
    };
    updateMessagesById(convId, (prev) => [...prev, userMsg]);

    setInput("");
    setLoading(true);

    try {
      const reply = await askGemini(
        text || "",
        imageDataUrl || undefined,
        { userId: String(userId), sessionId: String(convId) }
      );

      updateMessagesById(convId, (prev) => [...prev, { sender: "ai", text: reply }]);

      if (text) {
        const newTitle = text.slice(0, 28) + (text.length > 28 ? "…" : "");
        setConversations((prev) =>
          prev.map((c) => (c.id === convId && c.title === "Cuộc chat mới" ? { ...c, title: newTitle } : c))
        );
      }

      setImageDataUrl(null);
    } catch {
      updateMessagesById(convId, (prev) => [...prev, { sender: "ai", text: "⚠ Có lỗi xảy ra, thử lại sau nhé." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-[9999] w-[420px] max-w-[92vw] border-l bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-linear-to-l from-[#764BA2] to-[#667EEA] text-white">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory((v) => !v)}
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
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/15" title="Thu nhỏ">
                <ChevronRight size={20} />
              </button>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/15" title="Đóng">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex min-h-0">
            {/* History panel (server only) */}
            {showHistory && (
              <div className="w-[180px] border-r bg-gray-50 flex flex-col min-h-0">
                <div className="p-2 border-b space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Lịch sử</span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadServerHistory(true)}
                        className="rounded-md p-1 hover:bg-gray-100 disabled:opacity-50"
                        disabled={!userId || serverLoading}
                        title="Tải lại server history"
                      >
                        <RefreshCw size={16} />
                      </button>

                      <button
                        onClick={createNewConversation}
                        className="rounded-md p-1 hover:bg-gray-100"
                        title="Cuộc chat mới"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  {serverError && <div className="text-[11px] text-red-600">{serverError}</div>}
                  {serverLoading && <div className="text-[11px] opacity-70">Đang tải…</div>}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveId(c.id);
                        setShowHistory(false);
                      }}
                      className={`w-full text-left rounded-lg px-2 py-2 text-xs border hover:bg-white ${
                        c.id === activeId ? "bg-white border-gray-300" : "bg-transparent border-transparent"
                      }`}
                      title={c.title}
                    >
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="opacity-60">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </button>
                  ))}

                  {!serverLoading && conversations.length === 0 && (
                    <div className="text-[11px] opacity-70 p-2">Chưa có lịch sử trên server.</div>
                  )}
                </div>

                <div className="p-2 text-[11px] opacity-70 border-t">
                  (Lấy từ /api/rookie/chat/history)
                </div>
              </div>
            )}

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-h-0">
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
                      <img src={m.imageDataUrl} alt="uploaded" className="mt-2 max-w-full rounded-md border" />
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
                  disabled={loading || !userId}
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
                  className="text-white rounded-lg px-3 disabled:opacity-50 bg-linear-to-l from-[#764BA2] to-[#667EEA]"
                  title="Gửi"
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

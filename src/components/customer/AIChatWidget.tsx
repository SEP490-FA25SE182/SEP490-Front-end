import { useState, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { askGemini } from "@/services/Gemini";

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<
    { sender: "user" | "ai"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ debounce: 1 request / 2s
  const lastSendRef = useRef(0);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const now = Date.now();
    if (now - lastSendRef.current < 2000) {
      setMessages(prev => [
        ...prev,
        { sender: "ai", text: "⏳ Chờ 2 giây rồi gửi tiếp nhé." },
      ]);
      return;
    }
    lastSendRef.current = now;

    const userMessage = input;
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const reply = await askGemini(userMessage);
      setMessages(prev => [...prev, { sender: "ai", text: reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { sender: "ai", text: "⚠ Có lỗi xảy ra, thử lại sau nhé." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition z-50"
      >
        <MessageCircle size={28} />
      </button>

      {/* Chatbox */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-[460px] bg-white rounded-xl shadow-xl border flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-blue-600 text-white rounded-t-xl">
            <h3 className="font-semibold text-lg">Trợ lý AI</h3>
            <button onClick={() => setOpen(false)}>
              <X size={24} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[75%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white ml-auto"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm inline-block">
                AI đang trả lời…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              disabled={loading}
              className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              disabled={loading}
              onClick={sendMessage}
              className="bg-blue-600 text-white rounded-lg px-3 hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

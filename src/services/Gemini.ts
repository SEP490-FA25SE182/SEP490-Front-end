// src/services/gemini.ts
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Model mới nhất, nhanh và rẻ → Gemini 2.0 Flash
const MODEL = "gemini-2.0-flash";

export async function askGemini(message: string): Promise<string> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Bạn là trợ lý AI hỗ trợ người Việt. Luôn trả lời bằng TIẾNG VIỆT, rõ ràng, ngắn gọn.\n\n" +
                "Câu hỏi của người dùng: " + message }]
          }
        ]
      }),
    });

    const result = await response.json();

    return (
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠ AI không thể phản hồi lúc này."
    );

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "⚠ Lỗi khi gọi Gemini API.";
  }
}

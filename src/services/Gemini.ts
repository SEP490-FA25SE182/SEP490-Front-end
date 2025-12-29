// src/services/gemini.ts
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

//  parse dataURL -> { mimeType, base64 }
function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error("Invalid data URL");
  return { mimeType: match[1], base64: match[2] };
}

export async function askGemini(message: string, imageDataUrl?: string): Promise<string> {
  try {
    //  Khuyến nghị dùng v1beta theo docs generateContent mới nhất
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`; // :contentReference[oaicite:1]{index=1}

    const systemInstruction =
      "Bạn là trợ lý AI hỗ trợ người Việt. Luôn trả lời bằng TIẾNG VIỆT, rõ ràng, ngắn gọn.";

    const parts: any[] = [];

    const text = (message ?? "").trim();
    if (text) {
      parts.push({ text: `Câu hỏi của người dùng: ${text}` });
    }

    if (imageDataUrl) {
      const { mimeType, base64 } = parseDataUrl(imageDataUrl);
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64,
        },
      });
    }

    if (parts.length === 0) return "⚠ Bạn chưa nhập gì để gửi.";

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        //  system instruction tách riêng (đỡ bị trộn vào câu hỏi)
        systemInstruction: { parts: [{ text: systemInstruction }] }, // :contentReference[oaicite:2]{index=2}
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      }),
    });

    const result = await response.json();

    return (
      result?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      "⚠ AI không thể phản hồi lúc này."
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "⚠ Lỗi khi gọi Gemini API.";
  }
}

import axios from "axios";
import { API_AI } from "@/config";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/** =======================
 *  DTO match BE
 *  POST /api/rookie/chat
 *  GET  /api/rookie/chat/history
 ======================= */
export type ChatRequestDTO = {
  sessionId?: string | null;
  message?: string;
  imageUrls?: string[];
  fileUrls?: string[];
};

export type ChatResponseDTO = {
  sessionId: string;
  content: string;
  createdAt?: string;
  imageUrls?: string[];
  fileUrls?: string[];
  role?: string;
};

function resolveChatBaseURL(api: string) {
  const base = (api || "").replace(/\/+$/, "");
  return `${base}/api/rookie/chat`;
}

const chatHttp = axios.create({
  baseURL: resolveChatBaseURL(API_AI),
  timeout: 60_000,
});

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.match(/data:(.*?);base64/i)?.[1] || "application/octet-stream";

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return { blob: new Blob([bytes], { type: mime }), mime };
}

function guessExtFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "bin";
}

export async function uploadChatImageDataUrl(imageDataUrl: string, userId: string): Promise<string> {
  const { blob, mime } = dataUrlToBlob(imageDataUrl);
  const ext = guessExtFromMime(mime);

  const path = `chat-images/${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const storage = getStorage();
  const r = ref(storage, path);

  await uploadBytes(r, blob, { contentType: mime });
  return getDownloadURL(r);
}

export async function chatGeminiBE(req: ChatRequestDTO, userId: string): Promise<ChatResponseDTO> {
  const { data } = await chatHttp.post<ChatResponseDTO>("", req, {
    headers: { "X-User-Id": userId },
  });
  return data;
}

export async function getGeminiHistoryBE(userId: string) {
  const { data } = await chatHttp.get<ChatResponseDTO[]>("/history", {
    headers: { "X-User-Id": userId },
  });
  return data;
}

export async function askGemini(
  message: string,
  imageDataUrl?: string,
  opts?: { userId: string; sessionId: string }
): Promise<string> {
  if (!opts?.userId) throw new Error("Missing userId");
  if (!opts?.sessionId) throw new Error("Missing sessionId");

  const finalMessage = (message || "").trim() || (imageDataUrl ? "Hãy mô tả ảnh này" : "");
  if (!finalMessage && !imageDataUrl) throw new Error("Empty message");

  let imageUrl: string | undefined;
  if (imageDataUrl) imageUrl = await uploadChatImageDataUrl(imageDataUrl, opts.userId);

  const res = await chatGeminiBE(
    {
      sessionId: opts.sessionId,
      message: finalMessage,
      imageUrls: imageUrl ? [imageUrl] : [],
      fileUrls: [], // giữ đúng form request “chuẩn” của bạn
    },
    opts.userId
  );

  //  BE mới trả content
  return res.content;
}

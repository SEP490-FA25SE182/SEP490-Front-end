import axios from "axios";
import { API_AI } from "@/config";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/** =======================
 *  DTO match BE (ai-service)
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
  role?: string;       // "user" | "model"
  createdAt?: string;  // ISO string (Instant)
};

function resolveChatBaseURL(api: string) {
  const base = (api || "").replace(/\/+$/, "");


  // còn lại coi như là root host
  return `${base}/chat`;
}

const chatHttp = axios.create({
  baseURL: resolveChatBaseURL(API_AI),
  timeout: 60_000,
});

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime =
    meta?.match(/data:(.*?);base64/i)?.[1] || "application/octet-stream";

  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

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

/** Upload ảnh chat lên Firebase -> trả về downloadURL public */
export async function uploadChatImageDataUrl(
  imageDataUrl: string,
  userId: string
): Promise<string> {
  const { blob, mime } = dataUrlToBlob(imageDataUrl);
  const ext = guessExtFromMime(mime);

  const path = `chat-images/${userId}/${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;

  const storage = getStorage();
  const r = ref(storage, path);

  await uploadBytes(r, blob, { contentType: mime });
  return getDownloadURL(r);
}

/** Call BE chat */
export async function chatGeminiBE(
  req: ChatRequestDTO,
  userId: string
): Promise<ChatResponseDTO> {
  const { data } = await chatHttp.post<ChatResponseDTO>(
    "", // POST /api/rookie/chat
    req,
    { headers: { "X-User-Id": userId } }
  );
  return data;
}

/** Lấy history từ BE */
export async function getGeminiHistoryBE(userId: string) {
  const { data } = await chatHttp.get<ChatResponseDTO[]>("/history", {
    headers: { "X-User-Id": userId },
  });
  return data;
}

/**
 * API tương thích UI:
 * - FE có imageDataUrl -> upload Firebase lấy URL
 * - Gửi URL vào imageUrls cho BE
 */
export async function askGemini(
  message: string,
  imageDataUrl?: string,
  opts?: { userId: string; sessionId?: string | null }
): Promise<string> {
  if (!opts?.userId) throw new Error("Missing userId");

  const finalMessage =
    (message || "").trim() ||
    (imageDataUrl ? "Hãy mô tả ảnh này" : "");

  if (!finalMessage && !imageDataUrl) {
    throw new Error("Empty message");
  }

  let imageUrl: string | undefined;

  if (imageDataUrl) {
    imageUrl = await uploadChatImageDataUrl(imageDataUrl, opts.userId);
  }

  const res = await chatGeminiBE(
    {
      sessionId: opts.sessionId ?? undefined,
      message: finalMessage,
      imageUrls: imageUrl ? [imageUrl] : undefined,
      fileUrls: [], // optional, để đúng form “chuẩn” bạn hay test
    },
    opts.userId
  );

  // ✅ BE mới trả về field "content"
  return res.content;
}

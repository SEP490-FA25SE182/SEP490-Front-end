import axios from "axios";
import { useMutation } from "@tanstack/react-query";

const API_BASE_URL = "http://localhost:8082/api/rookie";

/* ====================== INTERFACES ====================== */

export interface AIGeneration {
  aiGenerationId?: string;
  modelName: string;
  prompt: string;
  negativePrompt?: string;
  durationMs?: number;
  status?: string;
  userId?: string;
  mode?: string;
  aspectRatio?: string;
  strength?: number;
  seed?: number;
  cfgScale?: number;
  stylePreset?: string;
  acceptHeader?: string;
  inputImageUrl?: string;
  style?: string;
  format?: string;
  title?: string;
  isActived?: string;
}

export interface AIGenerationTarget {
  targetType: string;
  aiGenerationId: string;
  targetRefId: string;
  isActived?: string;
  updatedAt?: string;
}

export interface Illustration {
  illustrationId?: string;
  imageUrl: string;
  style: string;
  format: string;
  width: number;
  height: number;
  title: string;
  isActived?: string;
}

export interface GenerateIllustrationMeta {
  strength: number;
  mode: string; // e.g., TEXT_TO_IMAGE
  prompt: string;
  width: number;
  height: number;
  cfgScale: number;
  aspectRatio: string;
  stylePreset: string;
  modelName: string;
  format: string;
  title: string;
  style: string;
  negativePrompt?: string;
  controlnetType?: string;
  seed?: number;
}

/* ====================== API CALLS ====================== */

/**
 * Gọi AI sinh ảnh từ Stability AI
 */
export const generateIllustration = async (
  userId: string,
  meta: GenerateIllustrationMeta
) => {
  const response = await axios.post(
    `${API_BASE_URL}/illustrations/generate/generate`,
    { meta },
    { headers: { "X-User-Id": userId } }
  );
  return response.data;
};

/**
 * Tạo bản ghi Illustration sau khi ảnh được sinh
 */
export const createIllustration = async (
  data: Illustration[]
): Promise<Illustration[]> => {
  const response = await axios.post(`${API_BASE_URL}/illustrations`, data);
  return response.data;
};

/**
 * Lưu thông tin AI Generation
 */
export const createAIGeneration = async (
  data: AIGeneration[]
): Promise<AIGeneration[]> => {
  const response = await axios.post(`${API_BASE_URL}/ai-generations`, data);
  return response.data;
};

/**
 * Gắn mối quan hệ AI Generation với mục tiêu (Page, Illustration, v.v)
 */
export const createAIGenerationTarget = async (
  data: AIGenerationTarget[]
): Promise<AIGenerationTarget[]> => {
  const response = await axios.post(`${API_BASE_URL}/ai-generation-targets`, data);
  return response.data;
};

/* ====================== HOOKS ====================== */

/** Hook: Gọi AI sinh ảnh */
export const useGenerateIllustration = () => {
  return useMutation({
    mutationFn: ({
      userId,
      meta,
    }: {
      userId: string;
      meta: GenerateIllustrationMeta;
    }) => generateIllustration(userId, meta),
  });
};

/** Hook: Tạo mới Illustration */
export const useCreateIllustration = () => {
  return useMutation({
    mutationFn: (data: Illustration[]) => createIllustration(data),
  });
};

/** Hook: Tạo mới AI Generation */
export const useCreateAIGeneration = () => {
  return useMutation({
    mutationFn: (data: AIGeneration[]) => createAIGeneration(data),
  });
};

/** Hook: Gắn AI Generation Target */
export const useCreateAIGenerationTarget = () => {
  return useMutation({
    mutationFn: (data: AIGenerationTarget[]) =>
      createAIGenerationTarget(data),
  });
};

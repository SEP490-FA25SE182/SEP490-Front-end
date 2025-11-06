import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = "http://localhost:8082/api/rookie";

/* ====================== INTERFACES ====================== */

export interface AIGeneration {
  aiGenerationId?: string;
  modelName: string;
  prompt: string;
  negativePrompt?: string;
  durationMs?: number;
  status?: number;
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
  aiGenerationId: string;
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
  userId?: string;
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

export interface Audio {
  audioId?: string;
  audioUrl: string;
  voice: string;
  format: string;
  language: string;
  durationMs: number;
  title: string;
  isActived: string; // "ACTIVE" hoặc "INACTIVE"
  userId?: string;
}

export interface PageAudio {
  pageId: string;
  audioId: string;
}

export interface PageIllustration {
  pageId: string;
  illustrationId: string;
}

export interface GenerateTTSMeta {
  text: string;
  voiceName: string;
  title: string;
  language: string;
  format: string;
  model: string;
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

/**
 * Lấy danh sách tất cả audios
 */
export const getAudios = async (params?: { userId?: string }): Promise<Audio[]> => {
  const response = await axios.get(`${API_BASE_URL}/audios`, { params });
  return response.data;
};

/**
 * Lấy chi tiết một audio theo ID
 */
export const getAudioById = async (id: string): Promise<Audio> => {
  const response = await axios.get(`${API_BASE_URL}/audios/${id}`);
  return response.data;
};

/**
 * Tạo mới audio (POST)
 */
export const createAudio = async (data: Audio[]): Promise<Audio[]> => {
  const response = await axios.post(`${API_BASE_URL}/audios`, data);
  return response.data;
};

/**
 * Cập nhật audio theo ID (PUT)
 */
export const updateAudio = async (
  id: string,
  data: Audio
): Promise<Audio> => {
  const response = await axios.put(`${API_BASE_URL}/audios/${id}`, data);
  return response.data;
};

/**
 * Xoá audio theo ID (DELETE)
 */
export const deleteAudio = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/audios/${id}`);
};

export const createPageAudio = async (
  data: PageAudio[]
): Promise<PageAudio[]> => {
  const response = await axios.post(`${API_BASE_URL}/page-audios`, data);
  return response.data;
};

/**
 * Gắn illustration với trang (Page-Illustrations)
 */
export const createPageIllustration = async (
  data: PageIllustration[]
): Promise<PageIllustration[]> => {
  const response = await axios.post(`${API_BASE_URL}/page-illustrations`, data);
  return response.data;
};

export const generateIllustrationWithImage = async (
  userId: string,
  meta: GenerateIllustrationMeta,
  controlImage?: File
) => {
  const formData = new FormData();
  formData.append("meta", JSON.stringify(meta));
  if (controlImage) formData.append("controlImage", controlImage);

  const response = await axios.post(
    `${API_BASE_URL}/illustrations/generate/generate`,
    formData,
    {
      headers: {
        "X-User-Id": userId, // ✅ giữ lại header này
      },
      withCredentials: false, // hoặc true nếu backend yêu cầu cookie
    }
  );

  return response.data;
};

export const generateTTS = async (
  userId: string,
  meta: GenerateTTSMeta
): Promise<Audio> => {
  const response = await axios.post(
    `${API_BASE_URL}/audios/tts`,
    meta,
    {
      headers: {
        "X-User-Id": userId,
      },
    }
  );
  return response.data;
};

export const getAllAIGenerations = async (): Promise<AIGeneration[]> => {
  const response = await axios.get(`${API_BASE_URL}/ai-generations`);
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

/** Hook: Lấy tất cả audios */
export const useGetAudios = (params?: { userId?: string }) => {
  return useQuery({
    queryKey: ["audios", params],
    queryFn: () => getAudios(params),
  });
};

/** Hook: Lấy audio theo ID */
export const useGetAudioById = () => {
  return useMutation({
    mutationFn: (id: string) => getAudioById(id),
  });
};

/** Hook: Tạo mới audio */
export const useCreateAudio = () => {
  return useMutation({
    mutationFn: (data: Audio[]) => createAudio(data),
  });
};

/** Hook: Cập nhật audio */
export const useUpdateAudio = () => {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Audio;
    }) => updateAudio(id, data),
  });
};

/** Hook: Xoá audio */
export const useDeleteAudio = () => {
  return useMutation({
    mutationFn: (id: string) => deleteAudio(id),
  });
};

export const useCreatePageAudio = () => {
  return useMutation({
    mutationFn: (data: PageAudio[]) => createPageAudio(data),
  });
};

/** Hook: Gắn illustration vào trang */
export const useCreatePageIllustration = () => {
  return useMutation({
    mutationFn: (data: PageIllustration[]) => createPageIllustration(data),
  });
};
export const useGenerateIllustrationWithImage = () => {
  return useMutation({
    mutationFn: ({
      userId,
      meta,
      controlImage,
    }: {
      userId: string;
      meta: GenerateIllustrationMeta;
      controlImage?: File;
    }) => generateIllustrationWithImage(userId, meta, controlImage),
  });
};

export const useGenerateTTS = () => {
  return useMutation({
    mutationFn: ({
      userId,
      meta,
    }: {
      userId: string;
      meta: GenerateTTSMeta;
    }) => generateTTS(userId, meta),
  });
};

export const useGetAllAIGenerations = () => {
  return useQuery<AIGeneration[]>({
    queryKey: ["aiGenerations"],
    queryFn: () => getAllAIGenerations(),
    staleTime: 5 * 60 * 1000, // Dữ liệu giữ trong 5 phút trước khi stale
  });
};
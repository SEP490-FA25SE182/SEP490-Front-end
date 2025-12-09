import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { API_AI } from "@/config";

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
  pageAudioId?: string;
  pageId: string;
  audioId: string;
}

export interface PageIllustration {
  pageIllustrationId?: string;
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

// thêm interface cho meta upload (filename + language)
export interface UploadTTSMeta {
  filename: string;
  language: string;
}

/**
 * Upload file + meta (filename, language) tới endpoint /audios/tts/upload
 * Yêu cầu header X-User-Id
 */
export const uploadTTSFile = async (
  userId: string,
  meta: UploadTTSMeta,
  file: File
): Promise<Audio> => {
  const formData = new FormData();
  formData.append("meta", JSON.stringify(meta));
  formData.append("file", file);

  const response = await axios.post(
    `${API_AI}/audios/tts/upload`,
    formData,
    {
      headers: {
        "X-User-Id": userId,
        "Content-Type": "multipart/form-data",
      },
      withCredentials: false,
    }
  );

  return response.data;
};

/* ====================== API CALLS ====================== */

/**
 * Gọi AI sinh ảnh từ Stability AI
 */
export const generateIllustration = async (
  userId: string,
  meta: GenerateIllustrationMeta
) => {
  const response = await axios.post(
    `${API_AI}/illustrations/generate/generate`,
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
  const response = await axios.post(`${API_AI}/illustrations`, data);
  return response.data;
};

/**
 * Lưu thông tin AI Generation
 */
export const createAIGeneration = async (
  data: AIGeneration[]
): Promise<AIGeneration[]> => {
  const response = await axios.post(`${API_AI}/ai-generations`, data);
  return response.data;
};

/**
 * Gắn mối quan hệ AI Generation với mục tiêu (Page, Illustration, v.v)
 */
export const createAIGenerationTarget = async (
  data: AIGenerationTarget[]
): Promise<AIGenerationTarget[]> => {
  const response = await axios.post(`${API_AI}/ai-generation-targets`, data);
  return response.data;
};

/**
 * Lấy danh sách tất cả audios
 */
export const getAudios = async (params?: { userId?: string }): Promise<Audio[]> => {
  const response = await axios.get(`${API_AI}/audios`, { params });
  return response.data;
};

/**
 * Lấy chi tiết một audio theo ID
 */
export const getAudioById = async (id: string): Promise<Audio> => {
  const response = await axios.get(`${API_AI}/audios/${id}`);
  return response.data;
};

/**
 * Tạo mới audio (POST)
 */
export const createAudio = async (data: Audio[]): Promise<Audio[]> => {
  const response = await axios.post(`${API_AI}/audios`, data);
  return response.data;
};

/**
 * Cập nhật audio theo ID (PUT)
 */
export const updateAudio = async (
  id: string,
  data: Audio
): Promise<Audio> => {
  const response = await axios.put(`${API_AI}/audios/${id}`, data);
  return response.data;
};

/**
 * Xoá audio theo ID (DELETE)
 */
export const deleteAudio = async (id: string): Promise<void> => {
  await axios.delete(`${API_AI}/audios/${id}`);
};

export const createPageAudio = async (
  data: PageAudio[]
): Promise<PageAudio[]> => {
  const response = await axios.post(`${API_AI}/page-audios`, data);
  return response.data;
};

/**
 * Gắn illustration với trang (Page-Illustrations)
 */
export const createPageIllustration = async (
  data: PageIllustration[]
): Promise<PageIllustration[]> => {
  const response = await axios.post(`${API_AI}/page-illustrations`, data);
  return response.data;
};

export const generateIllustrationWithImage = async (
  userId: string,
  meta: GenerateIllustrationMeta,
  controlImage?: File
) => {
  const formData = new FormData();

  // 👇 meta có aspectRatio → gửi xuống backend
  formData.append("meta", JSON.stringify(meta));

  if (controlImage) formData.append("controlImage", controlImage);

  const response = await axios.post(
    `${API_AI}/illustrations/generate/generate`,
    formData,
    {
      headers: { "X-User-Id": userId },
      withCredentials: false,
    }
  );

  return response.data;
};


export const generateTTS = async (
  userId: string,
  meta: GenerateTTSMeta
): Promise<Audio> => {
  const response = await axios.post(
    `${API_AI}/audios/tts`,
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
  const response = await axios.get(`${API_AI}/ai-generations`);
  return response.data;
};

/**
 * Lấy danh sách tất cả illustrations
 */
export const getAllIllustrations = async (params?: { userId?: string }): Promise<Illustration[]> => {
  const response = await axios.get(`${API_AI}/illustrations`, { params });
  return response.data;
};

/**
 * Lấy chi tiết một illustration theo ID
 */
export const getIllustrationById = async (id: string): Promise<Illustration> => {
  const response = await axios.get(`${API_AI}/illustrations/${id}`);
  return response.data;
};

/**
 * Search for audios with filters
 */
export const searchAudios = async (params?: {
  voice?: string;
  query?: string;
  format?: string;
  language?: string;
  title?: string;
  isActived?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<Audio[]> => {
  const response = await axios.get(`${API_AI}/audios/search`, { params });
  return response.data?.content ?? [];
};

/**
 * Search for illustrations with filters
 */
export const searchIllustrations = async (params?: {
  style?: string;
  format?: string;
  title?: string;
  isActived?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<Illustration[]> => {
  const response = await axios.get(`${API_AI}/illustrations/search`, { params });
  return response.data?.content ?? [];
};

/**
 * Search for page-audios with filters
 */
export const searchPageAudios = async (params?: {
  pageId?: string;
  audioId?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<{
  content: PageAudio[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: string[];
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: string[];
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}> => {
  const response = await axios.get(`${API_AI}/page-audios/search`, { params });
  return response.data;
};

/**
 * Search for page-illustrations with filters
 */
export const searchPageIllustrations = async (params?: {
  pageId?: string;
  illustrationId?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<{
  content: PageIllustration[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: string[];
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: string[];
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}> => {
  const response = await axios.get(`${API_AI}/page-illustrations/search`, { params });
  return response.data;
};

/**
 * Update page-audio relationship by ID
 */
export const updatePageAudio = async (
  id: string,
  data: PageAudio
): Promise<PageAudio> => {
  const response = await axios.put(`${API_AI}/page-audios/${id}`, data);
  return response.data;
};

/**
 * Update page-illustration relationship by ID
 */
export const updatePageIllustration = async (
  id: string,
  data: PageIllustration
): Promise<PageIllustration> => {
  const response = await axios.put(`${API_AI}/page-illustrations/${id}`, data);
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

/** Hook: Lấy tất cả illustrations */
export const useGetAllIllustrations = (params?: { userId?: string }) => {
  return useQuery({
    queryKey: ["illustrations", params],
    queryFn: () => getAllIllustrations(params),
  });
};

/** Hook: Lấy illustration theo ID */
export const useGetIllustrationById = () => {
  return useMutation({
    mutationFn: (id: string) => getIllustrationById(id),
  });
};
/** Hook: Search for audios */
export const useSearchAudios = (params?: {
  voice?: string;
  query?: string;
  format?: string;
  language?: string;
  title?: string;
  isActived?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}) => {
  return useQuery({
    queryKey: ["audios", "search", params],
    queryFn: () => searchAudios(params),
  });
};

/** Hook: Search for illustrations */
export const useSearchIllustrations = (params?: {
  style?: string;
  format?: string;
  title?: string;
  isActived?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}) => {
  return useQuery({
    queryKey: ["illustrations", "search", params],
    queryFn: () => searchIllustrations(params),
  });
};

/** Hook: Search for page-audios */
export const useSearchPageAudios = (params?: {
  pageId?: string;
  audioId?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}) => {
  return useQuery({
    queryKey: ["pageAudios", "search", params],
    queryFn: () => searchPageAudios(params),
  });
};

/** Hook: Search for page-illustrations */
export const useSearchPageIllustrations = (params?: {
  pageId?: string;
  illustrationId?: string;
  userId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}) => {
  return useQuery({
    queryKey: ["pageIllustrations", "search", params],
    queryFn: () => searchPageIllustrations(params),
  });
};

/** Hook: Update page-audio */
export const useUpdatePageAudio = () => {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: PageAudio;
    }) => updatePageAudio(id, data),
  });
};

/** Hook: Update page-illustration */
export const useUpdatePageIllustration = () => {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: PageIllustration;
    }) => updatePageIllustration(id, data),
  });
};

/** Hook: Upload TTS file */
export const useUploadTTSFile = () => {
  return useMutation({
    mutationFn: ({
      userId,
      meta,
      file,
    }: {
      userId: string;
      meta: UploadTTSMeta;
      file: File;
    }) => uploadTTSFile(userId, meta, file),
  });
};
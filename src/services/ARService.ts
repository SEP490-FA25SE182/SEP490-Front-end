import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { API_AR } from "@/config";

/* ====================== INTERFACES ====================== */

export interface Marker {
  markerId?: string;
  markerCode: string;
  markerType: string;
  imageUrl?: string;
  physicalWidthM?: number;      // new
  printablePdfUrl?: string;     // new
  isActived?: string;           // new (e.g. "ACTIVE")
  createdAt?: string;
  updatedAt?: string;    
  userId?: string;        // new
}

export interface MarkerSearchParams {
  markerCode?: string;
  markerType?: string;
  pageId?: string;   // added
  userId?: string;   // added
  page?: number;
  size?: number;
  sort?: string[];
}

export interface PagedResponse<T> {
  content: T[];
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
}

/* ====================== API CALLS ====================== */

/**
 * Tạo marker (POST /markers)
 * Swagger sample shows a single object in request body — dùng Marker (không phải mảng)
 */
export const createMarker = async (data: Marker): Promise<Marker> => {
  const response = await axios.post(`${API_AR}/markers`, data);
  return response.data;
};

/**
 * Lấy marker theo ID (GET /markers/{id})
 */
export const getMarkerById = async (id: string): Promise<Marker> => {
  const response = await axios.get(`${API_AR}/markers/${id}`);
  return response.data;
};

/**
 * Cập nhật marker theo ID (PUT /markers/{id})
 */
export const updateMarker = async (id: string, data: Marker): Promise<Marker> => {
  const response = await axios.put(`${API_AR}/markers/${id}`, data);
  return response.data;
};

/**
 * Xoá marker theo ID (DELETE /markers/{id})
 */
export const deleteMarker = async (id: string): Promise<void> => {
  await axios.delete(`${API_AR}/markers/${id}`);
};

/**
 * Search markers (GET /markers/search)
 */
export const searchMarkers = async (
  params?: MarkerSearchParams
): Promise<PagedResponse<Marker>> => {
  const response = await axios.get(`${API_AR}/markers/search`, { params });
  return response.data;
};

/* ====================== REACT QUERY HOOKS ====================== */

/** Hook: Tạo marker */
export const useCreateMarker = () => {
  return useMutation({
    mutationFn: (data: Marker) => createMarker(data),
  });
};

/** Hook: Lấy marker theo ID (sử dụng useQuery để cache và enabled theo id) */
export const useGetMarkerById = (id?: string, _p0?: { initialData: Marker | undefined; }) => {
  return useQuery({
    queryKey: ["markers", id],
    queryFn: () => getMarkerById(id as string),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

/** Hook: Cập nhật marker */
export const useUpdateMarker = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Marker }) =>
      updateMarker(id, data),
  });
};

/** Hook: Xoá marker */
export const useDeleteMarker = () => {
  return useMutation({
    mutationFn: (id: string) => deleteMarker(id),
  });
};

/** Hook: Search markers (paged) */
export const useSearchMarkers = (params?: MarkerSearchParams) => {
  return useQuery({
    queryKey: ["markers", "search", params],
    queryFn: () => searchMarkers(params),
  });
};

/* ====================== EXTRA MARKER API ====================== */

/**
 * Get all markers (example response is an array)
 * GET /markers
 */
export const getAllMarkers = async (): Promise<Marker[]> => {
  const response = await axios.get(`${API_AR}/markers`);
  return response.data;
};

export const useGetAllMarkers = () => {
  return useQuery({
    queryKey: ["markers", "all"],
    queryFn: () => getAllMarkers(),
  });
};

export const attachMarkerToPage = async (
  markerId: string,
  pageId: string
): Promise<void> => {
  await axios.post(`${API_AR}/markers/${markerId}/pages/${pageId}`);
};

export const useAttachMarkerToPage = () => {
  return useMutation({
    mutationFn: ({ markerId, pageId }: { markerId: string; pageId: string }) =>
      attachMarkerToPage(markerId, pageId),
  });
};

/* ====================== ASSET3D (UPDATED FIELDS) ====================== */

export interface Asset3D {
  // match actual API response keys
  asset3DId?: string;
  markerId?: string;
  userId?: string;
  assetUrl?: string;
  thumbUrl?: string | null;
  source?: string;
  prompt?: string;
  fileName?: string;
  format?: string;
  polycount?: number;
  fileSize?: number;
  scale?: number | null;
  createdAt?: string;
  isActived?: string;           // new (e.g. "ACTIVE")
  updatedAt?: string;           // optional, added for completeness
}

export interface Asset3DSearchParams {
  markerId?: string;
  userId?: string;
  format?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

export interface Asset3DUploadMeta {
  markerId: string;
  userId?: string;
  prompt?: string;
  fileName?: string;
  format?: string;
  scale?: number;
}

export interface GenerateAsset3DMeta {
  markerId?: string;
  userId?: string;
  prompt?: string;
  format?: string;
  quality?: string;
  fileName?: string;
  refine?: boolean;
  enableBr?: boolean;
  texturePrompt?: string;
  textureImageUrl?: string;
}

/* ====================== ASSET3D API CALLS ====================== */

/**
 * Upload asset3d file + meta (multipart/form-data)
 * POST /asset3d/upload
 * body: file (binary) + meta (object JSON)
 */
export const uploadAsset3D = async (
  file: File,
  meta: Asset3DUploadMeta
): Promise<Asset3D> => {
  const form = new FormData();
  form.append("file", file);
  form.append("meta", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  const response = await axios.post(`${API_AR}/asset3d/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * Generate asset3d from prompt
 * POST /asset3d/generate
 */
export const generateAsset3D = async (
  meta: GenerateAsset3DMeta
): Promise<Asset3D> => {
  const response = await axios.post(`${API_AR}/asset3d/generate`, meta);
  return response.data;
};

/**
 * Get asset3d by id
 * GET /asset3d/{id}
 */
export const getAsset3DById = async (id: string): Promise<Asset3D> => {
  const response = await axios.get(`${API_AR}/asset3d/${id}`);
  return response.data;
};

/**
 * Delete asset3d by id
 * DELETE /asset3d/{id}
 */
export const deleteAsset3D = async (id: string): Promise<void> => {
  await axios.delete(`${API_AR}/asset3d/${id}`);
};

/**
 * Search asset3d (paged)
 * GET /asset3d/search
 */
export const searchAsset3D = async (
  params?: Asset3DSearchParams
): Promise<PagedResponse<Asset3D>> => {
  const response = await axios.get(`${API_AR}/asset3d/search`, { params });
  return response.data;
};

/**
 * Get asset3d by marker code (paged)
 * GET /asset3d/by-marker-code/{code}
 */
export const getAsset3DByMarkerCode = async (
  code: string,
  params?: { page?: number; size?: number; sort?: string[] }
): Promise<PagedResponse<Asset3D>> => {
  const response = await axios.get(`${API_AR}/asset3d/by-marker-code/${encodeURIComponent(code)}`, {
    params,
  });
  return response.data;
};

/**
 * Get latest asset3d for a marker (limit)
 * GET /asset3d/latest?markerId=...&limit=...
 */
export const getLatestAsset3D = async (
  markerId: string,
  limit: number = 3
): Promise<Asset3D[]> => {
  const response = await axios.get(`${API_AR}/asset3d/latest`, {
    params: { markerId, limit },
  });
  return response.data;
};

/* ====================== REACT QUERY HOOKS FOR ASSET3D ====================== */

export const useUploadAsset3D = () => {
  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: Asset3DUploadMeta }) =>
      uploadAsset3D(file, meta),
  });
};

export const useGenerateAsset3D = () => {
  return useMutation({
    mutationFn: (meta: GenerateAsset3DMeta) => generateAsset3D(meta),
  });
};

export const useGetAsset3DById = (id?: string) => {
  return useQuery({
    queryKey: ["asset3d", id],
    queryFn: () => getAsset3DById(id as string),
    enabled: !!id,
  });
};

export const useDeleteAsset3D = () => {
  return useMutation({
    mutationFn: (id: string) => deleteAsset3D(id),
  });
};

export const useSearchAsset3D = (params?: Asset3DSearchParams) => {
  return useQuery({
    queryKey: ["asset3d", "search", params],
    queryFn: () => searchAsset3D(params),
    placeholderData: (prev) => prev,
  });
};

export const useGetAsset3DByMarkerCode = (code?: string, params?: { page?: number; size?: number; sort?: string[] }) => {
  return useQuery({
    queryKey: ["asset3d", "by-marker-code", code, params],
    queryFn: () => getAsset3DByMarkerCode(code as string, params),
    enabled: !!code,
    placeholderData: (prev) => prev,
  });
};

export const useGetLatestAsset3D = (markerId?: string, limit: number = 3) => {
  return useQuery({
    queryKey: ["asset3d", "latest", markerId, limit],
    queryFn: () => getLatestAsset3D(markerId as string, limit),
    enabled: !!markerId,
  });
};

/* ====================== AR SCENES (ar-scenes) ====================== */

export interface ARScene {
  arSceneId?: string;
  markerId?: string;
  name?: string;
  description?: string;
  version?: number;
  status?: string;
  // Hidden flag defaulted by UI when creating/publishing scenes
  isActived?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ARSceneSearchParams {
  markerId?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

/** POST /ar-scenes */
export const createARScene = async (data: ARScene): Promise<ARScene> => {
  const response = await axios.post(`${API_AR}/ar-scenes`, data);
  return response.data;
};

/** GET /ar-scenes/{id} */
export const getARSceneById = async (id: string): Promise<ARScene> => {
  const response = await axios.get(`${API_AR}/ar-scenes/${id}`);
  return response.data;
};

/** PUT /ar-scenes/{id} */
export const updateARScene = async (id: string, data: ARScene): Promise<ARScene> => {
  const response = await axios.put(`${API_AR}/ar-scenes/${id}`, data);
  return response.data;
};

/** DELETE /ar-scenes/{id} */
export const deleteARScene = async (id: string): Promise<void> => {
  await axios.delete(`${API_AR}/ar-scenes/${id}`);
};

/** GET /ar-scenes/search */
export const searchARScenes = async (
  params?: ARSceneSearchParams
): Promise<PagedResponse<ARScene>> => {
  const response = await axios.get(`${API_AR}/ar-scenes/search`, { params });
  return response.data;
};

/* ====================== REACT QUERY HOOKS FOR AR SCENES ====================== */

export const useCreateARScene = () => {
  return useMutation({
    mutationFn: (data: ARScene) => createARScene(data),
  });
};

export const useGetARSceneById = (id?: string) => {
  return useQuery({
    queryKey: ["ar-scenes", id],
    queryFn: () => getARSceneById(id as string),
    enabled: !!id,
  });
};

export const useUpdateARScene = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ARScene }) =>
      updateARScene(id, data),
  });
};

export const useDeleteARScene = () => {
  return useMutation({
    mutationFn: (id: string) => deleteARScene(id),
  });
};

export const useSearchARScenes = (params?: ARSceneSearchParams) => {
  return useQuery({
    queryKey: ["ar-scenes", "search", params],
    queryFn: () => searchARScenes(params),
  });
};

/* ====================== AR SCENE ITEMS (ar-scene-items) ====================== */

export interface ARSceneItem {
  id?: string;
  sceneId?: string;
  asset3DId?: string;
  orderIndex?: number;
  posX?: number;
  posY?: number;
  posZ?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  behaviorJson?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ARSceneItemSearchParams {
  sceneId?: string;
  asset3dId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

/** POST /ar-scenes/ar-scene-items  (bulk create) */
export const createARSceneItems = async (
  items: ARSceneItem[]
): Promise<ARSceneItem[]> => {
  const response = await axios.post(
    `${API_AR}/ar-scenes/ar-scene-items`,
    items
  );
  return response.data;
};

/** GET /ar-scenes/ar-scene-items/{id} */
export const getARSceneItemById = async (id: string): Promise<ARSceneItem> => {
  const response = await axios.get(
    `${API_AR}/ar-scenes/ar-scene-items/${id}`
  );
  return response.data;
};

/** PUT /ar-scenes/ar-scene-items/{id} */
export const updateARSceneItem = async (
  id: string,
  data: ARSceneItem
): Promise<ARSceneItem> => {
  const response = await axios.put(
    `${API_AR}/ar-scenes/ar-scene-items/${id}`,
    data
  );
  return response.data;
};

/** DELETE /ar-scenes/ar-scene-items/{id} */
export const deleteARSceneItem = async (id: string): Promise<void> => {
  await axios.delete(`${API_AR}/ar-scenes/ar-scene-items/${id}`);
};

/** GET /ar-scenes/ar-scene-items/search */
export const searchARSceneItems = async (
  params?: ARSceneItemSearchParams
): Promise<PagedResponse<ARSceneItem>> => {
  const response = await axios.get(
    `${API_AR}/ar-scenes/ar-scene-items/search`,
    { params }
  );
  return response.data;
};

/* ====================== REACT QUERY HOOKS FOR AR SCENE ITEMS ====================== */

export const useCreateARSceneItems = () => {
  return useMutation({
    mutationFn: (items: ARSceneItem[]) => createARSceneItems(items),
  });
};

export const useGetARSceneItemById = (id?: string) => {
  return useQuery({
    queryKey: ["ar-scene-items", id],
    queryFn: () => getARSceneItemById(id as string),
    enabled: !!id,
  });
};

export const useUpdateARSceneItem = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ARSceneItem }) =>
      updateARSceneItem(id, data),
  });
};

export const useDeleteARSceneItem = () => {
  return useMutation({
    mutationFn: (id: string) => deleteARSceneItem(id),
  });
};

export const useSearchARSceneItems = (params?: ARSceneItemSearchParams) => {
  return useQuery({
    queryKey: ["ar-scene-items", "search", params],
    queryFn: () => searchARSceneItems(params),
  });
};
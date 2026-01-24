import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { API_AI } from "@/config";

export interface ModerationScanRequestDTO {
  content: string;
  language?: "vi" | "en";
  entityType?: "PAGE" | "CHAPTER" | "BOOK" | string;
  entityId?: string;
}

export interface ForbiddenWordMatchDTO {
  word: string;
  start: number;
  end: number;
  context: string;
}

export interface PlagiarismHitDTO {
  sourceType: "PAGE" | "CHAPTER" | "BOOK" | string;
  sourceId: string;
  similarity: number;
  snippet?: string | null;
}

export interface OnlinePlagiarismSourceDTO {
  url: string;
  title?: string | null;
  similarity: number;
}

export interface ModerationScanResponseDTO {
  language: string;

  forbiddenCount: number;
  forbiddenMatches: ForbiddenWordMatchDTO[];

  maxSimilarity: number;
  plagiarismFlag: boolean;
  plagiarismHits: PlagiarismHitDTO[];

  onlineSources?: OnlinePlagiarismSourceDTO[];

  aiRiskLevel: string;
  aiAction: string;
  aiReasons: string[];
}


export const scanModeration = async (
  data: ModerationScanRequestDTO
): Promise<ModerationScanResponseDTO> => {
  const res = await axios.post(
    `${API_AI}/moderation/scan`,
    data
  );
  return res.data;
};

export const useScanModeration = () =>
  useMutation({
    mutationFn: (data: ModerationScanRequestDTO) =>
      scanModeration(data),
  });

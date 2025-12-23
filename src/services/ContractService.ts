import axios from "axios";
import { API_RK } from "@/config";

/* =======================
   TYPES – đúng với BE DTO
======================= */

export type ContractStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "TERMINATED";

export type IsActived = "ACTIVE" | "INACTIVE";

export interface ContractResponseDTO {
  contractId: string;
  contractNumber: string;
  title?: string;
  description?: string;
  documentUrl?: string;
  startDate?: string;
  endDate?: string;
  status: ContractStatus;
  isActived: IsActived;
  note?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ContractRequestDTO {
  contractNumber?: string;
  title?: string;
  description?: string;
  documentUrl?: string;
  startDate?: string;
  endDate?: string;
  status?: ContractStatus;
  note?: string;
  userId: string;
}

/* =======================
   BASE URL ĐÚNG
======================= */

const CONTRACT_API = `${API_RK}/contracts`;

/* =======================
   SERVICE
======================= */

export const ContractService = {
  /** GET /api/rookie/contracts */
  async search(params?: {
  page?: number;
  size?: number;
  status?: ContractStatus;
  isActived?: IsActived;
  q?: string;
}): Promise<ContractResponseDTO[]> {
  const res = await axios.get(`${API_RK}/contracts`, {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 50,
      ...(params?.status && { status: params.status }),
      ...(params?.isActived && { isActived: params.isActived }),
      ...(params?.q && { q: params.q }),
    },
  });

  // ✅ LẤY ĐÚNG DATA
  return res.data.content ?? [];
},


  /** GET /api/rookie/contracts/{id} */
  async getById(id: string): Promise<ContractResponseDTO> {
    const res = await axios.get(`${CONTRACT_API}/${id}`);
    return res.data;
  },

  /** POST /api/rookie/contracts */
  async create(dto: ContractRequestDTO): Promise<ContractResponseDTO> {
    const res = await axios.post(CONTRACT_API, dto);
    return res.data;
  },

  /** PUT /api/rookie/contracts/{id} */
  async update(
    id: string,
    dto: ContractRequestDTO
  ): Promise<ContractResponseDTO> {
    const res = await axios.put(`${CONTRACT_API}/${id}`, dto);
    return res.data;
  },

  /** PATCH /api/rookie/contracts/{id}/status */
  async updateStatus(
    id: string,
    status: ContractStatus
  ): Promise<ContractResponseDTO> {
    const res = await axios.patch(`${CONTRACT_API}/${id}/status`, { status });
    return res.data;
  },

  /** DELETE /api/rookie/contracts/{id} */
  async deactivate(id: string): Promise<void> {
    await axios.delete(`${CONTRACT_API}/${id}`);
  },
};

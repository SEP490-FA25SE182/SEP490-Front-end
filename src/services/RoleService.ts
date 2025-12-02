import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { API_RK } from "@/config";

export interface Role {
  roleId: string;
  roleName: string;
  isActived: string;
  createdAt: string;
}

export interface CreateRoleRequest {
  roleName: string;
  isActived: string;
}

export interface UpdateRoleRequest {
  roleName: string;
  isActived: string;
}

/**
 * Lấy danh sách tất cả roles
 * @returns Danh sách Role[]
 */
export const getAllRoles = async (): Promise<Role[]> => {
  const response = await axios.get<Role[]>(`${API_RK}/users/roles`);
  return response.data;
};

/**
 * Lấy thông tin role theo ID
 * @param id ID của role
 * @returns Role
 */
export const getRoleById = async (id: string): Promise<Role> => {
  const response = await axios.get<Role>(`${API_RK}/users/roles/${id}`);
  return response.data;
};


/* Tạo role mới */
export const createRole = async (data: CreateRoleRequest[]): Promise<Role[]> => {
  return (await axios.post(`${API_RK}/users/roles`, data)).data;
};




/**
 * Cập nhật thông tin role theo ID
 * @param id ID của role
 * @param data Dữ liệu cập nhật role
 * @returns Role đã cập nhật
 */
export const updateRoleById = async (
  id: string,
  data: UpdateRoleRequest
): Promise<Role> => {
  const response = await axios.put<Role>(`${API_RK}/users/roles/${id}`, data);
  return response.data;
};


/** Xoá role theo ID */
export const deleteRoleById = async (id: string): Promise<void> => {
  await axios.delete(`${API_RK}/users/roles/${id}`);
};


/** Hook: Lấy tất cả roles */
export const useGetAllRoles = () => {
  return useQuery({
    queryKey: ["roles"],
    queryFn: getAllRoles,
  });
};

/** Hook: Lấy role theo ID */
export const useGetRoleById = (id: string) => {
  return useQuery({
    queryKey: ["role", id],
    queryFn: () => getRoleById(id),
    enabled: !!id, // chỉ chạy khi id có giá trị
  });
};

/** Hook: Tạo role */
export const useCreateRole = () => {
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => createRole([data]),
  });
};


/** Hook: Cập nhật role */
export const useUpdateRoleById = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      updateRoleById(id, data),
  });
};

/** Hook: Xoá role */
export const useDeleteRole = () => {
  return useMutation({
    mutationFn: (id: string) => deleteRoleById(id),
  });
};


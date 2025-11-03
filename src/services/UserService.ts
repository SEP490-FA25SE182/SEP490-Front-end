import axios from "axios";
import { API_BASE_URL } from "@/config";

export interface User {
  userId: string;
  fullName: string;
  birthDate: string;
  gender: string;
  email: string;
  password: string;
  phoneNumber: string;
  avatarUrl: string;
  roleId: string;
  isActived: string;
  createdAt?: string;
}

export interface CreateUserRequest {
  fullName: string;
  birthDate: string;
  gender: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> { }

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/users/search`);
    // 🔹 Nếu backend trả về Page<UserResponse>, chỉ lấy phần content
    return res.data?.content ?? [];
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách user:", error);
    return [];
  }
};


export const getUserById = async (id: string): Promise<User> => {
  const response = await axios.get(`${API_BASE_URL}/users/${id}`);
  return response.data;
};

export const getUserByEmail = async (email: string): Promise<User> => {
  const response = await axios.get(
    `${API_BASE_URL}/users/email/${encodeURIComponent(email)}`
  );
  return response.data;
};

export const searchUsers = async (keyword: string): Promise<User[]> => {
  const response = await axios.get(`${API_BASE_URL}/users/search`, {
    params: { keyword },
  });
  return response.data;
};

export const createUser = async (data: CreateUserRequest): Promise<User> => {
  const response = await axios.post(`${API_BASE_URL}/users`, data);
  return response.data;
};

export const updateUser = async (id: string, data: any): Promise<User> => {
  const response = await axios.put(`${API_BASE_URL}/users/${id}`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/${id}`);
};

export const getUserAnalytics = async (): Promise<any> => {
  const response = await axios.get(`${API_BASE_URL}/users/analytics`);
  return response.data;
};

export interface Role {
  roleId: string;
  roleName: string;
}

export const getRoleById = async (roleId: string): Promise<Role> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/users/roles/${roleId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    // 🧩 Chỉ lấy 2 trường cần thiết
    const { roleId: id, roleName } = res.data;
    return { roleId: id, roleName };
  } catch (error: any) {
    console.error("❌ Lỗi khi lấy role:", error.response?.data || error);
    throw error;
  }
};

/* =======================================================
   🏠 USER ADDRESS (Địa chỉ người dùng)
======================================================= */


/* ---------------------------------------------
 🧩 Interface địa chỉ đồng bộ với BE
--------------------------------------------- */
export interface Address {
  userAddressId: string;
  addressInfor: string;
  userId: string;
  isActived: string;
  phoneNumber?: string; 
  fullName?: string;    
  type?: string;        
  default?: boolean; 
  createdAt?: string;
  updatedAt?: string;
}

/* ---------------------------------------------
 🧩 Body khi tạo địa chỉ mới
--------------------------------------------- */
export interface CreateAddressRequest {
  addressInfor: string;
  userId: string;
  isActived: string;
  phoneNumber?: string;
  fullName?: string;
  type?: string;
  default?: boolean;
}

/* ---------------------------------------------
 🧩 Body khi cập nhật địa chỉ
--------------------------------------------- */
export interface UpdateAddressRequest {
  addressInfor: string;
  userId: string;
  isActived: string;
  phoneNumber?: string;
  fullName?: string;
  type?: string;
  default?: boolean;
}

/* =======================================================
   🔹 API CALLS
======================================================= */


export const getAddressesByUserId = async (userId: string): Promise<Address[]> => {
  const res = await axios.get(`${API_BASE_URL}/users/addresses/user/${userId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};


export const createAddress = async (data: CreateAddressRequest): Promise<Address> => {
  const res = await axios.post(`${API_BASE_URL}/users/addresses`, [data], {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return Array.isArray(res.data) ? res.data[0] : res.data;
};


export const updateAddress = async (
  addressId: string,
  data: UpdateAddressRequest
): Promise<Address> => {
  const res = await axios.put(`${API_BASE_URL}/users/addresses/${addressId}`, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};


export const deleteAddress = async (addressId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/addresses/${addressId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
};

/**
 * (Tuỳ chọn) Search địa chỉ cho admin
 * GET /api/rookie/users/addresses/search?isActived=ACTIVE&userId=...
 */
export const searchAddresses = async (params?: {
  isActived?: "ACTIVE" | "INACTIVE";
  userId?: string;
  phoneNumber?: string;
  type?: string;
  default?: boolean;
  page?: number;
  size?: number;
}): Promise<{ content: Address[]; totalElements: number }> => {
  const res = await axios.get(`${API_BASE_URL}/users/addresses/search`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.data;
};





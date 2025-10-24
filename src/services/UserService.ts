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

export interface UpdateUserRequest extends Partial<CreateUserRequest> {}

export const getAllUsers = async (): Promise<User[]> => {
  const response = await axios.get(`${API_BASE_URL}/users`);
  return response.data;
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

/* =======================================================
   🏠 USER ADDRESS (Địa chỉ người dùng)
======================================================= */

export interface Address {
  userAddressId: string;
  addressInfor: string;
  userId: string;
  isActived: string; // "ACTIVE" hoặc "INACTIVE"
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Body khi tạo mới địa chỉ
 * Backend yêu cầu gửi MẢNG: [{ addressInfor, isActived }]
 */
export interface CreateAddressRequest {
  addressInfor: string;
  userId: string;
  isActived: string; // Thường là "ACTIVE"
}

/**
 * Body khi cập nhật địa chỉ
 */
export interface UpdateAddressRequest {
  addressInfor: string;
  isActived: string;
}

/* =======================================================
   🔹 CÁC HÀM GỌI API
======================================================= */

/**
 * Lấy danh sách địa chỉ theo userId
 * GET /api/rookie/users/addresses/user/{userId}
 */
export const getAddressesByUserId = async (
  userId: string
): Promise<Address[]> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/users/addresses/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  } catch (error: any) {
    console.error("❌ Lỗi khi lấy danh sách địa chỉ:", error);
    throw error;
  }
};

/**
 * Tạo mới địa chỉ (theo chuẩn BE: nhận mảng)
 * POST /api/rookie/users/addresses
 * Body:
 * [
 *   {
 *     "addressInfor": "string",
 *     "isActived": "ACTIVE"
 *   }
 * ]
 */
export const createAddress = async (
  data: CreateAddressRequest
): Promise<Address> => {
  try {
    console.log("📦 Gửi request tạo địa chỉ:", JSON.stringify([data], null, 2));

    const res = await axios.post(`${API_BASE_URL}/users/addresses`, [data], {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    console.log("✅ Kết quả tạo địa chỉ:", res.data);

    // Backend có thể trả về mảng → lấy phần tử đầu tiên
    return Array.isArray(res.data) ? res.data[0] : res.data;
  } catch (error: any) {
    console.error("❌ Lỗi khi tạo địa chỉ:", error.response?.data || error);
    throw error;
  }
};

/**
 * Cập nhật địa chỉ theo ID
 * PUT /api/rookie/users/addresses/{id}
 */
export const updateAddress = async (
  addressId: string,
  data: UpdateAddressRequest
): Promise<Address> => {
  try {
    console.log(
      `📦 Cập nhật địa chỉ ${addressId}:`,
      JSON.stringify(data, null, 2)
    );

    const res = await axios.put(
      `${API_BASE_URL}/users/addresses/${addressId}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    console.log("✅ Kết quả cập nhật địa chỉ:", res.data);
    return res.data;
  } catch (error: any) {
    console.error("❌ Lỗi khi cập nhật địa chỉ:", error.response?.data || error);
    throw error;
  }
};

/**
 * Xóa địa chỉ theo ID
 * DELETE /api/rookie/users/addresses/{id}
 */
export const deleteAddress = async (addressId: string): Promise<void> => {
  try {
    console.log(`🗑️ Xóa địa chỉ ID: ${addressId}`);
    await axios.delete(`${API_BASE_URL}/users/addresses/${addressId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    console.log("✅ Đã xóa địa chỉ thành công");
  } catch (error: any) {
    console.error("❌ Lỗi khi xóa địa chỉ:", error.response?.data || error);
    throw error;
  }
};

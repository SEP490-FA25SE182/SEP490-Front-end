import axios from 'axios';
import { useMutation } from "@tanstack/react-query";

const BASE_URL = 'http://localhost:8085/api/rookie/users/auth';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
  token?: string;
}

/**
 * Đăng ký người dùng mới
 * @param userData Thông tin người dùng
 * @returns AuthResponse
 */
export const registerUser = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${BASE_URL}/register`, userData);
  return response.data;
};

/**
 * Đăng nhập
 * @param credentials Email và password
 * @returns AuthResponse
 */
export const loginUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${BASE_URL}/login`, credentials);
  return response.data;
};

/**
 * Đăng xuất
 * @param token JWT token
 * @returns AuthResponse
 */
export const logoutUser = async (token: string): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(
    `${BASE_URL}/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const useRegisterUser = () => {
  return useMutation({
    mutationFn: (data: RegisterRequest) => registerUser(data),
  });
};

export const useLoginUser = () => {
  return useMutation({
    mutationFn: (credentials: LoginRequest) => loginUser(credentials),
  });
};

export const useLogoutUser = () => {
  return useMutation({
    mutationFn: (token: string) => logoutUser(token),
  });
};
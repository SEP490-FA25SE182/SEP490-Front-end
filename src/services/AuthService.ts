import axios from 'axios';
import { useMutation } from "@tanstack/react-query";

const BASE_URL = 'http://localhost:8081/api/rookie/users/auth';

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
  user?: {
    userId: string;
    fullName: string;
    email: string;
    roleId?: string;
    isActived?: string;
  };
  token?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface GoogleAuthRequest {
  // Có thể mở rộng nếu backend yêu cầu thêm dữ liệu
  [key: string]: string;
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

/** Đăng nhập bằng Google */
export const googleAuth = async (data: GoogleAuthRequest): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${BASE_URL}/google`, data);
  return response.data;
};

/** Quên mật khẩu */
export const forgotPassword = async (data: ForgotPasswordRequest): Promise<void> => {
  await axios.post(`${BASE_URL}/password/forgot`, data);
};

/** Đặt lại mật khẩu */
export const resetPassword = async (data: ResetPasswordRequest): Promise<void> => {
  await axios.post(`${BASE_URL}/password/reset`, data);
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


export const useGoogleAuth = () => {
  return useMutation({
    mutationFn: (data: GoogleAuthRequest) => googleAuth(data),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => forgotPassword(data),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => resetPassword(data),
  });
};
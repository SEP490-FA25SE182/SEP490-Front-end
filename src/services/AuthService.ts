// src/services/auth.ts
import axios from 'axios';
import { useMutation } from "@tanstack/react-query";
import { setAuth, clearAuth } from "@/utils/authStorage";
import { bookService } from "@/services/BookService";
import { API_RK } from "@/config";

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  roleId?: string;
  avatarUrl?: string;
  birthDate?: string;
  gender?: string;
  isActived?: string;
}
export interface LoginRequest { email: string; password: string; }
export interface AuthResponse {
  user?: { userId: string; fullName: string; email: string; roleId?: string; isActived?: string; avatarUrl?: string; };
  token?: string;
}
export interface ForgotPasswordRequest { email: string; }
export interface ResetPasswordRequest { token: string; newPassword: string; }
export interface GoogleAuthRequest { [key: string]: string; }
export interface ChangePasswordRequest { email: string; currentPassword: string; newPassword: string; }

export const registerUser = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const payload = {
    fullName: userData.fullName,
    email: userData.email,
    password: userData.password,
    phoneNumber: userData.phoneNumber,
    roleId: userData.roleId || ""
  };
  const response = await axios.post<AuthResponse>(`${API_RK}/users/auth/register`, payload);
  return response.data;
};

export const loginUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${API_RK}/users/auth/login`, credentials);
  return response.data;
};

export const logoutUser = async (token: string): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(
    `${API_RK}/users/auth/logout`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const googleAuth = async (data: GoogleAuthRequest): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${API_RK}/users/auth/google`, data);
  return response.data;
};
export const forgotPassword = async (data: ForgotPasswordRequest): Promise<void> => {
  await axios.post(`${API_RK}/users/auth/password/forgot`, data);
};
export const resetPassword = async (data: ResetPasswordRequest): Promise<void> => {
  await axios.post(`${API_RK}/users/auth/password/reset`, data);
};
export const changePassword = async (data: ChangePasswordRequest, token?: string): Promise<void> => {
  await axios.post(
    `${API_RK}/users/auth/password/change`,
    data,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
};

/** Hooks */
export const useLoginUser = () =>
  useMutation({
    mutationFn: (credentials: LoginRequest) => loginUser(credentials),
    onSuccess: (res: AuthResponse) => {
      if (res?.token && res?.user?.userId) {
        setAuth(res.token, {
          userId: res.user.userId,
          fullName: res.user.fullName,
          email: res.user.email,
          roleId: res.user.roleId,
          isActived: res.user.isActived,
        });
        bookService.setUserId(res.user.userId);
      }
    },
  });

export const useRegisterUser = () =>
  useMutation({
    mutationFn: (data: RegisterRequest) => registerUser(data),
    onSuccess: (res: AuthResponse) => {
      if (res?.token && res?.user?.userId) {
        setAuth(res.token, {
          userId: res.user.userId,
          fullName: res.user.fullName,
          email: res.user.email,
          roleId: res.user.roleId,
          isActived: res.user.isActived,
        });
        bookService.setUserId(res.user.userId);
      }
    },
  });

export const useLogoutUser = () =>
  useMutation({
    mutationFn: (token: string) => logoutUser(token),
    onSuccess: () => clearAuth(),
    onError: () => { clearAuth(); },
  });

export const useGoogleAuth = () =>
  useMutation({ mutationFn: (data: GoogleAuthRequest) => googleAuth(data) });
export const useForgotPassword = () =>
  useMutation({ mutationFn: (data: ForgotPasswordRequest) => forgotPassword(data) });
export const useResetPassword = () =>
  useMutation({ mutationFn: (data: ResetPasswordRequest) => resetPassword(data) });
export const useChangePassword = () =>
  useMutation({
    mutationFn: (payload: { data: ChangePasswordRequest; token?: string }) =>
      changePassword(payload.data, payload.token),
  });

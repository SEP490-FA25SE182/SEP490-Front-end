// src/utils/authStorage.ts
export const AUTH_TOKEN_KEY = "rookie.auth.token";
export const CURRENT_USER_ID_KEY = "rookie.auth.currentUserId";
export const CURRENT_USER_KEY = "rookie.auth.currentUser";
export const LEGACY_USER_KEY = "user";

export type StoredUser = {
  userId: string;
  fullName?: string;
  email?: string;
  roleId?: string;
  isActived?: string;
};

function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* empty */ }
}
function safeGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch { /* empty */ }
}

export function setAuth(token?: string, user?: StoredUser) {
  if (token) safeSet(AUTH_TOKEN_KEY, token);
  if (user?.userId) {
    safeSet(CURRENT_USER_ID_KEY, user.userId);
    safeSet(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export function getToken(): string | null {
  return safeGet(AUTH_TOKEN_KEY);
}

export function getCurrentUserId(): string | null {
  return safeGet(CURRENT_USER_ID_KEY);
}

export function getCurrentUser(): StoredUser | null {
  const raw = safeGet(CURRENT_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredUser; } catch { return null; }
}

export function clearAuth() {
  safeRemove(AUTH_TOKEN_KEY);
  safeRemove(CURRENT_USER_ID_KEY);
  safeRemove(CURRENT_USER_KEY);
  safeRemove(LEGACY_USER_KEY);
}



export function getUserRole(): string | null {
  const user = getCurrentUser();
  if (!user) return null;

  
  if (user.roleId) {
    return user.roleId.toLowerCase();
  }

  return null;
}

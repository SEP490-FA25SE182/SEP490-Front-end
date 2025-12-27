import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isInitialized } = useAuth();

  // ⏳ Chờ AuthContext load xong
  if (!isInitialized) return <div>Loading...</div>;

  //  Chưa đăng nhập
  if (!user) return <Navigate to="/login" replace />;

  const role = user.roleName?.toLowerCase();

  //  Sai role không có quyền → đẩy về home
  if (!allowedRoles.some(r => role?.includes(r.toLowerCase()))) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

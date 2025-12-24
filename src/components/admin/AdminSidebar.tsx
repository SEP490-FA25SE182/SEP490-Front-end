import { LayoutDashboard, Users, ShoppingBag, LogOut, UsersRoundIcon, Wallet, Book, Rose } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { getAllUsers } from "@/services/UserService";
import { getRoleById } from "@/services/RoleService";
import { clearAuth } from "@/utils/authStorage";

interface AdminSidebarProps {
  isOpen: boolean;
}

export default function AdminSidebar({ isOpen }: AdminSidebarProps) {
  const location = useLocation();
  const { user, setUser, setToken } = useAuth();
  const [currentRoleName, setCurrentRoleName] = useState("");




  useEffect(() => {
    if (!user?.email) return;

    const fetchRole = async () => {
      const allUsers = await getAllUsers();
      const currentUser = allUsers.find(u => u.email === user.email);

      if (!currentUser?.roleId) return;

      const role = await getRoleById(currentUser.roleId);
      setCurrentRoleName(role.roleName?.toLowerCase().trim() || "");
    };

    fetchRole();
  }, [user?.email]);

  const isAdmin = currentRoleName.includes("admin");

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setToken(null);

    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("rememberEmail");
    window.location.href = "/login";
  };



  const navItems = [
    { path: "/admin/dashboard", icon: <LayoutDashboard />, label: "Tổng quan" },
    isAdmin && { path: "/admin/roles", icon: <Users />, label: "Vai trò" },
    { path: "/admin/users", icon: <Users />, label: "Người dùng" },
    { path: "/admin/authors", icon: <UsersRoundIcon />, label: "Tác giả" },
    isAdmin && { path: "/admin/payment-method", icon: <Wallet />, label: "Phương thức thanh toán" },
    { path: "/admin/orders", icon: <ShoppingBag />, label: "Đơn hàng" },
    { path: "/admin/genres", icon: <Book />, label: "Quản lý thể loại" },
    { path: "/admin/books", icon: <Book />, label: "Quản lý sách" },
    { path: "/admin/blogs", icon: <Rose />, label: "Quản lý Blogs" },

  ].filter(Boolean) as { path: string; icon: React.ReactNode; label: string }[];

  return (
    <div
      className={`${isOpen ? "w-64" : "w-0"
        } transition-all duration-300 overflow-hidden
      bg-gradient-to-l from-[#764BA2] to-[#667EEA] shadow-2xl flex flex-col h-full`}
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center mb-8">
          <h1 className="text-xl font-bold text-white">Rookies Management</h1>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors
                  ${isActive
                    ? "bg-white/30 text-white font-medium"
                    : "text-white hover:bg-white/20"
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="mt-auto px-6 pb-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-white hover:bg-white/20 transition-colors rounded-lg"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

import { BookOpenText, CircleDollarSign, LogOut, CircleUser } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUserId } from "@/utils/authStorage";
import { useAuth } from '@/context/AuthContext';
import { clearAuth } from '@/utils/authStorage';  


interface AuthorSidebarProps {
  isOpen: boolean;
}

export default function AuthorSidebar({ isOpen }: AuthorSidebarProps) {
  const location = useLocation();
  const currentUserId = getCurrentUserId(); 
  const { setUser, setToken } = useAuth();

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
    {
      path: '/author/authorincome',
      icon: <CircleDollarSign className="w-5 h-5" />,
      label: 'Doanh thu',
    },
    {
      path: '/author/authorbooklist',
      icon: <BookOpenText className="w-5 h-5" />,
      label: 'Sách của bạn',
    },
    {
      path: currentUserId ? `/author/profile/${currentUserId}` : "/login",
      icon: <CircleUser className="w-5 h-5" />,
      label: "Hồ sơ tác giả",
    },
  ];

  return (
    <div
      className={`${isOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden 
      bg-linear-to-l from-[#764BA2] to-[#667EEA] shadow-2xl flex flex-col h-full`}
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center mb-8">
          <h1 className="text-xl font-bold text-white">Workspace Tác Giả</h1>
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
                    ? 'bg-white/30 text-white font-medium'
                    : 'text-white hover:bg-white/20'
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout area */}
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

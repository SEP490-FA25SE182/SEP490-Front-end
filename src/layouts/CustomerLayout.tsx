import CustomerHeader from '@/components/customer/CustomerHeader';
import CustomerFooter from '@/components/customer/CustomerFooter';
import { Clock, CreditCard, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from "react";

/** ✅ helper: convert gs://... -> https firebase download url */
function gsToHttp(url?: string | null) {
  if (!url) return "";
  if (!url.startsWith("gs://")) return url;

  const parts = url.split("/");
  const bucket = parts[2];
  const path = parts.slice(3).join("/");

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const DEFAULT_AVATAR =
    "https://avatar.iran.liara.run/public/boy?username=default";

  const sidebarAvatarSrc = useMemo(() => {
    return gsToHttp(user?.avatarUrl) || DEFAULT_AVATAR;
  }, [user?.avatarUrl]);

  const navigationItems = [
    { path: '/profile', icon: User, label: 'Thông tin khách hàng' },
    { path: '/transactions', icon: Clock, label: 'Lịch sử thanh toán' },
    { path: '/wallet', icon: CreditCard, label: 'Ví của bạn' },
  ];

  return (
    <div className="min-h-screen bg-linear-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />
      <div className="container mx-auto max-w-7xl flex gap-8 pb-10">
        {/* Sidebar */}
        <div className="w-80 shrink-0">
          <div className="bg-linear-to-l from-[#764BA2] to-[#667EEA] rounded-3xl p-6 shadow-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/10">
              <img
                src={sidebarAvatarSrc}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <div>
                <h3 className="text-white font-semibold">
                  {user?.fullName || "Người dùng"}
                </h3>
                <p className="text-white/60 text-sm">Thay đổi ảnh đại diện</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                      <Icon className="w-7 text-white" />
                    </div>
                    <span className="text-white text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 min-h-[600px]">
          {children}
        </div>
      </div>
      <CustomerFooter />
    </div>
  );
}

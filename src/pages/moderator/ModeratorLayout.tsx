import { type ReactNode } from "react";
import { ChevronRight, LogOut } from "lucide-react";   // đổi ArrowLeft -> LogOut
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { clearAuth } from "@/utils/authStorage";
import { useAuth } from "@/context/AuthContext";

interface Props {
  title: string;
  breadcrumb: { label: string; to?: string }[];
  children: ReactNode;
}

export default function ModeratorLayout({ title, breadcrumb, children }: Props) {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">

      {/* HEADER + BREADCRUMB */}
      <header className="bg-[#1a2332] border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {breadcrumb.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.to ? (
                  <span
                    onClick={() => navigate(item.to!)}
                    className="hover:text-white cursor-pointer"
                  >
                    {item.label}
                  </span>
                ) : (
                  <span className="text-white font-medium">{item.label}</span>
                )}
                {i < breadcrumb.length - 1 && (
                  <ChevronRight className="w-4 h-4 opacity-50" />
                )}
              </div>
            ))}
          </div>

          {/* ✅ Thay nút "Quay lại" thành "Đăng xuất" */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="bg-red-500 text-white border-none hover:bg-red-600"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Đăng xuất
          </Button>
        </div>

        <h1 className="mt-2 text-lg font-semibold">{title}</h1>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

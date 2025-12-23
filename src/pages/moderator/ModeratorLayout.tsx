import { type ReactNode, useMemo } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { clearAuth } from "@/utils/authStorage";
import { useAuth } from "@/context/AuthContext";

interface Props {
  title: string;
  breadcrumb: { label: string; to?: string }[];
  children: ReactNode;
}

export default function ModeratorLayout({ title, breadcrumb, children }: Props) {
  const navigate = useNavigate();
  const location = useLocation() as any; // ✅ lấy state từ route
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

  // ✅ route quay về ModeratorBookList (cần authorId)
  const booksListPath = useMemo(() => {
    const authorId =
      location?.state?.authorId ??
      location?.state?.book?.authorId ??
      location?.state?.book?.authorID;

    return authorId ? `/moderator/authors/${authorId}/books` : "/moderator";
  }, [location?.state]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      <header className="bg-[#1a2332] border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {breadcrumb.map((item, i) => {
              const isBooks = item.label.trim().toLowerCase() === "books";

              // ✅ nếu Books mà to bị sai (vd /moderator/books hoặc có :authorId) thì override
              const computedTo =
                isBooks
                  ? booksListPath
                  : item.to;

              const isClickable = !!computedTo;

              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    onClick={() =>
                      isClickable &&
                      navigate(computedTo!, { state: location.state }) // ✅ giữ state (books/authorId) nếu có
                    }
                    className={isClickable ? "hover:text-white cursor-pointer" : "text-white font-medium"}
                  >
                    {item.label}
                  </span>

                  {i < breadcrumb.length - 1 && (
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>

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

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
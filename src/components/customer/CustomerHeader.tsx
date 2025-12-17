import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import CartBadge from "./CartBagde";
import { getAllGenres, type Genre } from "@/services/GenreService";
import { useAuth } from "@/context/AuthContext";
import { clearAuth } from "@/utils/authStorage";
import { getUserByEmail, type User as UserType } from "@/services/UserService";

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

const DEFAULT_AVATAR = "https://avatar.iran.liara.run/public/boy?username=default";

export default function CustomerHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, setUser, setToken } = useAuth();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);

  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const genreRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState<UserType | null>(null);

  const isLoggedIn = !!localStorage.getItem("token");

  // ✅ sync searchTerm với query param ?q=
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q") ?? "";
    setSearchTerm(q);
  }, [location.search]);

  // ✅ fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoadingGenres(true);
        const data = await getAllGenres();
        setGenres(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách thể loại:", error);
        setGenres([]);
      } finally {
        setLoadingGenres(false);
      }
    };
    fetchGenres();
  }, []);

  // ✅ fetch user profile giống ProfilePage để có fullName/avatarUrl chuẩn
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isLoggedIn) {
        setProfile(null);
        return;
      }
      if (!authUser?.email) return;

      try {
        const data = await getUserByEmail(authUser.email);
        setProfile(data);
      } catch (err) {
        console.warn("Không lấy được profile từ email:", err);
        setProfile(null);
      }
    };

    fetchProfile();
  }, [authUser?.email, isLoggedIn]);

  // ✅ click outside để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;

      if (genreRef.current && !genreRef.current.contains(t)) {
        setIsGenreOpen(false);
      }
      if (userRef.current && !userRef.current.contains(t)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarSrc = useMemo(() => {
    return (
      gsToHttp(profile?.avatarUrl) ||
      gsToHttp((authUser as any)?.avatarUrl) ||
      DEFAULT_AVATAR
    );
  }, [profile?.avatarUrl, (authUser as any)?.avatarUrl]);

  const displayName = useMemo(() => {
    return (
      profile?.fullName ||
      (authUser as any)?.fullName ||
      "Tài khoản"
    );
  }, [profile?.fullName, (authUser as any)?.fullName]);

  const submitSearch = () => {
    const q = searchTerm.trim();
    const params = new URLSearchParams(location.search);

    if (q) params.set("q", q);
    else params.delete("q");

    navigate({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

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
    <header className="text-white relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top */}
        <div className="flex items-center justify-between py-4 gap-6">
          {/* Left: Logo + Search */}
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <Link to="/" className="shrink-0">
              <div className="flex items-center gap-3">
                <img src="./rookies-logo.jpg" className="w-10" />
                <span className="text-xl font-semibold">Rookies</span>
              </div>
            </Link>

            {/* Search (kéo sát logo) */}
            <div className="w-[420px] max-w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm sách..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSearch();
                  }}
                  className="w-full pl-10 pr-24 py-2 bg-white text-gray-900 rounded-full border-0 focus-visible:ring-2 focus-visible:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Right: Genre + Cart + User */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Genre Dropdown cạnh cart */}
            <div className="relative" ref={genreRef}>
              <button
                onClick={() => setIsGenreOpen((v) => !v)}
                className="flex items-center gap-2 hover:text-purple-400 transition-colors"
              >
                <span className="text-sm">Thể loại</span>
              </button>

              {isGenreOpen && (
                <div className="absolute top-full right-0 mt-3 bg-[#1a1a2e] border border-[#2a3857] rounded-xl shadow-2xl z-50 w-[720px] max-w-[90vw]">
                  {loadingGenres ? (
                    <p className="text-white/60 text-sm px-4 py-3">Đang tải...</p>
                  ) : genres.length > 0 ? (
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 max-h-[60vh] overflow-auto pr-2">
                        {genres.map((genre) => (
                          <Link
                            key={genre.genreId}
                            to={`/genre/${genre.genreId}`}
                            className="px-3 py-2 rounded-md hover:bg-[#2a3857] transition-colors text-white/80 hover:text-white"
                            onClick={() => setIsGenreOpen(false)}
                          >
                            {genre.genreName}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm px-4 py-3">
                      Không có thể loại nào
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            {isLoggedIn && <CartBadge />}

            {/* User / Avatar */}
            {isLoggedIn ? (
              <div
                className="relative"
                ref={userRef}
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <img
                  src={avatarSrc}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover border border-white/20 cursor-pointer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />

                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 w-64 bg-[#1a1a2e] border border-[#2a3857] rounded-xl shadow-2xl z-50 mt-3 overflow-hidden">
                    {/* Top: avatar + name */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a3857]">
                      <img
                        src={avatarSrc}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                          {profile?.email || authUser?.email || ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 p-3">
                      <Link
                        to="/profile"
                        className="px-4 py-2 hover:bg-[#2a3857] rounded-md transition-colors text-white/80 hover:text-white"
                      >
                        Thông tin cá nhân
                      </Link>
                      <Link
                        to="/transactions"
                        className="px-4 py-2 hover:bg-[#2a3857] rounded-md transition-colors text-white/80 hover:text-white"
                      >
                        Lịch sử giao dịch
                      </Link>
                      <Link
                        to="/wallet"
                        className="px-4 py-2 hover:bg-[#2a3857] rounded-md transition-colors text-white/80 hover:text-white"
                      >
                        Ví của tôi
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-[#2a3857] rounded-md transition-colors text-white/80 hover:text-white"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" className="text-white">
                  <Link to="/login">Đăng nhập</Link>
                </Button>
                <Button className="bg-purple-500 hover:bg-purple-600">
                  <Link to="/signup">Đăng ký</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#2a3857]" />
      </div>
    </header>
  );
}

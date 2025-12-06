import { Search, Menu, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import CartBadge from "./CartBagde";
import { getAllGenres, type Genre } from "@/services/GenreService";

const CustomerHeader = () => {
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [showAllGenres, setShowAllGenres] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // 🧠 Lấy danh sách thể loại thật từ API
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await getAllGenres();
        setGenres(data);
      } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách thể loại:", error);
      } finally {
        setLoadingGenres(false);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsGenreOpen(false);
      setShowAllGenres(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("rememberEmail");
    window.location.href = "/login";
  };

  return (
    <header className="text-white relative">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo & Brand */}
          <Link to="/">
            <div className="flex items-center gap-3">
              <img src="./rookies-logo.jpg" className="w-10" />
              <span className="text-xl font-semibold">Rookies</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm sách"
                className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 rounded-full border-0 focus-visible:ring-2 focus-visible:ring-purple-500"
              />
            </div>
          </div>

          {/* Login / User */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <CartBadge />
                <div
                  className="relative"
                  onMouseEnter={() => setIsUserMenuOpen(true)}
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <User className="w-5 h-5 cursor-pointer hover:text-purple-400 transition-colors" />
                  {isUserMenuOpen && (
                    <div className="absolute top-2 right-0 w-48 bg-[#1a1a2e] border border-[#2a3857] rounded-lg shadow-xl z-50 mt-2">
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
                          to="/bookshelf"
                          className="px-4 py-2 hover:bg-[#2a3857] rounded-md transition-colors text-white/80 hover:text-white"
                        >
                          Tủ sách của tôi
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
        <div className="h-[1px] bg-[#2a3857]"></div>

        {/* Navigation */}
        {isHomePage && (
          <nav className="px-6 py-3">
            <ul className="flex items-center justify-between text-sm">
              {/* Dropdown Thể loại */}
              <li className="relative">
                <button
                  onClick={() => setIsGenreOpen(!isGenreOpen)}
                  className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors"
                >
                  <Menu className="w-4 h-4" />
                  <span>Thể loại</span>
                </button>

                {/* Dropdown hiển thị khi click */}
                {isGenreOpen && (
                  <div 
                  ref={dropdownRef}
                  className="absolute top-full left-0 bg-[#1a1a2e] border border-[#2a3857] rounded-lg shadow-xl z-50">
                    {loadingGenres ? (
                      <p className="text-white/60 text-sm px-4 py-2">Đang tải...</p>
                    ) : genres.length > 0 ? (
                      <div
                        className={`grid gap-1 p-3 transition-all duration-300 ${showAllGenres
                            ? "grid-cols-4 w-[560px]"  // 👉 dạng mega menu 4 cột
                            : "grid-cols-1 w-64"       // 👉 dạng thường 1 cột
                          }`}
                      >
                        {(showAllGenres ? genres : genres.slice(0, 10)).map((genre) => (
                          <Link
                            key={genre.genreId}
                            to={`/genre/${genre.genreId}`}
                            className="px-4 py-2 hover:bg-[#2a3857] rounded-md transition-colors text-white/80 hover:text-white"
                            onClick={() => {
                              setIsGenreOpen(false);
                              setShowAllGenres(false);
                            }}
                          >
                            {genre.genreName}
                          </Link>
                        ))}

                        {genres.length > 10 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAllGenres((prev) => !prev);
                            }}
                            className="col-span-full text-center text-purple-400 px-3 py-2 hover:text-white transition-colors"
                          >
                            {showAllGenres ? "Thu gọn ↑" : "Xem thêm ↓"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/60 text-sm px-4 py-2">Không có thể loại nào</p>
                    )}
                  </div>
                )}
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};

export default CustomerHeader;

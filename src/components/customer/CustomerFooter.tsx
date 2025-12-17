import { useEffect, useState } from "react";
import { Mail, Facebook, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { getAllGenres, type Genre } from "@/services/GenreService";

const CustomerFooter = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);

  useEffect(() => {
    const fetchGenres = async () => {
      setLoadingGenres(true);
      try {
        const data = await getAllGenres();
        setGenres(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("❌ Lỗi khi fetch genres ở footer:", e);
        setGenres([]);
      } finally {
        setLoadingGenres(false);
      }
    };

    fetchGenres();
  }, []);

  return (
    <footer className="bg-linear-to-l from-[#764BA2] to-[#667EEA] text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left Column - Company Info */}
          <div className="space-y-4">
            <Link to="/">
              <div className="flex items-center gap-3 mb-6">
                <img src="./rookies-logo.jpg" className="w-10" />
                <span className="text-2xl font-semibold">Rookies</span>
              </div>
            </Link>

            <p className="text-sm leading-relaxed opacity-90">
              Address: FPT University, District 9, HCMC
            </p>
            <p className="text-sm opacity-90">Email: tuyenctnse182129@fpt.edu.vn</p>
            <p className="text-sm opacity-90">Phone: (+84) 334301854</p>
            <p className="text-sm opacity-90">© Copyright 2025</p>

            <div className="flex items-center gap-4 pt-4">
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Mail className="w-6 h-6" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity">
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Middle Column - Account */}
          {/* <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Tài khoản</h3>
            <ul className="space-y-3 text-sm opacity-90">
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Đăng nhập
              </li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Đăng ký
              </li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Membership
              </li>
            </ul>

            <h3 className="text-lg font-semibold mb-4 pt-6">Về Rookies</h3>
            <ul className="space-y-3 text-sm opacity-90">
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Giới thiệu
              </li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Tin tức
              </li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Chính sách bảo mật
              </li>
            </ul>
          </div> */}

          {/* Right Column - Categories (Genres from API) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Chủ đề sách</h3>

            {loadingGenres ? (
              <p className="text-sm opacity-90">Đang tải thể loại...</p>
            ) : genres.length === 0 ? (
              <p className="text-sm opacity-90">Không có thể loại nào.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Link
                    key={g.genreId}
                    to={`/genre/${g.genreId}`}
                    className="
                      px-3 py-2 rounded-xl
                      bg-white/15 hover:bg-white/25
                      transition-colors
                      text-sm font-medium
                    "
                    title={g.genreName}
                  >
                    {g.genreName}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CustomerFooter;

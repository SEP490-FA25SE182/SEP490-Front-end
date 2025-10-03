import { Mail, Facebook, Instagram } from 'lucide-react';

const CustomerFooter = () => {
  return (
    <footer className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Left Column - Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <img src="./open-book.png" className='w-10' />
              <span className="text-2xl font-semibold">Rookies</span>
            </div>
            <p className="text-sm leading-relaxed opacity-90">
              Address: FPT University, District 9, HCMC
            </p>
            <p className="text-sm opacity-90">
              Email: duongtbs@182174@fpt.edu.vn
            </p>
            <p className="text-sm opacity-90">
              Phone: (+84) 917917669
            </p>
            <p className="text-sm opacity-90">
              © Copyright 2024
            </p>
            
            {/* Social Icons */}
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Tài khoản</h3>
            <ul className="space-y-3 text-sm opacity-90">
              <li className="hover:opacity-100 cursor-pointer transition-opacity">Đăng nhập</li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">Đăng ký</li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">Membership</li>
            </ul>

            <h3 className="text-lg font-semibold mb-4 pt-6">Về Rookies</h3>
            <ul className="space-y-3 text-sm opacity-90">
              <li className="hover:opacity-100 cursor-pointer transition-opacity">Giới thiệu</li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">Tin tức</li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">Chính sách bảo mật</li>
            </ul>
          </div>

          {/* Right Column - Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Chủ đề sách</h3>
            <ul className="space-y-2 text-sm opacity-90 leading-relaxed">
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Văn học - Trinh thám - Lịch sử - Chính trị - Kinh pháp
              </li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Toán học - Khoa học - Thiên văn - Địa lý
              </li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                DIY - Thủ công - Nấu ăn - Thu phạp - Thể thao
              </li>
              <li className="hover:opacity-100 cursor-pointer transition-opacity">
                Công nghệ - Truyền Thông - Kinh tế - Tin học văn phòng
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CustomerFooter;
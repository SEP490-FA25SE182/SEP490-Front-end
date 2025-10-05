import { Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import CartBadge from './CartBagde';

const CustomerHeader = () => {
    return (
        <header className="text-white">
            <div className="max-w-7xl mx-auto">
                {/* Top Section */}
                <div className="flex items-center justify-between px-6 py-4">
                    {/* Logo & Brand */}
                    <Link to="/">
                        <div className="flex items-center gap-3">
                            <img src="./rookies-logo.jpg" className='w-10' />
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

                    {/* Login/Register */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="text-white">
                            Đăng nhập
                        </Button>
                        <Button className="bg-purple-500 hover:bg-purple-600">
                            Đăng ký
                        </Button>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-[#2a3857]"></div>

                {/* Navigation */}
                <nav className="px-6 py-3">
                    <ul className="flex items-center justify-between text-sm">
                        {/* Left: Chọn sách */}
                        <li className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors">
                            <Menu className="w-4 h-4" />
                            <span>Chọn sách</span>
                        </li>
                        {/* Right: Other items */}
                        <div className="flex items-center gap-8">
                            <li className="cursor-pointer hover:text-purple-400 transition-colors">
                                Khuyến mãi
                            </li>
                            <CartBadge></CartBadge>
                            <li className="cursor-pointer hover:text-purple-400 transition-colors">
                                Giỏ hàng
                            </li>
                            <li className="cursor-pointer hover:text-purple-400 transition-colors">
                                Giới thiệu
                            </li>
                        </div>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default CustomerHeader;
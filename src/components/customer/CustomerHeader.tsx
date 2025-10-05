import { Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import booksData from '@/data/sample_books.json';
import CartBadge from './CartBagde';

const CustomerHeader = () => {
    const [isGenreOpen, setIsGenreOpen] = useState(false);
    const genres = (booksData as any).Genres || [];

    return (
        <header className="text-white relative">
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
                            <Link to="/login">
                                Đăng nhập
                            </Link>
                        </Button>
                        <Button className="bg-purple-500 hover:bg-purple-600">
                            <Link to="/signup">
                                Đăng ký
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-[1px] bg-[#2a3857]"></div>

                {/* Navigation */}
                <nav className="px-6 py-3">
                    <ul className="flex items-center justify-between text-sm">
                        {/* Left: Chọn sách with dropdown */}
                        <li
                            className="relative"
                            onMouseEnter={() => setIsGenreOpen(true)}
                            onMouseLeave={() => setIsGenreOpen(false)}
                        >
                            <div className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors">
                                <Menu className="w-4 h-4" />
                                <span>Chọn sách</span>
                            </div>

                            {/* Dropdown Menu */}
                            {isGenreOpen && (
                                <div className="absolute top-full left-0 w-64 bg-[#1a1a2e] border border-[#2a3857] rounded-lg shadow-xl z-50">
                                    <div className="grid grid-cols-1 gap-1 p-3">
                                        {genres.map((genre: any) => (
                                            <Link
                                                key={genre.genre_id}
                                                to={`/genre/${genre.genre_id}`}
                                                className="px-4 py-2 hover:bg-[#2a3857] rounded-md transition-colors text-white/80 hover:text-white"
                                            >
                                                {genre.genre_name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </li>

                        {/* Right: Other items */}
                        <div className="flex items-center gap-8">
                            <CartBadge></CartBadge>
                        </div>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default CustomerHeader;
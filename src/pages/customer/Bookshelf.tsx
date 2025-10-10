import CustomerHeader from '@/components/customer/CustomerHeader'
import CustomerFooter from '@/components/customer/CustomerFooter'
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, CreditCard, User, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/context/FavoriteContext';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useToast } from '@/components/ui/use-toast';

type NavigationItem = 'profile' | 'library' | 'history' | 'cards';

export const Bookshelf = () => {
  const [activeNav, setActiveNav] = useState<NavigationItem>('library');
  const { favorites, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleToggleFavorite = (book: any) => {
    toggleFavorite(book);
    toast({
      title: 'Đã xóa khỏi thư viện',
      description: `"${book.book_name}" đã được xóa khỏi thư viện của bạn.`,
    });
  };

  // Calculate pagination
  const totalPages = Math.ceil(favorites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFavorites = favorites.slice(startIndex, endIndex);

  const navigationItems = [
    { id: 'profile' as NavigationItem, icon: User, label: 'Thông tin khách hàng' },
    { id: 'history' as NavigationItem, icon: Clock, label: 'Lịch sử thanh toàn' },
    { id: 'library' as NavigationItem, icon: BookOpen, label: 'Thư viện của bạn' },
    { id: 'cards' as NavigationItem, icon: CreditCard, label: 'Ví của bạn' }
  ];

  return (
    <div className='min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]'>
      <CustomerHeader />
      <div className="container mx-auto max-w-7xl">
        <div className="flex gap-8 pb-10">
          {/* Left Sidebar Navigation */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] rounded-3xl p-6 shadow-2xl border border-white/10">
              {/* User Profile */}
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/10">
                <img src="https://avatar.iran.liara.run/public/boy?username=Ash" className='w-10' />
                <div>
                  <h3 className="text-white font-semibold">Nguyễn Minh Hoàng</h3>
                  <p className="text-white/60 text-sm">Thay đổi định đại diện</p>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-200 ${isActive
                        ? 'bg-white/10 shadow-lg'
                        : 'hover:bg-white/5'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center`}>
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
          <div className="flex-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 min-h-[600px]">
              <h1 className="text-xl font-bold text-gray-800 mb-8">THƯ VIỆN CỦA TÔI</h1>

              {/* Books List */}
              <div className="space-y-6">
                {favorites.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Chưa có sách yêu thích nào. Hãy thêm sách vào danh sách yêu thích của bạn!
                  </p>
                ) : (
                  <>
                    {currentFavorites.map((book) => (
                      <div
                        key={book.book_id}
                        className="flex gap-6 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                      >
                        {/* Book Cover */}
                        <Link to={`/book/${book.book_id}`} className="flex-shrink-0">
                          <div className="w-32 h-44 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                            <img
                              src={book.cover_url}
                              alt={book.book_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src =
                                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect width="200" height="300" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        </Link>

                        {/* Book Info */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between">
                            <div>
                              <Link to={`/book/${book.book_id}`}>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 hover:text-purple-600 transition-colors">
                                  {book.book_name}
                                </h3>
                              </Link>
                              <div className="flex gap-6 mb-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Tác giả:</span>
                                  <span className="text-gray-700 ml-1 font-medium">Đăng Vũ</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Thể loại:</span>
                                  <span className="text-gray-700 ml-1 font-medium">Ngôn tình</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Nhà xuất bản:</span>
                                  <span className="text-gray-700 ml-1 font-medium">Đang cập nhật</span>
                                </div>
                              </div>

                              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                                {book.decription}
                              </p>
                            </div>
                            <button
                              onClick={() => handleToggleFavorite(book)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-gray-500 text-sm">
                              Đã đọc: {formatDate(book.published_date)}
                            </p>

                            <Button
                              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-6"
                            >
                              <BookOpen className="w-4 h-4 mr-2" />
                              Đọc sách
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add pagination */}
                    {totalPages > 1 && (
                      <Pagination className="mt-8">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <CustomerFooter />
    </div>
  )
}
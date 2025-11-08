import { useState, useMemo, useEffect } from 'react';
import { Menu, X, Search, Plus, Eye } from 'lucide-react';
import { getBooks } from "@/services/BookService";
import AuthorSidebar from '@/components/author/AuthorSidebar';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AuthorBookList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPublication, setSelectedPublication] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 12;

  const navigate = useNavigate();
  const { user } = useAuth();

  const [books, setBooks] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const res = await getBooks({
          authorId: user?.userId ?? undefined,
          page: 0,
          size: 200,
        });
        setBooks(res?.content ?? []);
      } catch (err) {
        console.error("Lỗi khi tải sách:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, [user]);

  // helper: map publicationStatus -> label + class
  const getPublicationLabel = (publication: any) => {
    const p = String(publication ?? "").toUpperCase();

    const map: Record<string, { text: string; className: string }> = {
      "0": { text: "Chưa xuất bản", className: "bg-gray-500/20 text-gray-300" },
      "1": { text: "Đã xuất bản", className: "bg-green-500/20 text-green-300" },
      "DRAFT": { text: "Nháp", className: "bg-gray-500/20 text-gray-300" },
      "PENDING": { text: "Chờ duyệt", className: "bg-yellow-500/20 text-yellow-300" },
      "PUBLISHED": { text: "Đã xuất bản", className: "bg-green-500/20 text-green-300" },
      "ACTIVE": { text: "Hoạt động", className: "bg-green-500/20 text-green-300" },
      "INACTIVE": { text: "Không hoạt động", className: "bg-gray-500/20 text-gray-300" },
    };

    return map[p] ?? { text: publication ?? "-", className: "bg-gray-500/20 text-gray-300" };
  };

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const name = book.bookName ?? book.book_name ?? '';
      const progress = (book.progressStatus ?? book.progress_status) as any;
      const publication = (book.publicationStatus ?? book.publication_status) as any;

      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || String(progress) === selectedStatus;
      const matchesPublication = selectedPublication === 'all' || String(publication) === selectedPublication;

      return matchesSearch && matchesStatus && matchesPublication;
    });
  }, [books, searchQuery, selectedStatus, selectedPublication]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage) || 1;
  const startIndex = (currentPage - 1) * booksPerPage;
  const currentBooks = filteredBooks.slice(startIndex, startIndex + booksPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedPublication]);

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <div className="ml-4 text-white">
              <div className="text-sm">Danh sách sách</div>
              <div className="text-xs text-gray-300">
                Quản lý các tác phẩm của bạn
              </div>
            </div>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm sách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px] border-white/20 text-white bg-white/10">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="0">Nháp</SelectItem>
                <SelectItem value="1">Chờ duyệt</SelectItem>
                <SelectItem value="2">Đã xuất bản</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPublication} onValueChange={setSelectedPublication}>
              <SelectTrigger className="w-[180px] border-white/20 text-white bg-white/10">
                <SelectValue placeholder="Xuất bản" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="0">Chưa xuất bản</SelectItem>
                <SelectItem value="1">Đã xuất bản</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => navigate('/author/authorcreatebook')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tạo sách mới
            </Button>
          </div>
        </div>

        {/* Book Grid - File View */}
        <div className="flex-1 overflow-auto p-6 bg-[#0f172a]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {currentBooks.map((book) => {
              const cover = book.coverUrl ?? book.cover_url;
              const name = book.bookName ?? book.book_name;
              const id = book.bookId ?? book.book_id;
              const publication = book.publicationStatus ?? book.publication_status;
              const pubInfo = getPublicationLabel(publication);

              return (
                <div key={id} className="group relative">
                  <div className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200 border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
                    {/* Book Cover */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative w-24 h-32 rounded overflow-hidden bg-white/5 shadow-lg">
                        <img
                          src={cover}
                          alt={name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="128"%3E%3Crect width="96" height="128" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="white"%3ENo Cover%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                      
                      {/* Book Name */}
                      <div className="text-xs text-white font-medium text-center line-clamp-2 w-full min-h-[32px]">
                        {name}
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`text-[10px] px-2 py-0.5 rounded-full ${pubInfo.className}`}>
                        {pubInfo.text}
                      </div>

                      {/* View Details Button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white border-0"
                        onClick={() => navigate(`/author/books/${id}/chapters`)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {currentBooks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Không tìm thấy sách nào</p>
            </div>
          )}

          {/* Pagination */}
          {filteredBooks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-0">
                <div className="hidden sm:block sm:w-1/3" />
                <div className="w-full sm:flex-1 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={handlePrev}
                          className={`text-white hover:bg-white/10 ${currentPage === 1 ? "opacity-50 pointer-events-none" : ""}`}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={handleNext}
                          className={`text-white hover:bg-white/10 ${currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
                <div className="w-full sm:w-1/3 text-sm text-gray-400 text-center sm:text-right whitespace-nowrap">
                  Trang {currentPage} / {totalPages} ({filteredBooks.length} sách)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
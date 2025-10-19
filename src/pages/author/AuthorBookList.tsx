import { useState, useMemo } from 'react';
import { Menu, X, Search, Plus } from 'lucide-react';
import sampleData from '@/data/sample_books.json';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const books = sampleData.Books;

const statusLabels = {
  0: { text: 'Nháp', color: 'bg-gray-500' },
  1: { text: 'Chờ duyệt', color: 'bg-yellow-500' },
  2: { text: 'Đã xuất bản', color: 'bg-green-500' }
};

const publicationLabels = {
  0: { text: 'Chưa xuất bản', color: 'text-gray-400' },
  1: { text: 'Đã xuất bản', color: 'text-green-400' }
};

export default function AuthorBookList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPublication, setSelectedPublication] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 10;

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = book.book_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || book.progress_status.toString() === selectedStatus;
      const matchesPublication = selectedPublication === 'all' || book.publication_status.toString() === selectedPublication;

      return matchesSearch && matchesStatus && matchesPublication;
    });
  }, [searchQuery, selectedStatus, selectedPublication]);

  // Pagination logic
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const startIndex = (currentPage - 1) * booksPerPage;
  const currentBooks = filteredBooks.slice(startIndex, startIndex + booksPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

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
                className="pl-10 bg-transparent border-white/20 text-white placeholder:text-gray-400"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px] border-white/20 text-white bg-transparent">
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
              <SelectTrigger className="w-[180px] border-white/20 text-white bg-transparent">
                <SelectValue placeholder="Xuất bản" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="0">Chưa xuất bản</SelectItem>
                <SelectItem value="1">Đã xuất bản</SelectItem>
              </SelectContent>
            </Select>

            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Tạo sách mới
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                  <TableHead className="text-white font-medium">Bìa sách</TableHead>
                  <TableHead className="text-white font-medium">Tên sách</TableHead>
                  <TableHead className="text-white font-medium">Trạng thái</TableHead>
                  <TableHead className="text-white font-medium">Xuất bản</TableHead>
                  <TableHead className="text-white font-medium">Cập nhật</TableHead>
                  <TableHead className="text-white font-medium">Hành động</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentBooks.map((book) => (
                  <TableRow key={book.book_id} className="hover:bg-gray-50">
                    <TableCell>
                      <img
                        src={book.cover_url}
                        alt={book.book_name}
                        className="w-12 h-16 object-cover rounded shadow-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="64"%3E%3Crect width="48" height="64" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-900 font-medium">{book.book_name}</div>
                      <div className="text-gray-500 text-sm">ID: {book.book_id}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          book.progress_status === 0
                            ? 'bg-gray-100 text-gray-600'
                            : book.progress_status === 1
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-green-100 text-green-600'
                        }`}
                      >
                        {statusLabels[book.progress_status as keyof typeof statusLabels].text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${
                          book.publication_status === 0 ? 'text-gray-600' : 'text-green-600'
                        }`}
                      >
                        {publicationLabels[book.publication_status as keyof typeof publicationLabels].text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-900 text-sm">
                        {new Date(book.updated_date).toLocaleDateString('vi-VN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="secondary" size="sm">
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Empty state */}
            {currentBooks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Không tìm thấy sách nào</p>
              </div>
            )}

            {/* Pagination */}
            {filteredBooks.length > 0 && (
              <div className="border-t px-6 py-4 flex items-center justify-between bg-white">
                <span className="text-sm text-gray-600">
                  Trang {currentPage} / {totalPages}
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={handlePrev} className={currentPage === 1 ? "opacity-50 pointer-events-none" : ""} />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext onClick={handleNext} className={currentPage === totalPages ? "opacity-50 pointer-events-none" : ""} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

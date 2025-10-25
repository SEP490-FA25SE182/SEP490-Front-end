import { useState, useEffect } from 'react';
import { Menu, X, Plus } from 'lucide-react';
import axios from 'axios';
import AuthorSidebar from '@/components/author/AuthorSidebar';
import { Button } from "@/components/ui/button";
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
import { API_BASE_URL } from '@/config';

export default function AuthorChapterList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const chaptersPerPage = 10;

  useEffect(() => {
    async function fetchChapters() {
      try {
        const res = await axios.get(`${API_BASE_URL}/users/books/chapters`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        // If backend returns a Page object like books, try to use content
        if (res.data && Array.isArray(res.data.content)) {
          setChapters(res.data.content);
        } else if (Array.isArray(res.data)) {
          setChapters(res.data);
        } else {
          // Fallback: wrap single item or empty
          setChapters(res.data ? [res.data] : []);
        }
      } catch (err) {
        console.error('Lỗi khi tải chapters:', err);
        setChapters([]);
      } finally {
        setLoading(false);
      }
    }

    fetchChapters();
  }, []);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(chapters.length / chaptersPerPage));
  const startIndex = (currentPage - 1) * chaptersPerPage;
  const currentChapters = chapters.slice(startIndex, startIndex + chaptersPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
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

        {/* Actions */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-end gap-4">
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => (window.location.href = '/author/authorchaptercreate')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tạo chapter mới
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                  <TableHead className="text-white font-medium">Tên chương</TableHead>
                  <TableHead className="text-white font-medium">Số chương</TableHead>
                  <TableHead className="text-white font-medium">Mô tả</TableHead>
                  <TableHead className="text-white font-medium">Hành động</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentChapters.map((chapter: any) => (
                  <TableRow key={chapter.chapterId ?? chapter.chapter_id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="text-gray-900 font-medium">{chapter.chapterName ?? chapter.chapter_name}</div>
                      <div className="text-gray-500 text-sm">ID: {chapter.chapterId ?? chapter.chapter_id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-900">{chapter.chapterNumber ?? chapter.chapter_number}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-700 text-sm">{chapter.decription ?? chapter.description ?? chapter.desc ?? '-'}</div>
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
            {!loading && currentChapters.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Không tìm thấy chapter nào</p>
              </div>
            )}

            {/* Pagination */}
            {chapters.length > 0 && (
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

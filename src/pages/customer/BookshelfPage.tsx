import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/context/FavoriteContext";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { type Book } from "@/services/BookService";

export default function BookshelfPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();

  const totalPages = Math.ceil(favorites.length / itemsPerPage);
  const currentFavorites = favorites.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleToggleFavorite = (book: Book) => {
    toggleFavorite(book);
    toast({
      title: "Cập nhật thư viện",
      description: `"${book.bookName}" đã được xóa khỏi thư viện của bạn.`,
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 uppercase">
        Thư viện của tôi
      </h1>

      {favorites.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          Bạn chưa có sách yêu thích nào 😢 <br />
          Hãy thêm sách vào danh sách yêu thích của bạn nhé!
        </p>
      ) : (
        <>
          {currentFavorites.map((book) => (
            <div
              key={book.bookId}
              className="flex gap-6 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200"
            >
              {/* Book Cover */}
              <Link to={`/book/${book.bookId}`} className="flex-shrink-0">
                <div className="w-32 h-44 rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={book.coverUrl}
                    alt={book.bookName}
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
                    <Link to={`/book/${book.bookId}`}>
                      <h3 className="text-xl font-bold mb-2 hover:text-purple-400 transition-colors">
                        {book.bookName}
                      </h3>
                    </Link>

                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                      {book.decription ?? "Không có mô tả."}
                    </p>
                  </div>

                  {/* Xóa khỏi yêu thích */}
                  <button
                    onClick={() => handleToggleFavorite(book)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                  </button>
                </div>

                {/* Nút đọc sách */}
                <div className="flex items-center justify-between">
                  <p className="text-gray-500 text-sm">
                    Ngày thêm: {formatDate(book.createdAt)}
                  </p>
                  <Button
                    onClick={() => navigate(`/book/${book.bookId}`)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-6"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Đọc sách
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}

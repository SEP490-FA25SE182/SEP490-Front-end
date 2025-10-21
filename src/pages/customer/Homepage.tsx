import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getAllBooks, type Book } from "@/services/BookService";

/* -------------------------
 🧩 BookCard Component
-------------------------- */
const BookCard: React.FC<{ book: Book }> = ({ book }) => (
  <Link to={`/book/${book.bookId}`}>
    <div className="cursor-pointer group">
      <div className="aspect-[3/4] overflow-hidden rounded-xl mb-3 shadow-xl">
        <img
          src={book.coverUrl}
          alt={book.bookName}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%23667eea'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='white'%3ENo Image%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>
      <h3 className="text-white font-medium text-base line-clamp-2 mb-1">
        {book.bookName}
      </h3>
      <p className="text-white/50 text-sm line-clamp-1">
        {book.decription || "Không có mô tả"}
      </p>
    </div>
  </Link>
);

/* -------------------------
 🧩 BookSection Component
-------------------------- */
const BookSection: React.FC<{ title: string; books: Book[] }> = ({
  title,
  books,
}) => (
  <section className="mb-12">
    <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wide">
      {title}
    </h2>
    {books.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {books.map((book) => (
          <BookCard key={book.bookId} book={book} />
        ))}
      </div>
    ) : (
      <p className="text-center text-white/60">Không có sách nào để hiển thị.</p>
    )}
  </section>
);

/* -------------------------
 🖼 Danh sách ảnh quảng cáo
-------------------------- */
const advertisementImages = [
  "https://static.vecteezy.com/system/resources/previews/067/724/087/non_2x/book-festival-or-fair-horizontal-banner-for-advertising-and-promotion-piles-of-various-books-template-for-social-media-posts-web-design-world-book-day-or-back-to-school-concepts-vector.jpg",
  "https://static.vecteezy.com/system/resources/previews/027/450/989/non_2x/book-sale-horizontal-banners-web-header-template-book-sale-poster-banner-template-for-promotion-with-stack-of-books-cocktail-glasses-tropical-leaves-summer-seasonal-sale-vector.jpg",
  "https://cdn.vectorstock.com/i/500p/03/70/book-club-poster-community-reading-vector-47710370.jpg",
  "https://img.freepik.com/free-vector/horizontal-sale-banner-template-world-book-day-celebration_23-2150184563.jpg?semt=ais_hybrid&w=740&q=80",
];

/* -------------------------
 🌟 Homepage Component
-------------------------- */
export default function Homepage() {
  const { gerneId } = useParams<{ gerneId?: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await getAllBooks();
        console.log("📚 Dữ liệu trả về từ API:", data);
        setBooks(data);
      } catch (error) {
        console.error("❌ Lỗi khi fetch sách:", error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  // 🧠 Xử lý phân loại sách
  const newestBooks = [...books]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 4);

  const recommendedBooks = [...books]
    .filter((b) => b.publicationStatus === "PUBLISHED" || b.isActived === "ACTIVE")
    .slice(0, 4);

  const categoryBooks = [...books]
    .filter((b) => b.progressStatus === "COMPLETED")
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="container mx-auto px-20 py-12">
        {loading ? (
          <p className="text-center text-white">Đang tải dữ liệu sách...</p>
        ) : !gerneId ? (
          <>
            {/* 🎠 Carousel quảng cáo */}
            <section className="mb-12 max-w-5xl mx-auto">
              <div className="flex justify-center mb-12">
                <Link to="/blog">
                  <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 cursor-pointer">
                    ✨ Cộng đồng chia sẻ & Review
                  </button>
                </Link>
              </div>

              <Carousel opts={{ align: "start", loop: true }} className="w-full">
                <CarouselContent className="-ml-2 md:-ml-4">
                  {advertisementImages.map((image, index) => (
                    <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/2">
                      <div className="overflow-hidden rounded-lg">
                        <div className="aspect-[16/9] relative">
                          <img
                            src={image}
                            alt={`Advertisement ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </section>

            {/* 🧩 Các Section */}
            <BookSection title="Mới Nhất" books={newestBooks} />
            <BookSection title="Sách Được Đề Xuất" books={recommendedBooks} />
            <BookSection title="Sách Theo Thể Loại" books={categoryBooks} />
          </>
        ) : (
          <BookSection title="Thể loại" books={books} />
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}

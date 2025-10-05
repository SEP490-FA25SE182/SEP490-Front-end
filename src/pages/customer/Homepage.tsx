import CustomerHeader from '@/components/customer/CustomerHeader'
import CustomerFooter from '@/components/customer/CustomerFooter'
import React from 'react';
import booksData from '@/data/sample_books.json';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Link } from 'react-router-dom';

interface Book {
  book_id: string;
  book_name: string;
  cover_url: string;
  decription: string;
  created_date: string;
  updated_date: string;
  publication_status: number;
  bookshelve_id: string;
  published_date: string;
}

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => (
  <Link to={`/book/${book.book_id}`}>
    <div className="cursor-pointer group">
      <div className="aspect-[3/4] overflow-hidden rounded-xl mb-3 shadow-xl">
        <img
          src={book.cover_url}
          alt={book.book_name}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect width="200" height="300" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
      </div>
      <h3 className="text-white font-medium text-base line-clamp-2 mb-1">
        {book.book_name}
      </h3>
      <p className="text-white/50 text-sm line-clamp-1">
        {book.decription}
      </p>
    </div>
  </Link>
);

interface BookSectionProps {
  title: string;
  books: Book[];
}

const BookSection: React.FC<BookSectionProps> = ({ title, books }) => (
  <section className="mb-12">
    <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wide">
      {title}
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {books.map((book) => (
        <BookCard key={book.book_id} book={book} />
      ))}
    </div>
  </section>
);

// Danh sách ảnh quảng cáo
const advertisementImages = [
  "https://static.vecteezy.com/system/resources/previews/067/724/087/non_2x/book-festival-or-fair-horizontal-banner-for-advertising-and-promotion-piles-of-various-books-template-for-social-media-posts-web-design-world-book-day-or-back-to-school-concepts-vector.jpg",
  "https://static.vecteezy.com/system/resources/previews/027/450/989/non_2x/book-sale-horizontal-banners-web-header-template-book-sale-poster-banner-template-for-promotion-with-stack-of-books-cocktail-glasses-tropical-leaves-summer-seasonal-sale-vector.jpg",
  "https://cdn.vectorstock.com/i/500p/03/70/book-club-poster-community-reading-vector-47710370.jpg",
  "https://img.freepik.com/free-vector/horizontal-sale-banner-template-world-book-day-celebration_23-2150184563.jpg?semt=ais_hybrid&w=740&q=80",
  "https://www.shutterstock.com/image-vector/book-festival-fair-horizontal-banner-600nw-2651738827.jpg",
  "https://static.vecteezy.com/system/resources/previews/067/724/087/non_2x/book-festival-or-fair-horizontal-banner-for-advertising-and-promotion-piles-of-various-books-template-for-social-media-posts-web-design-world-book-day-or-back-to-school-concepts-vector.jpg",
];

export default function Homepage() {
  // ✅ Lấy đúng mảng "Books" trong JSON
  const allBooks = (booksData as any).Books || [];

  // Mới nhất
  const newestBooks = [...allBooks]
    .sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime())
    .slice(0, 4);

  // Được đề xuất (publication_status = 1)
  const recommendedBooks = [...allBooks]
    .filter(book => book.publication_status === 1)
    .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
    .slice(0, 4);

  // Theo thể loại (ví dụ bookshelve_id = 'shelf_1')
  const categoryBooks = [...allBooks]
    .filter(book => book.bookshelve_id === 'shelf_1')
    .slice(0, 4);

  return (
    <div className='min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]'>
      <CustomerHeader />

      <main className="container mx-auto px-20 py-12">
        {/* Carousel quảng cáo */}
        <section className="mb-12 max-w-5xl mx-auto">
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

        <BookSection title="Mới Nhất" books={newestBooks} />
        <BookSection title="Sách Được Đề Xuất" books={recommendedBooks} />
        <BookSection title="Sách Theo Thể Loại" books={categoryBooks} />
      </main>

      <CustomerFooter />
    </div>
  );
}

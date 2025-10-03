import CustomerFooter from '@/components/customer/CustomerFooter'
import CustomerHeader from '@/components/customer/CustomerHeader'
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import booksData from '@/data/sample_books.json';


interface Book {
  book_id: string;
  book_name: string;
  cover_url: string;
  decription: string;
  created_date: string;
  updated_date: string;
  publication_status: number;
}

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => (
  <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer group overflow-hidden">
    <CardContent className="p-0">
      <div className="aspect-[3/4] bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden">
        <img 
          src={book.cover_url} 
          alt={book.book_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect width="200" height="300" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 min-h-[40px]">
          {book.book_name}
        </h3>
        <p className="text-white/70 text-xs line-clamp-2">
          {book.decription}
        </p>
      </div>
    </CardContent>
  </Card>
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

export default function Homepage() {
  // Sắp xếp theo updated_date mới nhất
  const newestBooks = [...booksData]
    .sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime())
    .slice(0, 4);

  // Sách được đề xuất: publication_status = 1 và sắp xếp theo published_date
  const recommendedBooks = [...booksData]
    .filter(book => book.publication_status === 1)
    .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
    .slice(0, 4);

  // Sách theo thể loại: group theo bookshelve_id, lấy shelf_1
  const categoryBooks = [...booksData]
    .filter(book => book.bookshelve_id === 'shelf_1')
    .slice(0, 4);

  return (
    <div className='min-h-screen bg-gradient-to-br from-[#0F3460] via-[#16213E] to-[#1a1a2e]'>
      <CustomerHeader />
      
      <main className="container mx-auto px-6 py-12">
        <BookSection title="Mới Nhất" books={newestBooks} />
        <BookSection title="Sách Được Đề Xuất" books={recommendedBooks} />
        <BookSection title="Sách Theo Thể Loại" books={categoryBooks} />
      </main>
      
      <CustomerFooter />
    </div>
  );
}

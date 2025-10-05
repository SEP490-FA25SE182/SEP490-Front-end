import { useParams, Link } from 'react-router-dom';
import CustomerHeader from '@/components/customer/CustomerHeader';
import CustomerFooter from '@/components/customer/CustomerFooter';
import booksData from '@/data/sample_books.json';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Star } from 'lucide-react';
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useNavigate } from 'react-router-dom';

interface Review {
    id: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
}

const mockReviews: Review[] = [
    {
        id: '1',
        userName: 'Nguyễn Văn A',
        rating: 5,
        comment: 'Sách hay tuyệt vời, nội dung cuốn hút từ đầu đến cuối. Rất đáng để đọc!',
        date: '2025-03-15'
    },
    {
        id: '2',
        userName: 'Trần Thị B',
        rating: 4,
        comment: 'Cách viết rất dễ hiểu, tuy nhiên phần kết thúc hơi đột ngột.',
        date: '2025-03-10'
    },
    {
        id: '3',
        userName: 'Lê Văn C',
        rating: 5,
        comment: 'Một trong những cuốn sách hay nhất mà tôi từng đọc. Highly recommended!',
        date: '2025-03-05'
    }
];

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
    return (
        <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`w-5 h-5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                />
            ))}
        </div>
    );
};

// Thêm interface BookCardProps
interface BookCardProps {
    book: {
        book_id: string;
        book_name: string;
        cover_url: string;
        decription: string;
    };
}

// Thêm component BookCard (tương tự Homepage)
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

export const BookDetail = () => {
    const { bookId } = useParams();
    const { add } = useCart();         
    const { toast } = useToast();           // 👈 hook shadcn/ui
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [bookId]);
    
    const book = booksData.find((b) => b.book_id === bookId);

    // Thêm logic để lấy sách liên quan
    const relatedBooks = booksData
        .filter(b =>
            // Lọc sách cùng bookshelve_id và không phải sách hiện tại
            b.book_id !== bookId &&
            b.bookshelve_id === book?.bookshelve_id
        )
        .slice(0, 4); // Lấy 4 sách

    if (!book) {
        return <div>Book not found</div>;
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleAddToCart = () => {
    add(book, 1);
    toast({
      title: 'Đã thêm vào giỏ hàng',
      description: `“${book.book_name}” đã được thêm.`,
      action: (
        <ToastAction
          altText="Xem giỏ hàng"
          onClick={() => navigate('/cart')}
        >
          Xem giỏ
        </ToastAction>
      ),
      // duration: 2500, // (tuỳ chọn) thời gian ẩn toast
    });
  };

  const handleBuyNow = () => {
  // Không đụng giỏ: chỉ chuyển sang checkout với 1 dòng hàng
  navigate("/checkout", {
    state: {
      buyNowLine: { book, qty: 1 }, // giống shape CartLine
    },
  });
};


    return (
        <div className='min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]'>
            <CustomerHeader />

            <main className="container mx-auto px-4 md:px-20 py-12">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left side - Book Cover */}
                    <div className="md:w-1/3">
                        <div className="aspect-[3/4] overflow-hidden rounded-xl shadow-xl">
                            <img
                                src={book.cover_url}
                                alt={book.book_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect width="200" height="300" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                            />
                        </div>
                    </div>

                    {/* Right side - Book Details */}
                    <div className="md:w-2/3">
                        <h1 className="text-3xl font-bold text-white mb-4">
                            {book.book_name}
                        </h1>

                        <div className="space-y-4 text-white/80">
                            <p className="text-lg">
                                <span className="font-semibold">Mô tả:</span> {book.decription}
                            </p>

                            <p>
                                <span className="font-semibold">Ngày xuất bản:</span>{' '}
                                {formatDate(book.published_date)}
                            </p>

                            <p>
                                <span className="font-semibold">Ngày cập nhật:</span>{' '}
                                {formatDate(book.updated_date)}
                            </p>

                            <div className="pt-6">
                                <h3 className="text-xl font-bold text-white mb-4">
                                    Giá: 150.000 VND
                                </h3>

                                <div className="flex gap-4">
                                    <Button
                                        size="lg"
                                        className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white rounded-full px-6 py-3 cursor-pointer"
                                        onClick={handleBuyNow}
                                    >
                                        Mua ngay
                                    </Button>

                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white hover:text-white rounded-full cursor-pointer"
                                        // onClick={() => add(book, 1)}
                                        onClick={handleAddToCart}
                                    >
                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                        Thêm vào giỏ
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thêm phần Reviews */}
                <div className="mt-12">
                    <div className="border-t border-white/20 pt-8">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            Đánh giá ({mockReviews.length})
                        </h2>

                        <div className="space-y-6">
                            {mockReviews.map((review) => (
                                <div key={review.id} className="bg-white/5 rounded-lg p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h3 className="text-white font-semibold">{review.userName}</h3>
                                            <div className="flex items-center gap-2">
                                                <StarRating rating={review.rating} />
                                                <span className="text-white/60 text-sm">
                                                    {new Date(review.date).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-white/80 mt-2">{review.comment}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Thêm phần Có thể bạn cũng thích */}
                <div className="mt-16">
                    <div className="border-t border-white/20 pt-8">
                        <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wide">
                            Có thể bạn cũng thích
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {relatedBooks.map((relatedBook) => (
                                <BookCard key={relatedBook.book_id} book={relatedBook} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <CustomerFooter />
        </div>
    );
};

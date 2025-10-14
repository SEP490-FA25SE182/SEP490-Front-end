import { useParams, Link } from 'react-router-dom';
import CustomerHeader from '@/components/customer/CustomerHeader';
import CustomerFooter from '@/components/customer/CustomerFooter';
import booksData from '@/data/sample_books.json';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '@/context/FavoriteContext';
import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`w-5 h-5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
        ))}
    </div>
);

interface BookCardProps {
    book: {
        book_id: string;
        book_name: string;
        cover_url: string;
        decription: string;
    };
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
                        target.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect width="200" height="300" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                />
            </div>
            <h3 className="text-white font-medium text-base line-clamp-2 mb-1">{book.book_name}</h3>
            <p className="text-white/50 text-sm line-clamp-1">{book.decription}</p>
        </div>
    </Link>
);

export const BookDetail = () => {
    const { bookId } = useParams();
    const { add } = useCart();
    const { toast } = useToast();           // 👈 hook shadcn/ui
    const navigate = useNavigate();
    const { toggleFavorite, isFavorite } = useFavorites();
    const [showPreview, setShowPreview] = useState(false);


    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [bookId]);

    // ✅ Lấy sách từ schema mới
    const books = booksData.Books;
    const bookGenres = booksData.BookGenres;

    const book = books.find((b) => b.book_id === bookId);

    if (!book) {
        return <div>Book not found</div>;
    }

    // ✅ Lấy danh sách genre_id của sách hiện tại
    const currentBookGenres = bookGenres
        .filter((bg) => bg.book_id === book.book_id)
        .map((bg) => bg.genre_id);

    // ✅ Lấy sách liên quan theo thể loại (có ít nhất 1 genre trùng)
    const relatedBooks = books
        .filter((b) => {
            if (b.book_id === book.book_id) return false;
            const otherGenres = bookGenres.filter((bg) => bg.book_id === b.book_id).map((bg) => bg.genre_id);
            return otherGenres.some((g) => currentBookGenres.includes(g));
        })
        .slice(0, 4);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

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

    const handleToggleFavorite = () => {
        toggleFavorite(book);
        toast({
            title: isFavorite(book.book_id)
                ? 'Đã xóa khỏi thư viện'
                : 'Đã thêm vào thư viện',
            description: `"${book.book_name}" ${isFavorite(book.book_id) ? 'đã được xóa khỏi' : 'đã được thêm vào'} thư viện của bạn.`,
            action: isFavorite(book.book_id) ? undefined : (
                <ToastAction
                    altText="Xem thư viện"
                    onClick={() => navigate('/bookshelf')}
                >
                    Xem thư viện
                </ToastAction>
            ),
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
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
                                    target.src =
                                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect width="200" height="300" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                            />
                        </div>
                    </div>

                    {/* Right side - Book Details */}
                    <div className="md:w-2/3">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-3xl font-bold text-white">{book.book_name}</h1>
                            <button
                                onClick={handleToggleFavorite}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Heart
                                    className={`w-6 h-6 ${isFavorite(book.book_id)
                                            ? 'fill-red-500 text-red-500'
                                            : 'text-white'
                                        }`}
                                />
                            </button>
                        </div>

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
                                <h3 className="text-xl font-bold text-white mb-4">Giá: 150.000 VND</h3>

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
  variant="secondary"
  className="bg-gradient-to-r from-green-400 to-teal-500 text-white rounded-full cursor-pointer"
  onClick={() => setShowPreview(true)}
>
  <PlayCircle className="mr-2 h-5 w-5" />
  Đọc thử
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

                {/* Reviews */}
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

                {/* Related Books */}
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
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
  <DialogContent className="bg-[#1a1a2e] text-white border-white/20 rounded-xl max-w-lg">
    <DialogHeader>
      <DialogTitle className="text-2xl font-bold">Đọc thử: {book.book_name}</DialogTitle>
    </DialogHeader>

    <div className="mt-4 space-y-4">
      <p className="text-white/80 text-base leading-relaxed">
        Đây là phần tóm tắt ngắn gọn của cuốn sách. Nội dung xoay quanh hành trình của nhân vật chính 
        khám phá thế giới và những bài học sâu sắc về cuộc sống, tình bạn và lòng dũng cảm.
      </p>

      {/* Phát thử audio */}
      <div className="bg-white/5 p-4 rounded-lg">
        <audio
          controls
          className="w-full"
          src="https://www2.cs.uic.edu/~i101/SoundFiles/PinkPanther30.wav" // 👈 file audio hard-code
        >
          Trình duyệt của bạn không hỗ trợ phát audio.
        </audio>
      </div>
    </div>

    <div className="mt-6 flex justify-end">
      <Button variant="outline" onClick={() => setShowPreview(false)}>
        Đóng
      </Button>
    </div>
  </DialogContent>
</Dialog>


            <CustomerFooter />
        </div>
    );
    
};

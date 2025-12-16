import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { getAllGenres, type Genre } from "@/services/GenreService";
import { motion, type Variants, useReducedMotion } from "framer-motion";

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
 🎞 Motion helpers
-------------------------- */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const SectionReveal: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ children, className }) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.section
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
};

/* -------------------------
 🧩 BookCard
-------------------------- */
const BookCard: React.FC<{ book: Book }> = ({ book }) => (
  <Link to={`/book/${book.bookId}`}>
    <div className="cursor-pointer group">
      <div className="aspect-3/4 overflow-hidden rounded-xl mb-3 shadow-xl">
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
 🧩 Section: Grid sách (có stagger)
-------------------------- */
const BookGridSection: React.FC<{
  title: string;
  books: Book[];
  emptyText?: string;
}> = ({ title, books, emptyText = "Không có sách nào để hiển thị." }) => {
  const reduceMotion = useReducedMotion();

  return (
    <SectionReveal className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
          {title}
        </h2>
      </div>

      {books.length > 0 ? (
        <motion.div
          variants={reduceMotion ? undefined : stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
        >
          {books.map((book) => (
            <motion.div
              key={book.bookId}
              variants={reduceMotion ? undefined : fadeUp}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <BookCard book={book} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <p className="text-center text-white/60">{emptyText}</p>
      )}
    </SectionReveal>
  );
};

/* -------------------------
 🎠 Section: Carousel sách (có stagger nhẹ)
-------------------------- */
const BookCarouselSection: React.FC<{
  title: string;
  books: Book[];
}> = ({ title, books }) => {
  const reduceMotion = useReducedMotion();

  return (
    <SectionReveal className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
          {title}
        </h2>
      </div>

      {books.length > 0 ? (
        <motion.div
          variants={reduceMotion ? undefined : fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent className="-ml-3 md:-ml-4">
              {books.map((book) => (
                <CarouselItem
                  key={book.bookId}
                  className="pl-3 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                >
                  <motion.div
                    variants={reduceMotion ? undefined : fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <BookCard book={book} />
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </motion.div>
      ) : (
        <p className="text-center text-white/60">Không có sách nào để hiển thị.</p>
      )}
    </SectionReveal>
  );
};

/* -------------------------
 📚 Genres Row (kéo ngang + click vẫn chạy)
-------------------------- */
function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);

  const state = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    blockClick: false,
    pointerId: -1,
    hasCapture: false,
  });

  const THRESHOLD = 6;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;

    state.current.isDown = true;
    state.current.moved = false;
    state.current.blockClick = false;
    state.current.pointerId = e.pointerId;
    state.current.hasCapture = false;

    state.current.startX = e.clientX;
    state.current.scrollLeft = el.scrollLeft;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !state.current.isDown) return;

    const dx = e.clientX - state.current.startX;
    if (!state.current.moved && Math.abs(dx) < THRESHOLD) return;

    if (!state.current.moved) {
      state.current.moved = true;
      state.current.blockClick = true;
      try {
        el.setPointerCapture(state.current.pointerId);
        state.current.hasCapture = true;
      } catch { }
    }

    el.scrollLeft = state.current.scrollLeft - dx;
  };

  const onPointerUp = () => {
    const el = ref.current;
    if (!el) return;

    state.current.isDown = false;

    if (state.current.hasCapture) {
      try {
        el.releasePointerCapture(state.current.pointerId);
      } catch { }
    }

    if (state.current.blockClick) {
      window.setTimeout(() => {
        state.current.blockClick = false;
        state.current.moved = false;
      }, 0);
    }
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state.current.blockClick) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return { ref, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}

/* -------------------------
 🌟 Homepage
-------------------------- */
export default function Homepage() {
  const { genreId } = useParams<{ genreId?: string }>();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);

  const drag = useDragScroll();

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const data = await getAllBooks({
          ...(genreId ? { genreId } : {}),
          isActived: "ACTIVE",
          publicationStatus: 1, // ✅ chỉ lấy sách đã xuất bản
        });

        const publishedActiveBooks = (Array.isArray(data) ? data : []).filter((b: any) => {
          const act = String(b.isActived ?? b.is_actived ?? "").toUpperCase();
          const pubRaw = b.publicationStatus ?? b.publication_status;
          const pub = typeof pubRaw === "string" ? pubRaw.toUpperCase() : Number(pubRaw);

          const isActive = act === "ACTIVE";
          const isPublished = pub === 1 || pub === "PUBLISHED";

          return isActive && isPublished;
        });

        setBooks(publishedActiveBooks);
      } catch (error) {
        console.error("❌ Lỗi khi fetch sách:", error);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [genreId]);


  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      setLoadingGenres(true);
      try {
        const data = await getAllGenres();
        setGenres(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("❌ Lỗi khi fetch genres:", error);
        setGenres([]);
      } finally {
        setLoadingGenres(false);
      }
    };

    fetchGenres();
  }, []);

  const newestBooks = useMemo(() => {
    return [...books]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 10);
  }, [books]);

  const carouselBooks1 = useMemo(() => {
    const rec = [...books].filter((b) => b.publicationStatus === 1);
    return (rec.length ? rec : [...books]).slice(0, 16);
  }, [books]);

  const trendingBooks = useMemo(() => {
    const score = (b: Book) => {
      const anyB = b as any;
      const views = Number(anyB.views ?? anyB.viewCount ?? 0);
      const sold = Number(anyB.totalSold ?? anyB.soldCount ?? 0);
      const rating = Number(anyB.averageRating ?? anyB.rating ?? 0);
      return sold * 3 + views * 1 + rating * 10;
    };

    return [...books]
      .sort((a, b) => {
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })
      .slice(0, 10);
  }, [books]);

  const featuredBooks = useMemo(() => {
    const list = [...books].filter((b) => {
      const anyB = b as any;
      return (
        anyB.isFeatured === true ||
        anyB.featured === 1 ||
        anyB.isFeatured === 1 ||
        b.publicationStatus === 1
      );
    });

    return (list.length ? list : [...books]).slice(0, 10);
  }, [books]);

  const carouselBooks2 = useMemo(() => {
    const ids = new Set(
      [...carouselBooks1, ...newestBooks].map((b) => b.bookId)
    );
    const rest = books.filter((b) => !ids.has(b.bookId));
    const source = rest.length ? rest : books;
    return [...source].slice(0, 16);
  }, [books, carouselBooks1, newestBooks]);

  return (
    <div className="min-h-screen bg-linear-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-center text-white">Đang tải dữ liệu sách...</p>
        ) : !genreId ? (
          <>
            {/* Banner */}
            <SectionReveal className="mb-10">
              <Carousel opts={{ align: "start", loop: true }} className="w-full">
                <CarouselContent>
                  {advertisementImages.map((image, index) => (
                    <CarouselItem key={index} className="basis-full">
                      <div className="rounded-2xl shadow-2xl overflow-hidden">
                        <img
                          src={image}
                          alt={`Advertisement ${index + 1}`}
                          className="w-full h-[400px] object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </SectionReveal>

            {/* Button blog */}
            <SectionReveal className="flex justify-center mb-8">
              <Link to="/blog">
                <button className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 cursor-pointer">
                  ✨ Cộng đồng chia sẻ & Review
                </button>
              </Link>
            </SectionReveal>

            {/* Genres */}
            <SectionReveal className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
                  Thể loại
                </h2>
                <Link
                  to="/"
                  className="text-sm text-white/60 hover:text-purple-300 transition-colors"
                >
                  Xem tất cả
                </Link>
              </div>

              {loadingGenres ? (
                <p className="text-white/60">Đang tải thể loại...</p>
              ) : genres.length === 0 ? (
                <p className="text-white/60">Không có thể loại nào.</p>
              ) : (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                  ref={drag.ref}
                  onPointerDown={drag.onPointerDown}
                  onPointerMove={drag.onPointerMove}
                  onPointerUp={drag.onPointerUp}
                  onClickCapture={drag.onClickCapture}
                  className="
                    flex gap-4 overflow-x-auto select-none
                    cursor-grab active:cursor-grabbing
                    py-2 pr-2
                    [scrollbar-width:none] [-ms-overflow-style:none]
                    [&::-webkit-scrollbar]:hidden
                  "
                >
                  {genres.map((g) => (
                    <motion.div key={g.genreId} variants={fadeUp}>
                      <Link
                        to={`/genre/${g.genreId}`}
                        className="
                          block
                          min-w-[180px] sm:min-w-[220px]
                          rounded-2xl border border-[#2a3857]
                          bg-white/5 hover:bg-white/10
                          transition-all duration-200
                          px-4 py-4
                          shadow-lg
                        "
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-white font-semibold line-clamp-1">
                            {g.genreName}
                          </p>
                          <p className="text-white/50 text-sm">
                            Khám phá ngay →
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </SectionReveal>

            {/* Books sections */}
            <BookGridSection title="Sách mới nhất" books={newestBooks} />

            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {advertisementImages.map((image, index) => (
                  <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/2">
                    <div className="overflow-hidden rounded-lg">
                      <div className="aspect-video relative">
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

            <BookCarouselSection title="Khám phá" books={carouselBooks1} />
            <BookGridSection title="Trending" books={trendingBooks} />
            <BookGridSection title="Featured" books={featuredBooks} />

            <SectionReveal className="mb-12">
              <div className="rounded-2xl shadow-2xl overflow-hidden">
                <img
                  src={advertisementImages[0]} // đổi index nếu muốn ảnh khác
                  alt="Mid Advertisement"
                  className="w-full h-[400px] object-cover" // height nhỏ hơn banner trên
                  loading="lazy"
                />
              </div>
            </SectionReveal>

            <BookCarouselSection title="Dành cho bạn" books={carouselBooks2} />
          </>
        ) : books.length === 0 ? (
          <SectionReveal className="flex flex-col items-center justify-center h-[50vh] text-white">
            <p className="text-xl font-medium text-white/70 mb-4">
              Không có sách nào thuộc thể loại này
            </p>
            <Link
              to="/"
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Quay lại trang chủ
            </Link>
          </SectionReveal>
        ) : (
          <BookGridSection title="Thể loại" books={books} />
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}

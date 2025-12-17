import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllBooks, type Book } from "@/services/BookService";
import { getAllGenres, type Genre } from "@/services/GenreService";
import {
  AnimatePresence,
  motion,
  type Variants,
  useReducedMotion,
} from "framer-motion";

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
 🎨 Genre cards (UI giống ảnh)
-------------------------- */
const GENRE_BG = [
  "from-indigo-500/70 to-sky-500/20",
  "from-slate-500/70 to-indigo-500/20",
  "from-emerald-500/70 to-teal-500/20",
  "from-violet-500/70 to-indigo-500/20",
  "from-orange-400/70 to-amber-500/20",
  "from-rose-500/70 to-red-500/20",
  "from-slate-600/70 to-slate-500/20",
];

const GenreCard: React.FC<{
  title: string;
  subtitle: string;
  className?: string;
  onClick?: () => void;
  to?: string;
  bgClass: string;
}> = ({ title, subtitle, className, onClick, to, bgClass }) => {
  const Inner = (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border border-white/10",
        "p-6 h-[118px] flex flex-col justify-between",
        "shadow-lg hover:shadow-xl transition-all",
        "bg-linear-to-br",
        bgClass,
        className || "",
      ].join(" ")}
    >
      {/* pattern overlay */}
      <div className="absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_90%_80%,rgba(255,255,255,0.10),transparent_55%)]" />
      <div className="absolute inset-0 opacity-20 [background:repeating-radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.18)_0px,rgba(255,255,255,0.18)_1px,transparent_10px,transparent_14px)]" />

      <div className="relative">
        <p className="text-white text-xl font-semibold leading-snug line-clamp-2">
          {title}
        </p>
      </div>

      <div className="relative flex items-center gap-2 text-white/85 text-sm">
        <span>{subtitle}</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );

  if (to) return <Link to={to}>{Inner}</Link>;
  return (
    <button onClick={onClick} className="text-left w-full">
      {Inner}
    </button>
  );
};

const GenresSectionCards: React.FC<{ genres: Genre[] }> = ({ genres }) => {
  const [openAll, setOpenAll] = useState(false);

  // ✅ 6 card + 1 card “+N chủ đề” (y như đang set)
  const MAX_PREVIEW = 6;
  const preview = genres.slice(0, MAX_PREVIEW);
  const restCount = Math.max(0, genres.length - preview.length);

  return (
    <SectionReveal className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
          Thể loại
        </h2>
      </div>

      {genres.length === 0 ? (
        <p className="text-white/60">Không có thể loại nào.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {preview.map((g, idx) => (
              <GenreCard
                key={g.genreId}
                title={g.genreName}
                subtitle="Xem chủ đề"
                to={`/genre/${g.genreId}`}
                bgClass={GENRE_BG[idx % GENRE_BG.length]}
              />
            ))}

            {restCount > 0 && (
              <GenreCard
                title={`+${restCount} chủ đề`}
                subtitle="Xem tất cả"
                onClick={() => setOpenAll(true)}
                bgClass="from-slate-600/70 to-slate-500/20"
              />
            )}
          </div>

          {/* Dialog xổ ra tất cả thể loại */}
          <Dialog open={openAll} onOpenChange={setOpenAll}>
            <DialogContent className="bg-[#0b1224] text-white border-white/10 rounded-2xl max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Tất cả thể loại ({genres.length})
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-auto pr-2">
                {genres.map((g) => (
                  <Link
                    key={g.genreId}
                    to={`/genre/${g.genreId}`}
                    onClick={() => setOpenAll(false)}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-3"
                  >
                    <p className="font-semibold text-white line-clamp-2">
                      {g.genreName}
                    </p>
                  </Link>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </SectionReveal>
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

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs whitespace-nowrap">
    {children}
  </span>
);

/* -------------------------
 🎯 Hero slide: chip = thể loại của sách
-------------------------- */
const HeroBookSlide: React.FC<{
  book: Book;
  bookGenres?: Genre[];
}> = ({ book, bookGenres = [] }) => {
  const cover = book.coverUrl;
  const chips = bookGenres.slice(0, 4);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={cover}
          alt={book.bookName}
          className="w-full h-full object-cover scale-110 blur-3xl opacity-35"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#0b1224]/95 via-[#0b1224]/75 to-[#0b1224]/95" />
        <div className="absolute inset-y-0 left-1/2 w-60 -translate-x-1/2 bg-linear-to-r from-[#0b1224]/0 via-[#0b1224]/65 to-[#0b1224]/0 blur-xl" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center min-h-[520px]">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight line-clamp-2">
                {book.bookName}
              </h2>

              {chips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {chips.map((g) => (
                    <Chip key={g.genreId}>{g.genreName}</Chip>
                  ))}
                  {bookGenres.length > chips.length && (
                    <Chip>+{bookGenres.length - chips.length}</Chip>
                  )}
                </div>
              )}

              <p className="text-white/70 leading-relaxed line-clamp-4 max-w-xl">
                {book.decription || "Chưa có mô tả cho cuốn sách này."}
              </p>

              <div className="pt-2">
                <Link
                  to={`/book/${book.bookId}`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-700 transition text-white font-semibold shadow-lg"
                >
                  Xem chi tiết
                </Link>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="relative">
                <div className="absolute -inset-8 rounded-[36px] bg-white/10 blur-2xl" />
                <img
                  src={cover}
                  alt={book.bookName}
                  className="relative w-60 md:w-[320px] lg:w-[360px] aspect-3/4 object-cover rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getThumbWindow<T>(arr: T[], active: number, max = 5) {
  const total = arr.length;
  const size = Math.min(max, total);
  if (total <= size) return { start: 0, items: arr };

  const half = Math.floor(size / 2);
  let start = active - half;
  start = clamp(start, 0, total - size);

  return { start, items: arr.slice(start, start + size) };
}

const HeroFullBleed: React.FC<{
  books: Book[];
  genresMap: Record<string, Genre[]>;
}> = ({ books, genresMap }) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [books.length]);

  const activeBook = books[active];
  const thumb = useMemo(() => getThumbWindow(books, active, 5), [books, active]);

  if (!activeBook) return null;

  return (
    <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBook.bookId}
            initial={{ opacity: 0, y: 10, scale: 1.01 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <HeroBookSlide
              book={activeBook}
              bookGenres={genresMap[String(activeBook.bookId)] || []}
            />
          </motion.div>
        </AnimatePresence>

        {/* tabs (max 5) */}
        <div className="absolute bottom-10 right-10 z-20 flex items-center gap-3">
          {thumb.items.map((b, i) => {
            const realIndex = thumb.start + i;
            const isActive = realIndex === active;

            return (
              <button
                key={b.bookId}
                onClick={() => setActive(realIndex)}
                className={`
                  relative overflow-hidden rounded-xl
                  w-14 h-20 md:w-16 md:h-24
                  border transition
                  ${isActive
                    ? "border-white/70 shadow-xl"
                    : "border-white/15 opacity-75 hover:opacity-100"
                  }
                `}
                title={b.bookName}
              >
                <img
                  src={b.coverUrl}
                  alt={b.bookName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isActive && (
                  <div className="absolute inset-0 ring-2 ring-white/80 rounded-xl" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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

const GenreRowsBlock: React.FC<{
  rows: Array<{ genre: Genre; books: Book[] }>;
}> = ({ rows }) => {
  if (!rows.length) return null;

  return (
    <SectionReveal className="mb-12">
      <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl overflow-hidden">
        {rows.map((row, idx) => (
          <div
            key={row.genre.genreId}
            className={[
              "px-6 py-6",
              idx !== rows.length - 1 ? "border-b border-white/10" : "",
            ].join(" ")}
          >
            <div className="grid grid-cols-12 gap-6 items-start">
              {/* LEFT: Genre info */}
              <div className="col-span-12 md:col-span-3">
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {row.genre.genreName}
                </h3>
                <p className="text-white/50 text-sm mt-1">Sách cùng thể loại</p>

                <Link
                  to={`/genre/${row.genre.genreId}`}
                  className="inline-block mt-3 text-sm text-white/60 hover:text-purple-300 transition-colors"
                >
                  Xem tất cả
                </Link>
              </div>

              {/* RIGHT: Books carousel */}
              <div className="col-span-12 md:col-span-9 md:-mt-2">
                {row.books.length > 0 ? (
                  <Carousel opts={{ align: "start", loop: false }} className="w-full">
                    <CarouselContent className="-ml-3 md:-ml-4">
                      {row.books.map((book) => (
                        <CarouselItem
                          key={book.bookId}
                          className="pl-3 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                        >
                          <BookCard book={book} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>

                    {/* ✅ bỏ 2 nút này để không tràn div */}
                    {/* <CarouselPrevious /> */}
                    {/* <CarouselNext /> */}
                  </Carousel>
                ) : (
                  <p className="text-white/60">Chưa có sách cho thể loại này.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionReveal>
  );
};

/* -------------------------
 🌟 Homepage
-------------------------- */
export default function Homepage() {
  const { genreId } = useParams<{ genreId?: string }>();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);

  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const [genreRows, setGenreRows] = useState<Array<{ genre: Genre; books: Book[] }>>([]);
  const [loadingGenreRows, setLoadingGenreRows] = useState(false);

  const [heroGenresMap, setHeroGenresMap] = useState<Record<string, Genre[]>>({});

  const filteredBooks = useMemo(() => {
    if (!q) return books;
    const needle = q.toLowerCase();
    return books.filter((b) => (b.bookName ?? "").toLowerCase().includes(needle));
  }, [books, q]);

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

  // heroBooks (đặt TRƯỚC effect dùng heroBooks)
  const heroBooks = useMemo(() => {
    return [...books]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [books]);

  // Fetch genres cho từng hero book (giống BookDetail: getAllGenres(bookId))
  useEffect(() => {
    const run = async () => {
      if (!heroBooks.length) {
        setHeroGenresMap({});
        return;
      }

      try {
        const entries = await Promise.all(
          heroBooks.map(async (b) => {
            try {
              const gs = await getAllGenres(String(b.bookId));
              return [String(b.bookId), Array.isArray(gs) ? gs : []] as const;
            } catch {
              return [String(b.bookId), []] as const;
            }
          })
        );

        setHeroGenresMap(Object.fromEntries(entries));
      } catch {
        setHeroGenresMap({});
      }
    };

    run();
  }, [heroBooks]);

  // Fetch genres (danh sách thể loại toàn hệ thống)
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

  useEffect(() => {
    const fetchGenreRows = async () => {
      if (loadingGenres) return;
      if (!genres.length) {
        setGenreRows([]);
        return;
      }

      // chỉ hiển thị ở homepage (không phải trang lọc theo genreId)
      if (genreId) return;

      const top3 = genres.slice(0, 3);

      setLoadingGenreRows(true);
      try {
        const rows = await Promise.all(
          top3.map(async (g) => {
            try {
              const data = await getAllBooks({
                genreId: String(g.genreId),
                isActived: "ACTIVE",
                publicationStatus: 1,
              });

              const list = (Array.isArray(data) ? data : []).filter((b: any) => {
                const act = String(b.isActived ?? b.is_actived ?? "").toUpperCase();
                const pubRaw = b.publicationStatus ?? b.publication_status;
                const pub = typeof pubRaw === "string" ? pubRaw.toUpperCase() : Number(pubRaw);
                return act === "ACTIVE" && (pub === 1 || pub === "PUBLISHED");
              });

              return { genre: g, books: list.slice(0, 16) };
            } catch {
              return { genre: g, books: [] as Book[] };
            }
          })
        );

        setGenreRows(rows);
      } finally {
        setLoadingGenreRows(false);
      }
    };

    fetchGenreRows();
  }, [genres, loadingGenres, genreId]);


  const newestBooks = useMemo(() => {
    return [...books]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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
    const ids = new Set([...carouselBooks1, ...newestBooks].map((b) => b.bookId));
    const rest = books.filter((b) => !ids.has(b.bookId));
    const source = rest.length ? rest : books;
    return [...source].slice(0, 16);
  }, [books, carouselBooks1, newestBooks]);

  return (
    <div className="min-h-screen bg-linear-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-6">
        {loading ? (
          <p className="text-center text-white">Đang tải dữ liệu sách...</p>
        ) : q ? (
          <>
            <BookGridSection
              title={`Kết quả cho "${q}"`}
              books={filteredBooks}
              emptyText="Không tìm thấy sách phù hợp."
            />
          </>
        ) : !genreId ? (
          <>
            {/* Banner */}
            <SectionReveal className="mb-10">
              <HeroFullBleed books={heroBooks} genresMap={heroGenresMap} />
            </SectionReveal>

            {/* Button blog */}
            <SectionReveal className="flex justify-center mb-8">
              <Link to="/blog">
                <button className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 cursor-pointer">
                  ✨ Cộng đồng chia sẻ & Review
                </button>
              </Link>
            </SectionReveal>

            {/* ✅ Genres (card UI + +N chủ đề, bỏ kéo ngang) */}
            {loadingGenres ? (
              <SectionReveal className="mb-12">
                <p className="text-white/60">Đang tải thể loại...</p>
              </SectionReveal>
            ) : (
              <GenresSectionCards genres={genres} />
            )}

            {loadingGenreRows ? (
              <SectionReveal className="mb-10">
                <p className="text-white/60">Đang tải sách theo thể loại...</p>
              </SectionReveal>
            ) : (
              <GenreRowsBlock rows={genreRows} />
            )}

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
                  src={advertisementImages[0]}
                  alt="Mid Advertisement"
                  className="w-full h-[400px] object-cover"
                  loading="lazy"
                />
              </div>
            </SectionReveal>

            <BookCarouselSection title="Dành cho bạn" books={carouselBooks2} />
          </>
        ) : filteredBooks.length === 0 ? (
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
          <BookGridSection title="Thể loại" books={filteredBooks} />
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}

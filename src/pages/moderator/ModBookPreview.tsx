import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    Volume2,
    MapPin,
    BookOpen,
    Image as ImageIcon,
} from "lucide-react";

import ModeratorLayout from "./ModeratorLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import { getBookById, updateBook, type Book } from "@/services/BookService";
import {
    getAllChapters,
    getAllPages,
    type Chapter,
    type Page,
} from "@/services/BookManageService";

import {
    searchPageAudios,
    searchPageIllustrations,
    getAudioById,
    getIllustrationById,
    type Audio,
    type Illustration,
} from "@/services/AIService";

import { searchMarkers } from "@/services/ARService";

interface EnrichedPage extends Page {
    chapterName?: string;
    chapterNumber?: number;
    audio?: Audio | null;
    illustration?: Illustration | null;
    hasMarker?: boolean;
    markerImageUrl?: string | null;
}

type LocationState = {
    book?: Book;
};

export default function ModBookPreview() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const location = useLocation() as { state?: LocationState };
    const { toast } = useToast();

    const [book, setBook] = useState<Book | null>(location.state?.book ?? null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [pages, setPages] = useState<EnrichedPage[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeAudioPageId, setActiveAudioPageId] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // review moderator nhập
    const [reviewText, setReviewText] = useState<string>("");

    useEffect(() => {
        if (!bookId) return;

        let cancelled = false;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Lấy book detail
                let currentBook = location.state?.book as Book | undefined;
                if (!currentBook) {
                    currentBook = await getBookById(bookId);
                }
                if (cancelled) return;
                setBook(currentBook);
                setReviewText(currentBook?.review ?? ""); //  fill review cũ nếu có

                // 2. Chapters
                const chaptersRes: any = await getAllChapters({
                    bookId,
                    page: 0,
                    size: 200,
                });
                let chapterList: Chapter[] = chaptersRes?.content ?? chaptersRes ?? [];
                chapterList = [...chapterList].sort(
                    (a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0)
                );
                if (cancelled) return;
                setChapters(chapterList);

                // 3. Pages theo chapter
                const basePages: EnrichedPage[] = [];
                for (const ch of chapterList) {
                    if (!ch.chapterId) continue;
                    const pagesRes: any = await getAllPages({
                        chapterId: ch.chapterId,
                        page: 0,
                        size: 500,
                    });
                    const pageList: Page[] = pagesRes?.content ?? pagesRes ?? [];
                    pageList.forEach((p) => {
                        basePages.push({
                            ...p,
                            chapterName: ch.chapterName,
                            chapterNumber: ch.chapterNumber,
                        });
                    });
                    if (cancelled) return;
                }

                basePages.sort((a, b) => {
                    const c1 = a.chapterNumber ?? 0;
                    const c2 = b.chapterNumber ?? 0;
                    if (c1 !== c2) return c1 - c2;
                    return (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
                });
                if (cancelled) return;

                // 4. Enrich (marker, audio, illustration)
                const audioCache: Record<string, Audio> = {};
                const illustrationCache: Record<string, Illustration> = {};
                const enriched: EnrichedPage[] = [];

                for (const p of basePages) {
                    if (!p.pageId) {
                        enriched.push(p);
                        continue;
                    }
                    const pageId = p.pageId;

                    // marker
                    let hasMarker = false;
                    let markerImageUrl: string | null = null;
                    try {
                        const markerRes = await searchMarkers({ pageId, page: 0, size: 1 });
                        const marker = markerRes?.content?.[0];
                        if (marker) {
                            hasMarker = true;
                            markerImageUrl = marker.printablePdfUrl || marker.imageUrl || null;
                        }
                    } catch (err) {
                        console.error("Lỗi searchMarkers pageId=", pageId, err);
                    }

                    // audio
                    let audio: Audio | null = null;
                    try {
                        const paRes = await searchPageAudios({ pageId, page: 0, size: 1 });
                        const rel = paRes?.content?.[0];
                        if (rel?.audioId) {
                            if (audioCache[rel.audioId]) audio = audioCache[rel.audioId];
                            else {
                                const a = await getAudioById(rel.audioId);
                                audioCache[rel.audioId] = a;
                                audio = a;
                            }
                        }
                    } catch (err) {
                        console.error("Lỗi searchPageAudios pageId=", pageId, err);
                    }

                    // illustration
                    let illustration: Illustration | null = null;
                    try {
                        const piRes = await searchPageIllustrations({ pageId, page: 0, size: 1 });
                        const relIllus = piRes?.content?.[0];
                        if (relIllus?.illustrationId) {
                            const illusId = relIllus.illustrationId;
                            if (illustrationCache[illusId]) illustration = illustrationCache[illusId];
                            else {
                                const ill = await getIllustrationById(illusId);
                                illustrationCache[illusId] = ill;
                                illustration = ill;
                            }
                        }
                    } catch (err) {
                        console.error("Lỗi searchPageIllustrations pageId=", pageId, err);
                    }

                    enriched.push({
                        ...p,
                        hasMarker,
                        markerImageUrl,
                        audio,
                        illustration,
                    });

                    if (cancelled) return;
                }

                setPages(enriched);
                setCurrentIndex(0);
                setActiveAudioPageId(null);
            } catch (e) {
                console.error("Lỗi khi tải dữ liệu preview sách:", e);
                if (!cancelled) {
                    setError("Không thể tải dữ liệu sách.");
                    toast({
                        title: "Lỗi",
                        description: "Không thể tải dữ liệu sách. Vui lòng thử lại sau.",
                        variant: "destructive",
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookId]);

    const totalPages = pages.length;
    const canPrev = currentIndex > 0;
    const canNext = currentIndex + 2 < totalPages;

    const leftPage = useMemo(
        () => pages[currentIndex] ?? null,
        [pages, currentIndex]
    );
    const rightPage = useMemo(
        () => pages[currentIndex + 1] ?? null,
        [pages, currentIndex]
    );

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 2 >= 0 ? prev - 2 : 0));
        setActiveAudioPageId(null);
    };

    const handleNext = () => {
        setCurrentIndex((prev) =>
            prev + 2 < totalPages ? prev + 2 : prev
        );
        setActiveAudioPageId(null);
    };

    const handleToggleAudio = (pageId?: string) => {
        if (!pageId) return;
        setActiveAudioPageId((prev) => (prev === pageId ? null : pageId));
    };

    const getDisplayUrl = (url?: string | null) => {
        if (!url) return "";
        if (url.startsWith("gs://")) {
            const parts = url.split("/");
            const bucket = parts[2];
            const path = parts.slice(3).join("/");
            return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
                path
            )}?alt=media`;
        }
        return url;
    };

    //  handler duyệt / từ chối: lưu cả review + publicationStatus
    const handleModerate = async (newStatus: number) => {
        if (!book) return;

        try {
            const payload: Partial<Book> = {
                review: reviewText,
                publicationStatus: newStatus,
            };

            const updated = await updateBook(book.bookId, payload);

            setBook(updated);
            setReviewText(updated.review ?? "");

            toast({
                title: newStatus === 2 ? "Đã duyệt sách" : "Đã từ chối sách",
                description:
                    newStatus === 2
                        ? "Tác phẩm đã được duyệt thành công."
                        : "Tác phẩm đã bị từ chối.",
            });

            //  Sau khi duyệt / từ chối xong, quay về trang moderator
            navigate("/moderator");

        } catch (err) {
            console.error("Lỗi duyệt sách:", err);
            toast({
                title: "Thao tác thất bại",
                description: "Không thể cập nhật trạng thái sách. Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    };

    return (
        <ModeratorLayout
            title="Xem sách"
            breadcrumb={[
                { label: "Moderator", to: "/moderator" },
                { label: "Books", to: "/moderator/books" },
                { label: book?.bookName ?? "Chi tiết sách" },
            ]}
        >
            <main className="px-6 py-5 bg-[#020617] rounded-xl">
                {loading && (
                    <div className="flex h-64 items-center justify-center text-gray-300">
                        Đang tải dữ liệu sách...
                    </div>
                )}

                {!loading && error && (
                    <div className="flex h-64 items-center justify-center text-red-400">
                        {error}
                    </div>
                )}

                {!loading && !error && book && (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Info panel (left) */}
                        <div className="w-full lg:w-72 xl:w-80 bg-[#0b1120] border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                            <div className="flex gap-3">
                                <div className="w-20 h-28 rounded-md overflow-hidden bg-white/5 shadow">
                                    {book.coverUrl ? (
                                        <img
                                            src={getDisplayUrl(book.coverUrl)}
                                            alt={book.bookName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                            No Cover
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm text-gray-400 flex items-center gap-1">
                                        <BookOpen className="w-4 h-4 text-purple-400" />
                                        <span>Tác phẩm</span>
                                    </div>
                                    <div className="text-base font-semibold text-white line-clamp-2">
                                        {book.bookName}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400 line-clamp-3">
                                        {book.decription || "Chưa có mô tả."}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-3">
                                <div className="text-xs text-gray-400 mb-2">
                                    Chương ({chapters.length})
                                </div>
                                <div className="max-h-40 overflow-auto space-y-1 pr-1">
                                    {chapters.map((ch) => (
                                        <div
                                            key={ch.chapterId}
                                            className="text-xs text-gray-300 rounded px-2 py-1 flex justify-between items-center"
                                        >
                                            <span className="truncate">
                                                Chương {ch.chapterNumber}: {ch.chapterName}
                                            </span>
                                        </div>
                                    ))}
                                    {chapters.length === 0 && (
                                        <div className="text-xs text-gray-500">
                                            Chưa có chương nào.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-xs text-gray-400 border-t border-white/10 pt-2">
                                <div>Tổng số trang: {totalPages}</div>
                                <div>
                                    Đang xem:{" "}
                                    {totalPages > 0
                                        ? `${currentIndex + 1}${currentIndex + 2 <= totalPages
                                            ? " - " + (currentIndex + 2)
                                            : ""
                                        }`
                                        : "-"}
                                </div>
                            </div>

                            {/* Ô review + nút duyệt / từ chối */}
                            <div className="border-t border-white/10 pt-3 mt-1 space-y-2">
                                <div className="text-xs text-gray-400">Nhận xét về sách</div>
                                <Textarea
                                    rows={4}
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    className="bg-white/5 border-white/20 text-sm text-gray-100"
                                    placeholder="Nhập nhận xét / lý do duyệt hoặc từ chối..."
                                />
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleModerate(4)}   //  từ chối -> 4
                                    >
                                        Từ chối sách
                                    </Button>
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                        onClick={() => handleModerate(2)}   //  duyệt -> 2
                                    >
                                        Duyệt sách
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Flipbook (right) */}
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Navigation */}
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-300 flex items-center gap-2">
                                    <span>Xem dạng sách lật</span>
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <MapPin className="w-3 h-3 text-purple-400" /> marker
                                        <span className="w-1 h-1 rounded-full bg-gray-500 mx-1" />
                                        <Volume2 className="w-3 h-3 text-emerald-400" /> audio
                                        <span className="w-1 h-1 rounded-full bg-gray-500 mx-1" />
                                        <ImageIcon className="w-3 h-3 text-blue-400" /> illustration
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={!canPrev}
                                        onClick={handlePrev}
                                        className={`border-white/20 text-white bg-transparent hover:bg-white/10 ${!canPrev ? "opacity-40 cursor-not-allowed" : ""
                                            }`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        disabled={!canNext}
                                        onClick={handleNext}
                                        className={`border-white/20 text-white bg-transparent hover:bg-white/10 ${!canNext ? "opacity-40 cursor-not-allowed" : ""
                                            }`}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Book pages */}
                            <div className="flex-1 flex justify-center items-stretch">
                                {totalPages === 0 ? (
                                    <div className="flex items-center justify-center text-gray-400">
                                        Chưa có trang nào trong sách.
                                    </div>
                                ) : (
                                    <div className="flex gap-4 max-w-5xl w-full h-[70vh]">
                                        <PageCard
                                            page={leftPage}
                                            side="left"
                                            activeAudioPageId={activeAudioPageId}
                                            onToggleAudio={handleToggleAudio}
                                            getDisplayUrl={getDisplayUrl}
                                        />
                                        <PageCard
                                            page={rightPage}
                                            side="right"
                                            activeAudioPageId={activeAudioPageId}
                                            onToggleAudio={handleToggleAudio}
                                            getDisplayUrl={getDisplayUrl}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </ModeratorLayout>
    );
}

/* ==== PageCard giữ nguyên y như AuthorBookPreview ==== */
type PageCardProps = {
    page: EnrichedPage | null;
    side: "left" | "right";
    activeAudioPageId: string | null;
    onToggleAudio: (pageId?: string) => void;
    getDisplayUrl: (url?: string | null) => string;
};

function PageCard({
    page,
    side,
    activeAudioPageId,
    onToggleAudio,
    getDisplayUrl,
}: PageCardProps) {
    if (!page) {
        return (
            <div
                className={`flex-1 bg-linear-to-br from-[#020617] to-[#020617] border border-dashed border-white/10 rounded-xl shadow-inner flex items-center justify-center text-xs text-gray-500 ${side === "left" ? "origin-right" : "origin-left"
                    }`}
            >
                Trang trống
            </div>
        );
    }

    const hasMarker = !!page.hasMarker;
    const audio = page.audio ?? null;
    const illustration = page.illustration ?? null;
    const isPlaying = activeAudioPageId === page.pageId;
    const isPicturePage = page.pageType === "PICTURE";

    const audioSrc = audio ? getDisplayUrl(audio.audioUrl) : "";
    const illustrationSrc = illustration
        ? getDisplayUrl(illustration.imageUrl)
        : "";

    const contentLooksLikeUrl =
        typeof page.content === "string" &&
        (page.content.trim().startsWith("http://") ||
            page.content.trim().startsWith("https://") ||
            page.content.trim().startsWith("gs://"));

    const contentImageSrc =
        isPicturePage && contentLooksLikeUrl
            ? getDisplayUrl(page.content.trim())
            : "";

    const isHtmlContent =
        !isPicturePage &&
        typeof page.content === "string" &&
        /<\/?[a-z][\s\S]*>/i.test(page.content);

    return (
        <div
            className={`
        flex-1 relative 
        bg-linear-to-br from-[#020617] to-[#020617] 
        border border-white/10 rounded-xl 
        shadow-xl overflow-hidden 
        px-4 py-4 
        flex flex-col
        ${side === "left"
                    ? "origin-right shadow-[15px_0_35px_rgba(0,0,0,0.6)]"
                    : "origin-left shadow-[-15px_0_35px_rgba(0,0,0,0.6)]"
                }
      `}
        >
            <div className="absolute top-2 right-2 flex gap-1">
                {!isPicturePage && (illustration || contentImageSrc) && (
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600/90 text-white shadow">
                        <ImageIcon className="w-4 h-4" />
                    </div>
                )}
                {hasMarker && (
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-600/90 text-white shadow">
                        <MapPin className="w-4 h-4" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="text-xs text-purple-300 font-medium truncate">
                        Chương {page.chapterNumber}: {page.chapterName}
                    </div>

                    {audio && (
                        <button
                            type="button"
                            onClick={() => onToggleAudio(page.pageId)}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full shadow shrink-0 ${isPlaying
                                ? "bg-emerald-500 text-white"
                                : "bg-emerald-600/90 text-white hover:bg-emerald-500"
                                }`}
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="text-xs text-gray-400 whitespace-nowrap">
                    Trang {page.pageNumber}
                </div>
            </div>

            <div className="border-t border-white/10 my-2" />

            {(illustrationSrc || contentImageSrc) && (
                <div className="mb-3 rounded-md overflow-hidden bg-black/30 max-h-64">
                    <img
                        src={illustrationSrc || contentImageSrc}
                        alt={illustration?.title || `Trang ${page.pageNumber}`}
                        className="w-full h-full object-contain"
                    />
                </div>
            )}

            {!isPicturePage && (
                <div className="flex-1 overflow-auto pr-1">
                    {isHtmlContent ? (
                        <div
                            className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    ) : (
                        <div className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed">
                            {page.content}
                        </div>
                    )}
                </div>
            )}

            {audio && audioSrc && isPlaying && (
                <div className="mt-3 border-t border-white/10 pt-2">
                    <audio src={audioSrc} controls autoPlay className="w-full">
                        Trình duyệt của bạn không hỗ trợ audio.
                    </audio>
                </div>
            )}
        </div>
    );
}

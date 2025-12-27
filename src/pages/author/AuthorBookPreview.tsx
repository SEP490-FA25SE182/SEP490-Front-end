import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  MapPin,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";

import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { getBookById, type Book } from "@/services/BookService";
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

  // marker image để hiển thị thumbnail + zoom
  markerImageUrl?: string | null;

  // optional: nếu bạn vẫn muốn lưu pdf link
  markerPdfUrl?: string | null;
}

type LocationState = {
  book?: Book;
};

// helper escape text khi nhét vào HTML .doc
const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export default function AuthorBookPreview() {
  const { bookId } = useParams<{ bookId: string }>();
  const location = useLocation() as { state?: LocationState };
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [book, setBook] = useState<Book | null>(location.state?.book ?? null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [pages, setPages] = useState<EnrichedPage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeAudioPageId, setActiveAudioPageId] = useState<string | null>(
    null
  );

  // ✅ modal zoom marker
  const [zoomMarkerUrl, setZoomMarkerUrl] = useState<string | null>(null);
  const [zoomMarkerTitle, setZoomMarkerTitle] = useState<string>("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomMarkerUrl(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  //  EXPORT FILE .DOC (nhúng ảnh base64, giữ nguyên rich text, có trang bìa, KHÔNG hiện "Trang X")
  const handleExportDoc = async () => {
    if (!book) {
      toast({
        title: "Không có sách",
        description: "Không tìm thấy thông tin sách để xuất DOC.",
        variant: "destructive",
      });
      return;
    }
    if (pages.length === 0) {
      toast({
        title: "Chưa có trang",
        description: "Sách chưa có trang nào để xuất DOC.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Đang xuất file .doc",
      description: "Tệp đang được tạo, vui lòng chờ trong giây lát...",
    });

    try {
      const loadImageAsDataUrl = async (rawUrl: string): Promise<string | null> => {
        try {
          const url = getDisplayUrl(rawUrl);
          if (!url) return null;
          const res = await fetch(url);
          const blob = await res.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error("Không tải được ảnh cho DOC:", e, rawUrl);
          return null;
        }
      };

      const embedImagesInHtml = async (htmlContent: string): Promise<string> => {
        try {
          const imgSrcRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

          const urls = new Set<string>();
          let match: RegExpExecArray | null;

          while ((match = imgSrcRegex.exec(htmlContent)) !== null) {
            const src = match[1];
            if (!src.startsWith("data:")) {
              urls.add(src);
            }
          }

          if (urls.size === 0) return htmlContent;

          const map: Record<string, string> = {};
          for (const src of urls) {
            const dataUrl = await loadImageAsDataUrl(src);
            if (dataUrl) map[src] = dataUrl;
          }

          let result = htmlContent;
          for (const [src, dataUrl] of Object.entries(map)) {
            result = result.split(src).join(dataUrl);
          }

          return result;
        } catch (e) {
          console.error("Lỗi khi embed ảnh trong HTML content:", e);
          return htmlContent;
        }
      };

      const sortedPages = [...pages].sort((a, b) => {
        const c1 = a.chapterNumber ?? 0;
        const c2 = b.chapterNumber ?? 0;
        if (c1 !== c2) return c1 - c2;
        return (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
      });

      const filenameBase = (book.bookName || book.bookId || "book").replace(
        /[\\/:*?"<>|]+/g,
        "_"
      );

      const coverDataUrl = book.coverUrl
        ? await loadImageAsDataUrl(book.coverUrl)
        : null;

      let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(book.bookName || "Book")}</title>
<style>
  body { font-family: "Times New Roman", Arial, sans-serif; line-height: 1.5; font-size: 12pt; }
  .page-break { page-break-after: always; }
  .cover-title { text-align: center; font-size: 28pt; font-weight: bold; margin-top: 80px; }
  .cover-desc { max-width: 70%; margin: 24px auto 0 auto; text-align: center; }
  .cover-image { display: block; margin: 40px auto 0 auto; max-width: 60%; height: auto; }
  .chapter-title { font-size: 18pt; font-weight: bold; margin-top: 24px; }
  .page-content { margin-top: 8px; }
  .illustration { display:block; margin: 16px auto; max-width:80%; height:auto; }
  .marker { display:block; margin: 8px auto; max-width:120px; height:auto; }
</style>
</head>
<body>
`;

      html += `<div class="cover page-break">`;
      html += `<div class="cover-title">${escapeHtml(
        book.bookName || "Không tên"
      )}</div>`;
      if (book.decription) {
        html += `<div class="cover-desc">${escapeHtml(book.decription)}</div>`;
      }
      if (coverDataUrl) {
        html += `<img class="cover-image" src="${coverDataUrl}" alt="${escapeHtml(
          book.bookName || "Cover"
        )}" />`;
      }
      html += `</div>`;

      let currentChapterId: string | undefined;

      for (const p of sortedPages) {
        html += `<div class="page">`;

        const isPicturePage = p.pageType === "PICTURE";

        if (p.chapterId !== currentChapterId) {
          currentChapterId = p.chapterId;
          html += `<div class="chapter-title">Chương ${p.chapterNumber ?? ""}: ${escapeHtml(
            p.chapterName ?? ""
          )}</div>`;
        }

        if (!isPicturePage && typeof p.content === "string") {
          const content = p.content.trim();
          if (content) {
            const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);
            if (isHtml) {
              const processed = await embedImagesInHtml(content);
              html += `<div class="page-content">${processed}</div>`;
            } else {
              html += `<p class="page-content">${escapeHtml(content)}</p>`;
            }
          }
        }

        let illustrationRaw: string | null = null;
        if (p.illustration?.imageUrl) {
          illustrationRaw = p.illustration.imageUrl;
        } else if (isPicturePage && typeof p.content === "string") {
          const raw = p.content.trim();
          if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("gs://")) {
            illustrationRaw = raw;
          }
        }

        if (illustrationRaw) {
          const illusDataUrl = await loadImageAsDataUrl(illustrationRaw);
          if (illusDataUrl) {
            html += `<img class="illustration" src="${illusDataUrl}" alt="${escapeHtml(
              p.illustration?.title || `Trang ${p.pageNumber}`
            )}" />`;
          }
        } else if (isPicturePage) {
          html += `<p class="page-content">[Trang ảnh]</p>`;
        }

        // marker image (nếu có)
        if (p.markerImageUrl) {
          const markerDataUrl = await loadImageAsDataUrl(p.markerImageUrl);
          if (markerDataUrl) {
            html += `<img class="marker" src="${markerDataUrl}" alt="Marker trang ${p.pageNumber}" />`;
          }
        }

        html += `</div><div class="page-break"></div>`;
      }

      html += `</body></html>`;

      const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Xuất file thành công",
        description:
          "Tệp .doc đã được tạo và tải về. Vui lòng kiểm tra thư mục tải về của trình duyệt.",
      });
    } catch (e) {
      console.error("Lỗi khi xuất DOC:", e);
      toast({
        title: "Xuất file thất bại",
        description: "Không thể xuất file .doc. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let currentBook = location.state?.book as Book | undefined;
        if (!currentBook) {
          currentBook = await getBookById(bookId);
        }
        if (cancelled) return;
        setBook(currentBook);

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

        const audioCache: Record<string, Audio> = {};
        const illustrationCache: Record<string, Illustration> = {};
        const enriched: EnrichedPage[] = [];

        for (const p of basePages) {
          if (!p.pageId) {
            enriched.push(p);
            continue;
          }
          const pageId = p.pageId;

          // --- Marker theo page ---
          let hasMarker = false;
          let markerImageUrl: string | null = null;
          let markerPdfUrl: string | null = null;

          try {
            const markerRes = await searchMarkers({
              pageId,
              page: 0,
              size: 1,
            });

            const marker = markerRes?.content?.[0];
            if (marker) {
              hasMarker = true;

              // ✅ ưu tiên IMAGE để hiển thị trong preview
              markerImageUrl = marker.imageUrl || null;

              // optional
              markerPdfUrl = marker.printablePdfUrl || null;
            }
          } catch (err) {
            console.error("Lỗi searchMarkers pageId=", pageId, err);
          }

          // --- Audio theo page ---
          let audio: Audio | null = null;
          try {
            const paRes = await searchPageAudios({
              pageId,
              page: 0,
              size: 1,
            });
            const rel = paRes?.content?.[0];
            if (rel?.audioId) {
              if (audioCache[rel.audioId]) {
                audio = audioCache[rel.audioId];
              } else {
                const a = await getAudioById(rel.audioId);
                audioCache[rel.audioId] = a;
                audio = a;
              }
            }
          } catch (err) {
            console.error("Lỗi searchPageAudios pageId=", pageId, err);
          }

          // --- Illustration theo page ---
          let illustration: Illustration | null = null;
          try {
            const piRes = await searchPageIllustrations({
              pageId,
              page: 0,
              size: 1,
            });
            const relIllus = piRes?.content?.[0];
            if (relIllus?.illustrationId) {
              const illusId = relIllus.illustrationId;
              if (illustrationCache[illusId]) {
                illustration = illustrationCache[illusId];
              } else {
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
            markerPdfUrl,
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

  const leftPage = useMemo(() => pages[currentIndex] ?? null, [pages, currentIndex]);
  const rightPage = useMemo(() => pages[currentIndex + 1] ?? null, [pages, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 2 >= 0 ? prev - 2 : 0));
    setActiveAudioPageId(null);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 2 < totalPages ? prev + 2 : prev));
    setActiveAudioPageId(null);
  };

  const handleToggleAudio = (pageId?: string) => {
    if (!pageId) return;
    setActiveAudioPageId((prev) => (prev === pageId ? null : pageId));
  };

  const goBackToBooks = () => {
    navigate("/author/authorbooklist");
  };

  return (
    <div className="flex h-screen bg-[#0b1020]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#111827] border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen((v) => !v)}
                className="text-white hover:bg-white/10"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="w-6 h-6" />
                ) : (
                  <ChevronRight className="w-6 h-6" />
                )}
              </Button>
              <div>
                <div className="flex items-center gap-2 text-white">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold">Xem sách (Author Preview)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-200 text-gray-800"
                onClick={handleExportDoc}
              >
                Xuất file
              </Button>

              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={goBackToBooks}
              >
                Quay lại danh sách sách
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-5 bg-[#020617]">
          {loading && (
            <div className="flex h-full items-center justify-center text-gray-300">
              Đang tải dữ liệu sách...
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full items-center justify-center text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && book && (
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* Info panel */}
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
                    <div className="text-sm text-gray-400">Tác phẩm</div>
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
                  <div className="max-h-56 overflow-auto space-y-1 pr-1">
                    {chapters.map((ch) => (
                      <div
                        key={ch.chapterId}
                        className="text-xs text-gray-300 bg.white/5 rounded px-2 py-1 flex justify-between items-center"
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

                <div className="mt-auto text-xs text-gray-400 border-t border-white/10 pt-2">
                  <div>Tổng số trang: {totalPages}</div>
                  <div>
                    Đang xem:{" "}
                    {totalPages > 0
                      ? `${currentIndex + 1}${
                          currentIndex + 2 <= totalPages
                            ? " - " + (currentIndex + 2)
                            : ""
                        }`
                      : "-"}
                  </div>
                </div>
              </div>

              {/* Flipbook */}
              <div className="flex-1 flex flex-col gap-4">
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
                      className={`border-white/20 text-white bg-transparent hover:bg-white/10 ${
                        !canPrev ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!canNext}
                      onClick={handleNext}
                      className={`border-white/20 text-white bg-transparent hover:bg-white/10 ${
                        !canNext ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex justify-center items-stretch">
                  {totalPages === 0 ? (
                    <div className="flex items-center justify-center text-gray-400">
                      Chưa có trang nào trong sách.
                    </div>
                  ) : (
                    <div className="flex gap-4 max-w-5xl w-full">
                      <PageCard
                        page={leftPage}
                        side="left"
                        activeAudioPageId={activeAudioPageId}
                        onToggleAudio={handleToggleAudio}
                        getDisplayUrl={getDisplayUrl}
                        onMarkerZoom={(rawUrl, title) => {
                          const url = getDisplayUrl(rawUrl);
                          setZoomMarkerTitle(title || "Marker");
                          setZoomMarkerUrl(url);
                        }}
                      />
                      <PageCard
                        page={rightPage}
                        side="right"
                        activeAudioPageId={activeAudioPageId}
                        onToggleAudio={handleToggleAudio}
                        getDisplayUrl={getDisplayUrl}
                        onMarkerZoom={(rawUrl, title) => {
                          const url = getDisplayUrl(rawUrl);
                          setZoomMarkerTitle(title || "Marker");
                          setZoomMarkerUrl(url);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ✅ MODAL ZOOM MARKER */}
          {zoomMarkerUrl && (
            <div
              className="fixed inset-0 z-999 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setZoomMarkerUrl(null)}
            >
              <div
                className="relative max-w-4xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setZoomMarkerUrl(null)}
                  className="absolute -top-3 -right-3 bg-white text-black rounded-full w-9 h-9 shadow flex items-center justify-center"
                  aria-label="Close"
                >
                  ✕
                </button>

                <div className="bg-black/30 border border-white/20 rounded-xl p-3 shadow-xl">
                  <div className="text-sm text-gray-200 font-medium mb-2 text-center">
                    {zoomMarkerTitle}
                  </div>
                  <img
                    src={zoomMarkerUrl}
                    alt={zoomMarkerTitle}
                    className="w-full max-h-[80vh] object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

type PageCardProps = {
  page: EnrichedPage | null;
  side: "left" | "right";
  activeAudioPageId: string | null;
  onToggleAudio: (pageId?: string) => void;
  getDisplayUrl: (url?: string | null) => string;

  // ✅ click marker thumbnail -> zoom
  onMarkerZoom: (markerRawUrl: string, title?: string) => void;
};

function PageCard({
  page,
  side,
  activeAudioPageId,
  onToggleAudio,
  getDisplayUrl,
  onMarkerZoom,
}: PageCardProps) {
  if (!page) {
    return (
      <div
        className={`flex-1 bg-linear-to-br from-[#020617] to-[#020617] border border-dashed border-white/10 rounded-xl shadow-inner flex items-center justify-center text-xs text-gray-500 ${
          side === "left" ? "origin-right" : "origin-left"
        }`}
      >
        Trang trống
      </div>
    );
  }

  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    const u = url.trim();
    return (
      u.startsWith("gs://") ||
      u.includes("firebasestorage.googleapis.com") ||
      /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(u)
    );
  };

  const hasMarker = !!page.hasMarker;
  const markerThumbRaw = page.markerImageUrl ?? null;
  const markerThumbOk = isImageUrl(markerThumbRaw);
  const markerThumbSrc = markerThumbOk ? getDisplayUrl(markerThumbRaw!) : "";

  const audio = page.audio ?? null;
  const illustration = page.illustration ?? null;
  const isPlaying = activeAudioPageId === page.pageId;
  const isPicturePage = page.pageType === "PICTURE";

  const audioSrc = audio ? getDisplayUrl(audio.audioUrl) : "";
  const illustrationSrc = illustration ? getDisplayUrl(illustration.imageUrl) : "";

  const contentLooksLikeUrl =
    typeof page.content === "string" &&
    (page.content.trim().startsWith("http://") ||
      page.content.trim().startsWith("https://") ||
      page.content.trim().startsWith("gs://"));

  const contentImageSrc =
    isPicturePage && contentLooksLikeUrl ? getDisplayUrl(page.content.trim()) : "";

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
        ${
          side === "left"
            ? "origin-right shadow-[15px_0_35px_rgba(0,0,0,0.6)]"
            : "origin-left shadow-[-15px_0_35px_rgba(0,0,0,0.6)]"
        }
      `}
    >
      {/* Icons */}
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

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs text-purple-300 font-medium truncate">
            Chương {page.chapterNumber}: {page.chapterName}
          </div>

          {audio && (
            <button
              type="button"
              onClick={() => onToggleAudio(page.pageId)}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full shadow shrink-0 ${
                isPlaying
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

      {/* Illustration / Picture */}
      {(illustrationSrc || contentImageSrc) && (
        <div className="mb-3 rounded-md overflow-hidden bg-black/30 max-h-64 relative">
          <img
            src={illustrationSrc || contentImageSrc}
            alt={illustration?.title || `Trang ${page.pageNumber}`}
            className="w-full h-full object-contain"
          />

          {/* ✅ Marker thumbnail overlay (chỉ show cho trang ảnh PICTURE có marker) */}
          {isPicturePage && hasMarker && markerThumbSrc && (
            <button
              type="button"
              onClick={() =>
                onMarkerZoom(
                  markerThumbRaw!,
                  `Marker - Trang ${page.pageNumber}`
                )
              }
              className="absolute top-2 right-2 z-10 cursor-zoom-in rounded-md overflow-hidden border border-white/30 bg-black/30 backdrop-blur-sm shadow-lg hover:scale-[1.03] transition"
              title="Xem marker"
            >
              <img
                src={markerThumbSrc}
                alt={`Marker trang ${page.pageNumber}`}
                className="w-16 h-16 object-contain p-1"
              />
            </button>
          )}
        </div>
      )}

      {/* Content text */}
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

      {/* Audio player */}
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

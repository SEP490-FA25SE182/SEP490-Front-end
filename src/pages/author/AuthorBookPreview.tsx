import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import jsPDF from "jspdf";
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
  markerImageUrl?: string | null;
}

type LocationState = {
  book?: Book;
};

// helper: convert ArrayBuffer -> base64 (để add font vào jsPDF VFS)
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ HÀM EXPORT PDF (có hỗ trợ ảnh + marker)
  const handleExportPdf = async () => {
    if (!book) {
      toast({
        title: "Không có sách",
        description: "Không tìm thấy thông tin sách để xuất PDF.",
        variant: "destructive",
      });
      return;
    }
    if (pages.length === 0) {
      toast({
        title: "Chưa có trang",
        description: "Sách chưa có trang nào để xuất PDF.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    // ====== 1) NẠP FONT TIẾNG VIỆT ======
    try {
      const fontUrl = "/fonts/NotoSans-VariableFont_wdth,wght.ttf";
      const fontBuffer = await fetch(fontUrl).then((r) => r.arrayBuffer());
      const fontBase64 = arrayBufferToBase64(fontBuffer);

      (doc as any).addFileToVFS(
        "NotoSans-VariableFont_wdth,wght.ttf",
        fontBase64
      );
      (doc as any).addFont(
        "NotoSans-VariableFont_wdth,wght.ttf",
        "NotoSans",
        "normal"
      );

      doc.setFont("NotoSans", "normal");
    } catch (e) {
      console.error("Không load được font NotoSans:", e);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    const marginY = 60;
    const lineHeight = 16;

    let cursorY = marginY;
    const maxWidth = pageWidth - marginX * 2;

    const ensureNewPage = () => {
      if (cursorY > pageHeight - marginY) {
        doc.addPage();
        cursorY = marginY;
      }
    };

    const addParagraph = (
      text: string,
      opts?: { bold?: boolean; fontSize?: number }
    ) => {
      if (!text) return;

      const fontSize = opts?.fontSize ?? 11;
      doc.setFontSize(fontSize);
      doc.setFont("NotoSans", "normal"); // nếu muốn bold thật thì add thêm file font bold

      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        ensureNewPage();
        doc.text(line, marginX, cursorY);
        cursorY += lineHeight;
      });
      cursorY += 4;
    };

    // ✅ helper: tải ảnh (illustration / marker) về dạng dataURL
    const loadImageAsDataUrl = async (
      rawUrl: string
    ): Promise<string | null> => {
      try {
        // dùng lại quy tắc gs:// -> https
        const url = getDisplayUrl(rawUrl);
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Không tải được ảnh cho PDF:", e);
        return null;
      }
    };

    // ✅ block ảnh minh hoạ lớn (CĂN GIỮA)
    const addImageBlock = async (rawUrl: string, maxHeight = 260) => {
      const dataUrl = await loadImageAsDataUrl(rawUrl);
      if (!dataUrl) return;

      const imgProps = (doc as any).getImageProperties(dataUrl);
      let imgWidth = maxWidth;
      let imgHeight = (imgWidth * imgProps.height) / imgProps.width;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (imgHeight * imgProps.width) / imgProps.height;
      }

      ensureNewPage();
      if (cursorY + imgHeight > pageHeight - marginY) {
        doc.addPage();
        cursorY = marginY;
      }

      // 🔹 Căn giữa theo chiều ngang trong vùng maxWidth
      const startX = marginX + (maxWidth - imgWidth) / 2;

      doc.addImage(dataUrl, "PNG", startX, cursorY, imgWidth, imgHeight);
      cursorY += imgHeight + 8;
    };

    // ✅ block marker nhỏ (ở góc phải)
    const addMarkerImage = async (rawUrl: string) => {
      const dataUrl = await loadImageAsDataUrl(rawUrl);
      if (!dataUrl) return;

      const size = 80; // px
      ensureNewPage();
      if (cursorY + size > pageHeight - marginY) {
        doc.addPage();
        cursorY = marginY;
      }

      const x = pageWidth - marginX - size;
      doc.addImage(dataUrl, "PNG", x, cursorY, size, size);
      cursorY += size + 8;
    };

    // ==== TIÊU ĐỀ SÁCH ====
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(18);
    doc.text(book.bookName || "Không tên", marginX, cursorY);
    cursorY += lineHeight * 1.5;

    // Mô tả sách
    if (book.decription) {
      addParagraph(book.decription, { fontSize: 12 });
      cursorY += lineHeight;
    }

    // Sort pages
    const sortedPages = [...pages].sort((a, b) => {
      const c1 = a.chapterNumber ?? 0;
      const c2 = b.chapterNumber ?? 0;
      if (c1 !== c2) return c1 - c2;
      return (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
    });

    let currentChapterId: string | undefined;

    // dùng for...of để await được
    for (const p of sortedPages) {
      // Heading chương
      if (p.chapterId !== currentChapterId) {
        currentChapterId = p.chapterId;
        cursorY += lineHeight;
        addParagraph(
          `Chương ${p.chapterNumber ?? ""}: ${p.chapterName ?? ""}`,
          { fontSize: 14 }
        );
      }

      // Tiêu đề trang
      addParagraph(`Trang ${p.pageNumber}`, { fontSize: 12 });

      const isPicturePage = p.pageType === "PICTURE";

      // Nội dung text (chỉ cho trang chữ)
      let content = "";
      if (!isPicturePage && typeof p.content === "string") {
        content = p.content.replace(/<\/?[^>]+(>|$)/g, "");
      }
      if (content) {
        addParagraph(content, { fontSize: 11 });
      }

      // Ảnh minh hoạ (illustration entity hoặc URL trong content nếu là trang ảnh)
      let illustrationUrl: string | null = null;

      if (p.illustration?.imageUrl) {
        illustrationUrl = p.illustration.imageUrl;
      } else if (isPicturePage && typeof p.content === "string") {
        const raw = p.content.trim();
        if (
          raw.startsWith("http://") ||
          raw.startsWith("https://") ||
          raw.startsWith("gs://")
        ) {
          illustrationUrl = raw;
        }
      }

      if (illustrationUrl) {
        await addImageBlock(illustrationUrl);
      } else if (isPicturePage) {
        // fallback nếu không lấy được ảnh
        addParagraph("[Trang ảnh]", { fontSize: 11 });
      }

      // Marker (nếu có)
      if (p.markerImageUrl) {
        await addMarkerImage(p.markerImageUrl);
      }

      cursorY += 4;
    }

    const filenameBase = (book.bookName || book.bookId || "book").replace(
      /[\\/:*?"<>|]+/g,
      "_"
    );
    doc.save(`${filenameBase}.pdf`);
  };

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Lấy book detail (ưu tiên state từ navigate, fallback gọi API)
        let currentBook = location.state?.book as Book | undefined;
        if (!currentBook) {
          currentBook = await getBookById(bookId);
        }
        if (cancelled) return;
        setBook(currentBook);

        // 2. Lấy chapters của book (không gửi sort cho BE)
        const chaptersRes: any = await getAllChapters({
          bookId,
          page: 0,
          size: 200,
        });
        let chapterList: Chapter[] = chaptersRes?.content ?? chaptersRes ?? [];

        // sort chapter ở FE
        chapterList = [...chapterList].sort(
          (a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0)
        );

        if (cancelled) return;
        setChapters(chapterList);

        // 3. Lấy pages cho từng chapter (không gửi sort cho BE)
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

        // Sort theo chapterNumber + pageNumber ở FE (đoạn này giữ nguyên)
        basePages.sort((a, b) => {
          const c1 = a.chapterNumber ?? 0;
          const c2 = b.chapterNumber ?? 0;
          if (c1 !== c2) return c1 - c2;
          return (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
        });

        if (cancelled) return;

        // 4. Enrich từng page với marker, audio, illustration
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

          try {
            const markerRes = await searchMarkers({
              pageId,
              page: 0,
              size: 1,
            });

            const marker = markerRes?.content?.[0];
            if (marker) {
              hasMarker = true;
              // ưu tiên file pdf in ấn, fallback sang imageUrl
              markerImageUrl =
                marker.printablePdfUrl || marker.imageUrl || null;
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

  const goBackToBooks = () => {
    navigate("/author/authorbooklist");
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

  return (
    <div className="flex h-screen bg-[#0b1020]">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
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
                  <span className="font-semibold">
                    Xem sách (Author Preview)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-gray-200 text-gray-800"
                onClick={handleExportPdf}
              >
                Xuất PDF
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

        {/* Content */}
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

                {/* Book pages */}
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
        className={`flex-1 bg-linear-to-br from-[#020617] to-[#020617] border border-dashed border-white/10 rounded-xl shadow-inner flex items-center justify-center text-xs text-gray-500 ${
          side === "left" ? "origin-right" : "origin-left"
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

  // content là URL ảnh (dùng cho trang ảnh không có bản ghi illustration)
  const contentLooksLikeUrl =
    typeof page.content === "string" &&
    (page.content.trim().startsWith("http://") ||
      page.content.trim().startsWith("https://") ||
      page.content.trim().startsWith("gs://"));

  const contentImageSrc =
    isPicturePage && contentLooksLikeUrl
      ? getDisplayUrl(page.content.trim())
      : "";

  // content là HTML (dùng cho trang chữ)
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
      {/* Marker / Audio / Illustration icons */}
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
        {audio && (
          <button
            type="button"
            onClick={() => onToggleAudio(page.pageId)}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full shadow ${
              isPlaying
                ? "bg-emerald-500 text-white"
                : "bg-emerald-600/90 text-white hover:bg-emerald-500"
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Header: chapter + page number */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-purple-300 font-medium truncate">
          Chương {page.chapterNumber}: {page.chapterName}
        </div>
        <div className="text-xs text-gray-400">Trang {page.pageNumber}</div>
      </div>

      <div className="border-t border-white/10 my-2" />

      {/* Illustration (ưu tiên bản ghi illustration, fallback sang URL trong content nếu là trang ảnh) */}
      {(illustrationSrc || contentImageSrc) && (
        <div className="mb-3 rounded-md overflow-hidden bg-black/30 max-h-64">
          <img
            src={illustrationSrc || contentImageSrc}
            alt={illustration?.title || `Trang ${page.pageNumber}`}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Content text (ẩn với trang ảnh, chỉ hiện với trang chữ) */}
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

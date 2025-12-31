import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  PanelLeftClose, PanelLeftOpen,
  Image as ImageIcon,
  MapPin,
  Volume2,
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
  getAudioById,
  getIllustrationById,
  searchPageAudios,
  searchPageIllustrations,
  type Audio,
  type Illustration,
} from "@/services/AIService";
import { searchMarkers } from "@/services/ARService";

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  TextRun,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeightRule,
  VerticalAlign,
} from "docx";
import { saveAs } from "file-saver";

/* =========================
   Types
========================= */
type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];
type AlignmentTypeValue = (typeof AlignmentType)[keyof typeof AlignmentType];

interface EnrichedPage extends Page {
  chapterName?: string;
  chapterNumber?: number;
  audio?: Audio | null;
  illustration?: Illustration | null;
  hasMarker?: boolean;

  // marker image để hiển thị thumbnail + zoom + export
  markerImageUrl?: string | null;

  // optional (nếu muốn lưu pdf link)
  markerPdfUrl?: string | null;
}

type LocationState = {
  book?: Book;
};

type RasterImageType = "png" | "jpg" | "gif" | "bmp";

/* =========================
   Helpers
========================= */

function sanitizeHtmlBasic(html: string) {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, iframe, object, embed").forEach((el) => el.remove());

    const all = doc.querySelectorAll("*");
    all.forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = (attr.value || "").trim().toLowerCase();
        if (name.startsWith("on")) el.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && val.startsWith("javascript:")) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

const toFirebaseDisplayUrl = (url?: string | null) => {
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

const isLikelyHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);
const isLikelyUrl = (s: string) =>
  s.startsWith("http://") || s.startsWith("https://") || s.startsWith("gs://");

const isPdfUrl = (u: string) => u.toLowerCase().includes(".pdf");

/** limiter để tránh spam API */
function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    active--;
    const fn = queue.shift();
    if (fn) fn();
  };

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (active >= concurrency) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await task();
    } finally {
      next();
    }
  };
}

async function fetchAsUint8Array(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed: " + url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function getImageSize(url: string): Promise<{ w: number; h: number } | null> {
  try {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
    });
    return { w: img.naturalWidth || 0, h: img.naturalHeight || 0 };
  } catch {
    return null;
  }
}

function fitToBox(w: number, h: number, maxW: number, maxH: number) {
  if (w <= 0 || h <= 0) return { width: maxW, height: Math.round(maxW * 0.75) };
  const ratio = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function createDefaultNumbering() {
  return {
    config: [
      {
        reference: "bullet",
        levels: Array.from({ length: 9 }).map((_, level) => ({
          level,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
        })),
      },
      {
        reference: "number",
        levels: Array.from({ length: 9 }).map((_, level) => ({
          level,
          format: LevelFormat.DECIMAL,
          text: `%${level + 1}.`,
          alignment: AlignmentType.LEFT,
        })),
      },
    ],
  } as any; //  tương thích typings nhiều version
}

function parseStyle(styleStr?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!styleStr) return out;
  styleStr.split(";").forEach((part) => {
    const [k, v] = part.split(":").map((s) => s?.trim());
    if (k && v) out[k.toLowerCase()] = v;
  });
  return out;
}

function cssColorToHex(color?: string | null): string | undefined {
  if (!color) return undefined;
  const c = color.trim().toLowerCase();
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return (hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]).toUpperCase();
    }
    if (hex.length === 6) return hex.toUpperCase();
    return undefined;
  }
  const rgb = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) {
    const r = Math.max(0, Math.min(255, parseInt(rgb[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgb[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgb[3], 10)));
    return [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return undefined;
}

function cssFontSizeToHalfPoints(size?: string | null): number | undefined {
  if (!size) return undefined;
  const s = size.trim().toLowerCase();
  const px = s.match(/^(\d+(?:\.\d+)?)px$/);
  if (px) return Math.round(parseFloat(px[1]) * 0.75 * 2); // px -> pt -> half points
  const pt = s.match(/^(\d+(?:\.\d+)?)pt$/);
  if (pt) return Math.round(parseFloat(pt[1]) * 2);
  return undefined;
}

function textAlignToDocxAlign(v?: string | null): AlignmentTypeValue | undefined {
  if (!v) return undefined;
  const s = v.trim().toLowerCase();
  if (s === "center") return AlignmentType.CENTER;
  if (s === "right") return AlignmentType.RIGHT;
  if (s === "justify") return AlignmentType.JUSTIFIED;
  if (s === "left") return AlignmentType.LEFT;
  return undefined;
}

function guessImageType(url: string): RasterImageType {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "jpg";
  if (clean.endsWith(".gif")) return "gif";
  if (clean.endsWith(".bmp")) return "bmp";
  return "png";
}

function defaultTransform(box: { maxW: number; maxH: number }) {
  return { width: box.maxW, height: Math.min(box.maxH, Math.round(box.maxW * 0.75)) };
}

type InlineCtx = {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
  size?: number; // half points
};

type ParagraphChild = TextRun | ImageRun | ExternalHyperlink;

// A4 height (inches) = 11.69, margin top/bottom đang set 0.9 / 0.7
const A4_HEIGHT_IN = 11.69;
const PAGE_MARGIN_TOP_IN = 0.9;
const PAGE_MARGIN_BOTTOM_IN = 0.7;
const CONTENT_HEIGHT_IN = A4_HEIGHT_IN - PAGE_MARGIN_TOP_IN - PAGE_MARGIN_BOTTOM_IN;

/** Bọc content vào 1 table cao full trang để canh giữa theo chiều dọc */
// chừa chỗ cho header ở các trang nội dung (Word cần khoảng trống này)
const HEADER_GUARD_IN = 0.85;

/** Bọc content vào 1 table cao gần full trang để canh giữa theo chiều dọc */
function centeredPage(children: Paragraph[], opts?: { withHeader?: boolean }) {
  const safeChildren = children.length
    ? children
    : [new Paragraph({ children: [new TextRun(" ")] })];

  const heightIn = CONTENT_HEIGHT_IN - (opts?.withHeader ? HEADER_GUARD_IN : 0);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: {
          value: convertInchesToTwip(Math.max(5, heightIn)),
          rule: HeightRule.ATLEAST, //  tránh bị “đẩy” sang trang mới => sinh trang trống
        },
        children: [
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: safeChildren,
          }),
        ],
      }),
    ],
  });
}



/* =========================
   HTML -> docx
========================= */

async function nodeToRuns(
  node: ChildNode,
  ctx: InlineCtx,
  getDisplayUrl: (u?: string | null) => string,
  limit: <T>(task: () => Promise<T>) => Promise<T>,
  imageBox: { maxW: number; maxH: number }
): Promise<ParagraphChild[]> {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").replace(/\u00A0/g, " ");
    if (!text) return [];
    return [
      new TextRun({
        text,
        bold: ctx.bold,
        italics: ctx.italics,
        underline: ctx.underline ? {} : undefined,
        strike: ctx.strike,
        color: ctx.color,
        size: ctx.size,
        shading: ctx.highlight
          ? { type: ShadingType.CLEAR, color: "auto", fill: ctx.highlight }
          : undefined,
      }),
    ];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") return [new TextRun({ text: "", break: 1 })];

  if (tag === "img") {
    const src = el.getAttribute("src");
    if (!src) return [];
    const url = getDisplayUrl(src);
    if (!url) return [];

    try {
      const [bytes, size] = await Promise.all([
        limit(() => fetchAsUint8Array(url)),
        limit(() => getImageSize(url)),
      ]);

      const fitted = size
        ? fitToBox(size.w, size.h, imageBox.maxW, imageBox.maxH)
        : defaultTransform(imageBox);

      return [new ImageRun({ type: guessImageType(url), data: bytes, transformation: fitted })];
    } catch {
      return [];
    }
  }

  if (tag === "a") {
    const href = (el.getAttribute("href") || "").trim();
    const txt = (el.textContent || "").trim();
    if (!href) return await childrenToRuns(el, ctx, getDisplayUrl, limit, imageBox);

    return [
      new ExternalHyperlink({
        link: href,
        children: [
          new TextRun({
            text: txt || href,
            underline: {},
            color: "0563C1",
            bold: ctx.bold,
            italics: ctx.italics,
          }),
        ],
      }),
    ];
  }

  const nextCtx: InlineCtx = { ...ctx };

  if (tag === "strong" || tag === "b") nextCtx.bold = true;
  if (tag === "em" || tag === "i") nextCtx.italics = true;
  if (tag === "u") nextCtx.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") nextCtx.strike = true;

  const styles = parseStyle(el.getAttribute("style"));
  const c = cssColorToHex(styles["color"]);
  if (c) nextCtx.color = c;

  const fs = cssFontSizeToHalfPoints(styles["font-size"]);
  if (fs) nextCtx.size = fs;

  const bg = cssColorToHex(styles["background-color"]);
  if (bg) nextCtx.highlight = bg;

  return await childrenToRuns(el, nextCtx, getDisplayUrl, limit, imageBox);
}

async function childrenToRuns(
  el: HTMLElement,
  ctx: InlineCtx,
  getDisplayUrl: (u?: string | null) => string,
  limit: <T>(task: () => Promise<T>) => Promise<T>,
  imageBox: { maxW: number; maxH: number }
): Promise<ParagraphChild[]> {
  const out: ParagraphChild[] = [];
  for (const child of Array.from(el.childNodes)) {
    const runs = await nodeToRuns(child, ctx, getDisplayUrl, limit, imageBox);
    out.push(...runs);
  }
  return out;
}

async function htmlToDocxParagraphs(
  html: string,
  getDisplayUrl: (u?: string | null) => string,
  limit: <T>(task: () => Promise<T>) => Promise<T>,
  imageBox: { maxW: number; maxH: number }
): Promise<Paragraph[]> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  const paragraphs: Paragraph[] = [];

  async function walkBlock(node: Element, listCtx?: { type: "ul" | "ol"; level: number }) {
    const tag = node.tagName.toLowerCase();
    const styles = parseStyle(node.getAttribute("style"));
    const align = textAlignToDocxAlign(styles["text-align"]);

    const headingMap: Record<string, HeadingLevelValue> = {
      h1: HeadingLevel.HEADING_1,
      h2: HeadingLevel.HEADING_2,
      h3: HeadingLevel.HEADING_3,
      h4: HeadingLevel.HEADING_4,
      h5: HeadingLevel.HEADING_5,
      h6: HeadingLevel.HEADING_6,
    };

    if (headingMap[tag]) {
      const runs = await childrenToRuns(node as HTMLElement, {}, getDisplayUrl, limit, imageBox);
      paragraphs.push(
        new Paragraph({
          heading: headingMap[tag],
          alignment: align,
          children: runs.length ? runs : [new TextRun("")],
          spacing: { after: 180 },
        })
      );
      return;
    }

    if (tag === "p" || tag === "div" || tag === "blockquote") {
      const runs = await childrenToRuns(node as HTMLElement, {}, getDisplayUrl, limit, imageBox);
      paragraphs.push(
        new Paragraph({
          alignment: align,
          children: runs.length ? runs : [new TextRun("")],
          spacing: { after: 120 },
          indent: tag === "blockquote" ? { left: 720 } : undefined,
        })
      );
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const nextCtx = { type: tag as "ul" | "ol", level: listCtx?.level ?? 0 };
      for (const li of Array.from(node.children)) {
        if (li.tagName.toLowerCase() === "li") await walkBlock(li, nextCtx);
      }
      return;
    }

    if (tag === "li") {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("ul,ol").forEach((x) => x.remove());

      const runs = await childrenToRuns(clone, {}, getDisplayUrl, limit, imageBox);

      paragraphs.push(
        new Paragraph({
          children: runs.length ? runs : [new TextRun("")],
          numbering: listCtx
            ? { reference: listCtx.type === "ul" ? "bullet" : "number", level: Math.min(8, listCtx.level) }
            : undefined,
          indent: { left: 720 * ((listCtx?.level ?? 0) + 1), hanging: 360 },
          spacing: { after: 60 },
        })
      );

      const subLists = Array.from(node.children).filter((c) => {
        const t = c.tagName.toLowerCase();
        return t === "ul" || t === "ol";
      });

      for (const sub of subLists) {
        await walkBlock(sub as Element, {
          type: sub.tagName.toLowerCase() as "ul" | "ol",
          level: (listCtx?.level ?? 0) + 1,
        });
      }
      return;
    }

    for (const child of Array.from(node.children)) await walkBlock(child);
  }

  for (const child of Array.from(body.children)) await walkBlock(child);

  if (paragraphs.length === 0) {
    const text = (body.textContent || "").trim();
    if (text) paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
  }

  return paragraphs;
}

/* =========================
   Component
========================= */

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
  const [activeAudioPageId, setActiveAudioPageId] = useState<string | null>(null);

  //  modal zoom marker
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
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDisplayUrl = useCallback((url?: string | null) => toFirebaseDisplayUrl(url), []);

  const totalPages = pages.length;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex + 2 < totalPages;

  const leftPage = useMemo(() => pages[currentIndex] ?? null, [pages, currentIndex]);
  const rightPage = useMemo(() => pages[currentIndex + 1] ?? null, [pages, currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 2 >= 0 ? prev - 2 : 0));
    setActiveAudioPageId(null);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 2 < totalPages ? prev + 2 : prev));
    setActiveAudioPageId(null);
  }, [totalPages]);

  const handleToggleAudio = useCallback((pageId?: string) => {
    if (!pageId) return;
    setActiveAudioPageId((prev) => (prev === pageId ? null : pageId));
  }, []);

  const goBackToBooks = useCallback(() => {
    navigate("/author/authorbooklist");
  }, [navigate]);

  /* =========================
     Export DOCX (chuẩn)
  ========================= */

  const handleExportDocx = async () => {
    if (exporting) return;

    if (!book) {
      toast({
        title: "Không có sách",
        description: "Không tìm thấy thông tin sách.",
        variant: "destructive",
      });
      return;
    }
    if (pages.length === 0) {
      toast({
        title: "Chưa có trang",
        description: "Sách chưa có trang nào để xuất.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    toast({ title: "Đang xuất .docx", description: "Đang tạo file Word chuẩn..." });

    try {
      const limit = createLimiter(8);
      const numbering = createDefaultNumbering();

      const sortedPages = [...pages].sort((a, b) => {
        const c1 = a.chapterNumber ?? 0;
        const c2 = b.chapterNumber ?? 0;
        if (c1 !== c2) return c1 - c2;
        return (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
      });

      const chapterMap = new Map<string, Chapter>();
      chapters.forEach((c) => c.chapterId && chapterMap.set(c.chapterId, c));

      const pagesByChapter = new Map<string, EnrichedPage[]>();
      for (const p of sortedPages) {
        const cid = p.chapterId || "unknown";
        if (!pagesByChapter.has(cid)) pagesByChapter.set(cid, []);
        pagesByChapter.get(cid)!.push(p);
      }

      // order chương theo chapters, unknown để cuối
      const orderedChapterIds: string[] = [];
      for (const ch of chapters) {
        if (ch.chapterId && pagesByChapter.has(ch.chapterId)) orderedChapterIds.push(ch.chapterId);
      }
      if (pagesByChapter.has("unknown")) orderedChapterIds.push("unknown");

      const imageBox = { maxW: 520, maxH: 720 };
      const markerBox = { maxW: 140, maxH: 140 };

      const sections: any[] = [];

      const linkPara = (label: string, link: string) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `${label}: `, color: "555555" }),
            new ExternalHyperlink({
              link,
              children: [
                new TextRun({
                  text: "Xem",
                  underline: {},
                  color: "0563C1",
                }),
              ],
            }),
          ],
        });

      /* =========================
         Cover section (tên + mô tả + ảnh bìa)
          bỏ PageBreak cuối section để tránh sinh trang trống
      ========================= */
      {
        const children: Paragraph[] = [];

        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [new TextRun({ text: book.bookName || "Không tên", bold: true, size: 52 })],
          })
        );

        if (book.decription) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 260 },
              children: [new TextRun({ text: String(book.decription), size: 24, color: "555555" })],
            })
          );
        }

        if (book.coverUrl) {
          const coverUrl = getDisplayUrl(book.coverUrl);
          try {
            const [bytes, size] = await Promise.all([
              limit(() => fetchAsUint8Array(coverUrl)),
              limit(() => getImageSize(coverUrl)),
            ]);
            const fitted = size ? fitToBox(size.w, size.h, 360, 520) : { width: 360, height: 480 };
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new ImageRun({
                    type: guessImageType(coverUrl),
                    data: bytes,
                    transformation: fitted,
                  }),
                ],
              })
            );
          } catch {
            children.push(linkPara("Bìa", coverUrl));
          }
        }

        // ❌ KHÔNG push PageBreak ở đây nữa

        sections.push({
          properties: {
            page: {
              size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
              margin: {
                top: convertInchesToTwip(0.9),
                bottom: convertInchesToTwip(0.7),
                left: convertInchesToTwip(0.8),
                right: convertInchesToTwip(0.8),
              },
            },
          },
          children,
        });
      }

      /* =========================
         Nội dung theo chương
      ========================= */
      for (const chapterId of orderedChapterIds) {
        const chapterPages = pagesByChapter.get(chapterId) || [];
        if (chapterPages.length === 0) continue;

        const ch = chapterMap.get(chapterId);
        const chapterTitle = ch
          ? `Chương ${ch.chapterNumber ?? ""}: ${ch.chapterName ?? ""}`
          : `Chương: ${chapterId}`;

        const chapterIntro =
          (ch as any)?.description ||
          (ch as any)?.introduction ||
          (ch as any)?.chapterIntro ||
          "";

        // Header chỉ cho các trang nội dung (section 2)
        const headerForContentPages = new Header({
          children: [
            new Paragraph({
              children: [new TextRun({ text: chapterTitle, bold: true, size: 22 })],
              spacing: { after: 80 },
            }),
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
            }),
          ],
        });

        /* =========================
           SECTION 1: Trang giới thiệu chương (center giữa trang)
           - không header
        ========================= */
        {
          const introParas: Paragraph[] = [];

          introParas.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: chapterTitle, bold: true, size: 44 })],
              spacing: { after: 240 },
            })
          );

          if (chapterIntro) {
            introParas.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(chapterIntro), size: 24, color: "555555" })],
                spacing: { after: 200 },
              })
            );
          }

          sections.push({
            properties: {
              page: {
                size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
                margin: {
                  top: convertInchesToTwip(0.9),
                  bottom: convertInchesToTwip(0.7),
                  left: convertInchesToTwip(0.8),
                  right: convertInchesToTwip(0.8),
                },
              },
            },
            headers: { default: new Header({ children: [] }) },
            children: [centeredPage(introParas)], // intro không header
          });
        }

        /* =========================
           SECTION 2: Nội dung chương
            CHỈ trang ảnh (PICTURE) không marker mới center
            Không tự sinh trang trống
        ========================= */
        {
          const pageBlocks: Array<Array<Paragraph | Table>> = [];

          for (const p of chapterPages) {
            const isPicturePage = p.pageType === "PICTURE";
            const pageParas: Paragraph[] = [];

            // illustration / ảnh trang
            let illustrationRaw: string | null = null;
            if (p.illustration?.imageUrl) {
              illustrationRaw = p.illustration.imageUrl;
            } else if (isPicturePage && typeof p.content === "string") {
              const raw = p.content.trim();
              if (isLikelyUrl(raw)) illustrationRaw = raw;
            }

            if (illustrationRaw) {
              const url = getDisplayUrl(illustrationRaw);
              try {
                const [bytes, size] = await Promise.all([
                  limit(() => fetchAsUint8Array(url)),
                  limit(() => getImageSize(url)),
                ]);
                const fitted = size
                  ? fitToBox(size.w, size.h, imageBox.maxW, imageBox.maxH)
                  : defaultTransform(imageBox);

                pageParas.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                      new ImageRun({
                        type: guessImageType(url),
                        data: bytes,
                        transformation: fitted,
                      }),
                    ],
                  })
                );
              } catch {
                pageParas.push(linkPara("Ảnh", url));
              }
            }

            // content chữ (chỉ cho trang không phải PICTURE)
            if (!isPicturePage && typeof p.content === "string") {
              const content = p.content.trim();
              if (content) {
                if (isLikelyHtml(content)) {
                  const safe = sanitizeHtmlBasic(content);
                  const ps = await htmlToDocxParagraphs(safe, getDisplayUrl, limit, imageBox);
                  pageParas.push(...ps);
                } else {
                  const lines = content.split("\n");
                  for (const line of lines) {
                    pageParas.push(
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [new TextRun({ text: line || " ", size: 24 })],
                      })
                    );
                  }
                }
              }
            }

            // marker image (nếu có và không phải pdf)
            if (p.markerImageUrl) {
              const url = getDisplayUrl(p.markerImageUrl);
              if (url && !isPdfUrl(url)) {
                try {
                  const [bytes, size] = await Promise.all([
                    limit(() => fetchAsUint8Array(url)),
                    limit(() => getImageSize(url)),
                  ]);

                  const fitted = size
                    ? fitToBox(size.w, size.h, markerBox.maxW, markerBox.maxH)
                    : { width: 120, height: 120 };

                  pageParas.push(
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 240 },
                      children: [
                        new ImageRun({
                          type: guessImageType(url),
                          data: bytes,
                          transformation: fitted,
                        }),
                      ],
                    })
                  );
                } catch {
                  pageParas.push(linkPara("Marker", url));
                }
              }
            }

            //  nếu trang thật sự không có gì -> bỏ qua để không sinh trang trống
            if (pageParas.length === 0) continue;

            const shouldCenter = isPicturePage && !p.hasMarker; //  đúng yêu cầu của bạn
            const nodes: Array<Paragraph | Table> = [];

            if (shouldCenter) {
              nodes.push(centeredPage(pageParas, { withHeader: true })); // nội dung có header
            } else {
              nodes.push(...pageParas);
            }

            pageBlocks.push(nodes);
          }

          const contentChildren: Array<Paragraph | Table> = [];
          for (let i = 0; i < pageBlocks.length; i++) {
            contentChildren.push(...pageBlocks[i]);
            if (i !== pageBlocks.length - 1) {
              contentChildren.push(new Paragraph({ children: [new PageBreak()] }));
            }
          }

          sections.push({
            properties: {
              page: {
                size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
                margin: {
                  top: convertInchesToTwip(0.9),
                  bottom: convertInchesToTwip(0.7),
                  left: convertInchesToTwip(0.8),
                  right: convertInchesToTwip(0.8),
                },
              },
            },
            headers: { default: headerForContentPages },
            children: contentChildren,
          });
        }
      }

      const doc = new Document({ numbering, sections });
      const blob = await Packer.toBlob(doc);

      const filenameBase = (book.bookName || book.bookId || "book").replace(/[\\/:*?"<>|]+/g, "_");
      saveAs(blob, `${filenameBase}.docx`);

      toast({ title: "Xuất thành công", description: "Đã tải về file .docx chuẩn." });
    } catch (e) {
      console.error("Export docx error:", e);
      toast({
        title: "Xuất thất bại",
        description: "Không thể xuất .docx.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };


  /* =========================
     Fetch + Enrich (tối ưu)
  ========================= */

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;

    const fetchData = async () => {
      const limit = createLimiter(8);

      try {
        setLoading(true);
        setError(null);

        // 1) book
        let currentBook = location.state?.book as Book | undefined;
        if (!currentBook) currentBook = await getBookById(bookId);
        if (cancelled) return;
        setBook(currentBook);

        // 2) chapters
        const chaptersRes: any = await getAllChapters({ bookId, page: 0, size: 200 });
        let chapterList: Chapter[] = chaptersRes?.content ?? chaptersRes ?? [];
        chapterList = [...chapterList].sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
        if (cancelled) return;
        setChapters(chapterList);

        // 3) pages per chapter (song song)
        const pagesByChapter = await Promise.all(
          chapterList
            .filter((ch) => !!ch.chapterId)
            .map((ch) =>
              limit(async () => {
                const pagesRes: any = await getAllPages({ chapterId: ch.chapterId!, page: 0, size: 500 });
                const pageList: Page[] = pagesRes?.content ?? pagesRes ?? [];
                return pageList.map((p) => ({
                  ...p,
                  chapterName: ch.chapterName,
                  chapterNumber: ch.chapterNumber,
                })) as EnrichedPage[];
              })
            )
        );

        if (cancelled) return;

        const basePages: EnrichedPage[] = pagesByChapter
          .flat()
          .sort((a, b) => {
            const c1 = a.chapterNumber ?? 0;
            const c2 = b.chapterNumber ?? 0;
            if (c1 !== c2) return c1 - c2;
            return (a.pageNumber ?? 0) - (b.pageNumber ?? 0);
          });

        const pageIds = basePages.map((p) => p.pageId).filter(Boolean) as string[];

        const markerMap = new Map<
          string,
          { hasMarker: boolean; markerImageUrl: string | null; markerPdfUrl: string | null }
        >();
        const audioRelMap = new Map<string, string | null>();
        const illusRelMap = new Map<string, string | null>();

        // 4) relations per page (song song)
        await Promise.all(
          pageIds.map((pid) =>
            limit(async () => {
              // marker
              try {
                const markerRes: any = await searchMarkers({ pageId: pid, page: 0, size: 1 });
                const marker = markerRes?.content?.[0];

                //  ưu tiên imageUrl; nếu printablePdfUrl mà không phải pdf thì có thể dùng như ảnh
                const imageCandidate: string | null =
                  marker?.imageUrl ||
                  (marker?.printablePdfUrl && !isPdfUrl(marker.printablePdfUrl) ? marker.printablePdfUrl : null) ||
                  null;

                markerMap.set(pid, {
                  hasMarker: !!marker,
                  markerImageUrl: imageCandidate,
                  markerPdfUrl: marker?.printablePdfUrl ?? null,
                });
              } catch (err) {
                console.error("Lỗi searchMarkers pageId=", pid, err);
                markerMap.set(pid, { hasMarker: false, markerImageUrl: null, markerPdfUrl: null });
              }

              // audio relation
              try {
                const paRes: any = await searchPageAudios({ pageId: pid, page: 0, size: 1 });
                const rel = paRes?.content?.[0];
                audioRelMap.set(pid, rel?.audioId ?? null);
              } catch (err) {
                console.error("Lỗi searchPageAudios pageId=", pid, err);
                audioRelMap.set(pid, null);
              }

              // illustration relation
              try {
                const piRes: any = await searchPageIllustrations({ pageId: pid, page: 0, size: 1 });
                const relIllus = piRes?.content?.[0];
                illusRelMap.set(pid, relIllus?.illustrationId ?? null);
              } catch (err) {
                console.error("Lỗi searchPageIllustrations pageId=", pid, err);
                illusRelMap.set(pid, null);
              }
            })
          )
        );

        if (cancelled) return;

        // 5) fetch details unique ids (song song)
        const audioCache: Record<string, Audio> = {};
        const illustrationCache: Record<string, Illustration> = {};

        const audioIds = Array.from(new Set(Array.from(audioRelMap.values()).filter(Boolean))) as string[];
        const illusIds = Array.from(new Set(Array.from(illusRelMap.values()).filter(Boolean))) as string[];

        await Promise.all(
          audioIds.map((id) =>
            limit(async () => {
              try {
                audioCache[id] = await getAudioById(id);
              } catch (err) {
                console.error("Lỗi getAudioById id=", id, err);
              }
            })
          )
        );

        await Promise.all(
          illusIds.map((id) =>
            limit(async () => {
              try {
                illustrationCache[id] = await getIllustrationById(id);
              } catch (err) {
                console.error("Lỗi getIllustrationById id=", id, err);
              }
            })
          )
        );

        if (cancelled) return;

        // 6) merge into pages
        const enriched: EnrichedPage[] = basePages.map((p) => {
          const pid = p.pageId || "";
          const marker = pid ? markerMap.get(pid) : undefined;
          const audioId = pid ? audioRelMap.get(pid) : null;
          const illusId = pid ? illusRelMap.get(pid) : null;

          return {
            ...p,
            hasMarker: marker?.hasMarker ?? false,
            markerImageUrl: marker?.markerImageUrl ?? null,
            markerPdfUrl: marker?.markerPdfUrl ?? null,
            audio: audioId ? audioCache[audioId] ?? null : null,
            illustration: illusId ? illustrationCache[illusId] ?? null : null,
          };
        });

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

  return (
    <div className="flex h-screen bg-[#0b1020]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`
                absolute z-50 top-4
                h-9 w-9 rounded-full
                bg-[#0b1220]/70 backdrop-blur
                border border-white/10
                text-white hover:bg-white/10
                transition-all
                ${sidebarOpen ? "left-64 -translate-x-1/2" : "left-2 translate-x-0"}
              `}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </Button>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#111827] border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-white">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span className="font-semibold">Xem sách</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" className="
              bg-white hover:bg-gray-200 text-gray-800 disabled:opacity-60" onClick={goBackToBooks}>
                Quay lại
              </Button>

              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleExportDocx}
                disabled={loading || exporting}
              >
                {exporting ? "Đang xuất..." : "Xuất file"}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-5 bg-[#020617]">
          {loading && <div className="flex h-full items-center justify-center text-gray-300">Đang tải dữ liệu sách...</div>}

          {!loading && error && <div className="flex h-full items-center justify-center text-red-400">{error}</div>}

          {!loading && !error && book && (
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              {/* Info panel */}
              <div className="w-full lg:w-72 xl:w-80 bg-[#0b1120] border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="w-20 h-28 rounded-md overflow-hidden bg-white/5 shadow">
                    {book.coverUrl ? (
                      <img src={getDisplayUrl(book.coverUrl)} alt={book.bookName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Cover</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm text-gray-400">Tác phẩm</div>
                    <div className="text-base font-semibold text-white line-clamp-2">{book.bookName}</div>
                    <div className="mt-1 text-xs text-gray-400 line-clamp-3">{book.decription || "Chưa có mô tả."}</div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="text-xs text-gray-400 mb-2">Chương ({chapters.length})</div>
                  <div className="max-h-56 overflow-auto space-y-1 pr-1">
                    {chapters.map((ch) => (
                      <div
                        key={ch.chapterId}
                        className="text-xs text-gray-300 bg-white/5 rounded px-2 py-1 flex justify-between items-center"
                      >
                        <span className="truncate">
                          Chương {ch.chapterNumber}: {ch.chapterName}
                        </span>
                      </div>
                    ))}
                    {chapters.length === 0 && <div className="text-xs text-gray-500">Chưa có chương nào.</div>}
                  </div>
                </div>

                <div className="mt-auto text-xs text-gray-400 border-t border-white/10 pt-2">
                  <div>Tổng số trang: {totalPages}</div>
                  <div>
                    Đang xem:{" "}
                    {totalPages > 0 ? `${currentIndex + 1}${currentIndex + 2 <= totalPages ? " - " + (currentIndex + 2) : ""}` : "-"}
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
                      className={`border-white/20 text-white bg-transparent hover:bg-white/10 ${!canPrev ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <PanelLeftClose className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!canNext}
                      onClick={handleNext}
                      className={`border-white/20 text-white bg-transparent hover:bg-white/10 ${!canNext ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <PanelLeftOpen className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex justify-center items-stretch">
                  {totalPages === 0 ? (
                    <div className="flex items-center justify-center text-gray-400">Chưa có trang nào trong sách.</div>
                  ) : (
                    <div className="flex gap-4 max-w-5xl w-full">
                      <MemoPageCard
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
                      <MemoPageCard
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

          {/*  MODAL ZOOM MARKER */}
          {zoomMarkerUrl && (
            <div
              className="fixed inset-0 z-999 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setZoomMarkerUrl(null)}
            >
              <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setZoomMarkerUrl(null)}
                  className="absolute -top-3 -right-3 bg-white text-black rounded-full w-9 h-9 shadow flex items-center justify-center"
                  aria-label="Close"
                >
                  ✕
                </button>

                <div className="bg-black/30 border border-white/20 rounded-xl p-3 shadow-xl">
                  <div className="text-sm text-gray-200 font-medium mb-2 text-center">{zoomMarkerTitle}</div>
                  <img src={zoomMarkerUrl} alt={zoomMarkerTitle} className="w-full max-h-[80vh] object-contain rounded-lg" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* =========================
   Page Card
========================= */

type PageCardProps = {
  page: EnrichedPage | null;
  side: "left" | "right";
  activeAudioPageId: string | null;
  onToggleAudio: (pageId?: string) => void;
  getDisplayUrl: (url?: string | null) => string;

  //  click marker thumbnail -> zoom
  onMarkerZoom: (markerRawUrl: string, title?: string) => void;
};

const MemoPageCard = memo(function PageCard({
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
        className={`flex-1 bg-linear-to-br from-[#020617] to-[#020617] border border-dashed border-white/10 rounded-xl shadow-inner flex items-center justify-center text-xs text-gray-500 ${side === "left" ? "origin-right" : "origin-left"
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

  const contentLooksLikeUrl = typeof page.content === "string" && isLikelyUrl(page.content.trim());
  const contentImageSrc = isPicturePage && contentLooksLikeUrl ? getDisplayUrl(page.content.trim()) : "";

  const isHtmlContent = !isPicturePage && typeof page.content === "string" && isLikelyHtml(page.content);

  const safeHtml = useMemo(() => {
    if (!isHtmlContent || typeof page.content !== "string") return "";
    return sanitizeHtmlBasic(page.content);
  }, [isHtmlContent, page.content]);

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
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full shadow shrink-0 ${isPlaying ? "bg-emerald-500 text-white" : "bg-emerald-600/90 text-white hover:bg-emerald-500"
                }`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400 whitespace-nowrap">Trang {page.pageNumber}</div>
      </div>

      <div className="border-t border-white/10 my-2" />

      {(illustrationSrc || contentImageSrc) && (
        <div className="mb-3 rounded-md overflow-hidden bg-black/30 max-h-64 relative">
          <img
            src={illustrationSrc || contentImageSrc}
            alt={illustration?.title || `Trang ${page.pageNumber}`}
            className="w-full h-full object-contain"
          />

          {isPicturePage && hasMarker && markerThumbSrc && (
            <button
              type="button"
              onClick={() => onMarkerZoom(markerThumbRaw!, `Marker - Trang ${page.pageNumber}`)}
              className="absolute top-2 right-2 z-10 cursor-zoom-in rounded-md overflow-hidden border border-white/30 bg-black/30 backdrop-blur-sm shadow-lg hover:scale-[1.03] transition"
              title="Xem marker"
            >
              <img src={markerThumbSrc} alt={`Marker trang ${page.pageNumber}`} className="w-16 h-16 object-contain p-1" />
            </button>
          )}
        </div>
      )}

      {!isPicturePage && (
        <div className="flex-1 overflow-auto pr-1">
          {isHtmlContent ? (
            <div className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed" dangerouslySetInnerHTML={{ __html: safeHtml }} />
          ) : (
            <div className="whitespace-pre-wrap text-sm text-gray-100 leading-relaxed">{page.content}</div>
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
});

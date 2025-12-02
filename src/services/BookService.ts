import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { API_RK } from "@/config";
import { resolveFirebaseUrl } from "@/firebase";
import { getToken, getCurrentUserId, getUserRole } from "@/utils/authStorage";

/* =======================================================
   🧩 INTERFACES
======================================================= */
export interface Book {
  bookId: string;
  bookName: string;
  coverUrl: string;
  decription: string;
  authorId: string | null;
  progressStatus: number;
  publicationStatus: number;
  price: number;
  quantity: number;
  isActived: string;
  createdAt: string;
  updatedAt: string;
  publishedDate: string | null;
  genreId?: string;
  bookshelfId?: string;
  [key: string]: any;
}

export interface PagedResponse<T> {
  content: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  [key: string]: any;
}

export interface GetBooksParams {
  page?: number;
  size?: number;
  sort?: string[];
  q?: string;
  authorId?: string;
  publicationStatus?: number;
  progressStatus?: number;
  isActived?: string;
  genreId?: string;
  bookshelfId?: string;
  [key: string]: any;
}

/* =======================================================
   🔒 AXIOS INSTANCE
======================================================= */
const api = axios.create({ baseURL: API_RK });

api.interceptors.request.use((config) => {
  const token = getToken();
  const uid = getCurrentUserId();
  if (config.headers) {
    if (token) config.headers.set?.("Authorization", `Bearer ${token}`);
  } else {
    // ✅ Fallback cho các version cũ hoặc kiểu object
    config.headers = {} as any;
    if (token) (config.headers as any)["Authorization"] = `Bearer ${token}`;
    if (uid) (config.headers as any)["X-User-Id"] = uid;
  }
  return config;
});

/* =======================================================
   🧠 CLASS BOOK SERVICE
======================================================= */
export class BookService {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId ?? getCurrentUserId() ?? undefined;
  }

  /** Cho phép đặt lại userId sau khi login */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /** Lấy userId hiện tại (ưu tiên override) */
  private resolveUserId(override?: string) {
    return override ?? this.userId ?? getCurrentUserId() ?? undefined;
  }

  /** 🔧 Chuẩn hóa dữ liệu gửi đi */
  /** 🔧 Chuẩn hóa dữ liệu gửi đi */
  private normalizeBookPayload(book: Partial<Book>) {
    const publication =
      typeof book.publicationStatus === "string"
        ? Number(book.publicationStatus)
        : book.publicationStatus;

    const progress =
      typeof book.progressStatus === "string"
        ? Number(book.progressStatus)
        : book.progressStatus;

    // 👇 THÊM ĐOẠN NÀY
    const price =
      typeof book.price === "string" ? Number(book.price) : book.price;

    const quantity =
      typeof book.quantity === "string" ? Number(book.quantity) : book.quantity;

    return {
      ...book,
      publicationStatus: publication ?? 0,
      progressStatus: progress ?? 0,
      price: price ?? 0,
      quantity: quantity ?? 0,
    };
  }

  /* =======================================================
     📚 LẤY DANH SÁCH SÁCH (PHÂN TRANG)
  ======================================================== */
  async getBooks(
    params?: GetBooksParams,
    userIdOverride?: string
  ): Promise<PagedResponse<Book>> {
    const uid = this.resolveUserId(userIdOverride);

    const role = getUserRole();

    const finalParams: GetBooksParams = {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
      ...params,
      ...(role === "author" && uid ? { authorId: uid } : {}), // ✅ chỉ filter nếu là author
    };

    const res = await api.get<PagedResponse<Book>>(`/users/books`, { params: finalParams });

    console.log("📦 Params gửi lên:", finalParams);
    const books = res.data.content || [];
    const converted = await Promise.all(
      books.map(async (b) => ({
        ...b,
        coverUrl: await resolveFirebaseUrl(b.coverUrl),
      }))
    );


    return { ...res.data, content: converted };

  }

  /* =======================================================
     📚 LẤY TOÀN BỘ SÁCH (RÚT GỌN)
  ======================================================== */
  async getAllBooks(params?: GetBooksParams, userIdOverride?: string): Promise<Book[]> {
    const res = await this.getBooks(params, userIdOverride);
    return res.content ?? [];
  }

  /* =======================================================
     📘 LẤY CHI TIẾT 1 SÁCH
  ======================================================== */
  async getBookById(id: string): Promise<Book> {
    const res = await api.get<Book>(`/users/books/${id}`);
    const book = res.data;
    book.coverUrl = await resolveFirebaseUrl(book.coverUrl);
    return book;
  }

  /* =======================================================
     ➕ TẠO MỚI SÁCH
  ======================================================== */
  async createBook(book: Partial<Book>): Promise<Book> {
    const normalized = this.normalizeBookPayload(book);
    const res = await api.post(`/users/books`, normalized);
    return res.data;
  }

  /* =======================================================
     ✏️ CẬP NHẬT SÁCH
  ======================================================== */
  async updateBook(id: string, book: Partial<Book>): Promise<Book> {
    const normalized = this.normalizeBookPayload(book);
    const res = await api.put(`/users/books/${id}`, normalized);
    return res.data;
  }

  /* =======================================================
     ❌ XOÁ SÁCH
  ======================================================== */
  async deleteBook(id: string): Promise<void> {
    await api.delete(`/users/books/${id}`);
  }

  /* =======================================================
     🔄 CẬP NHẬT TRẠNG THÁI (MOD DUYỆT)
  ======================================================== */
  async updateBookStatusFull(book: Book, newStatus: number, _message?: string): Promise<Book> {
    if (!book?.bookId?.trim()) throw new Error("book.bookId is required");
    if (!Number.isFinite(newStatus)) throw new Error("publicationStatus must be a number");

    const url = `/users/books/${book.bookId}/publication-status`;

    const config: AxiosRequestConfig = {
      params: { publicationStatus: newStatus },
    };

    try {
      const res = await api.patch<Book>(url, undefined, config);
      return res.data;
    } catch (err) {
      const e = err as AxiosError<unknown>;
      const detail =
        e.response?.data ?? { message: e.message, status: e.response?.status };
      throw new Error(
        `PATCH publication status failed (bookId=${book.bookId}): ${JSON.stringify(detail)}`
      );
    }
  }

  /* =======================================================
     🔍 TÌM SÁCH THEO TÊN (CHO GỢI Ý HASHTAG)
  ======================================================== */
  async searchByTitle(keyword: string): Promise<Book[]> {
    if (!keyword.trim()) return [];

    try {
      const res = await api.get<PagedResponse<Book>>(`/users/books`, {
        params: { q: keyword, size: 10 },
      });

      const books = res.data.content || [];
      const converted = await Promise.all(
        books.map(async (b) => ({
          ...b,
          coverUrl: await resolveFirebaseUrl(b.coverUrl),
        }))
      );

      return converted;
    } catch (err) {
      console.error("❌ Lỗi khi tìm sách:", err);
      return [];
    }
  }
}

/* =======================================================
   📦 EXPORTS
======================================================= */
// Singleton instance
const _bookService = new BookService();
export const bookService = _bookService;

// Re-export helpers để hỗ trợ import cũ
export const getBookById = (id: string) => _bookService.getBookById(id);
export const getBooks = (params?: GetBooksParams, userIdOverride?: string) =>
  _bookService.getBooks(params, userIdOverride);
export const getAllBooks = (params?: GetBooksParams, userIdOverride?: string) =>
  _bookService.getAllBooks(params, userIdOverride);
export const createBook = (book: Partial<Book>) => _bookService.createBook(book);
export const updateBook = (id: string, book: Partial<Book>) =>
  _bookService.updateBook(id, book);
export const deleteBook = (id: string) => _bookService.deleteBook(id);
export const updateBookStatusFull = (book: Book, newStatus: number) =>
  _bookService.updateBookStatusFull(book, newStatus);
export const searchByTitle = (keyword: string) => _bookService.searchByTitle(keyword);

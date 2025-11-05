// src/services/BookService.ts
import axios from "axios";
import { API_BASE_URL } from "@/config";
import { resolveFirebaseUrl } from "@/firebase";
import { getToken, getCurrentUserId } from "@/utils/authStorage";

export interface Book {
  bookId: string;
  bookName: string;
  coverUrl: string;
  decription: string;
  authorId: string | null;
  progressStatus: string;
  publicationStatus: string;
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
  authorId?: string;            // ⬅️ Swagger filter theo authorId
  publicationStatus?: string;
  progressStatus?: string;
  isActived?: string;
  genreId?: string;
  bookshelfId?: string;
  [key: string]: any;
}

// Axios instance: tự gắn Authorization + X-User-Id nếu có
const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const token = getToken();
  // const uid = getCurrentUserId();  // ❌ tắt tạm để test
  config.headers = {
    ...(config.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // ...(uid ? { "X-User-Id": uid } : {}), // ❌ comment tạm
  };
  return config;
});

export class BookService {
  private userId?: string;

  constructor(userId?: string) {
    // Không throw — cho phép app khởi chạy khi chưa login
    this.userId = userId ?? getCurrentUserId() ?? undefined;
  }

  /** Cho phép đặt/chỉnh userId sau khi login */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /** Lấy userId theo thứ tự: override -> state -> localStorage */
  private resolveUserId(override?: string) {
    return override ?? this.userId ?? getCurrentUserId() ?? undefined;
  }

  /**
   * Lấy sách có phân trang + convert ảnh Firebase.
   * BE filter theo `authorId`, nên ta map `currentUserId` -> `authorId`.
   */
  async getBooks(
    params?: GetBooksParams,
    userIdOverride?: string
  ): Promise<PagedResponse<Book>> {
    const uid = this.resolveUserId(userIdOverride);

    const finalParams: GetBooksParams = {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
      ...params,
      ...(uid ? { authorId: uid } : {}), // ⬅️ DÙNG authorId thay vì userId
    };

    const res = await api.get<PagedResponse<Book>>(`/users/books`, { params: finalParams });

    const books = res.data.content || [];
    const converted = await Promise.all(
      books.map(async (b) => ({
        ...b,
        coverUrl: await resolveFirebaseUrl(b.coverUrl),
      }))
    );

    return { ...res.data, content: converted };
  }

  /** Lấy tất cả sách (rút gọn) */
  async getAllBooks(params?: GetBooksParams, userIdOverride?: string): Promise<Book[]> {
    const res = await this.getBooks(params, userIdOverride);
    return res.content ?? [];
  }

  /**
   * Lấy chi tiết 1 sách theo ID.
   * Thông thường không cần truyền authorId cho endpoint này.
   */
  async getBookById(id: string): Promise<Book> {
    const res = await api.get<Book>(`/users/books/${id}`);
    const book = res.data;
    book.coverUrl = await resolveFirebaseUrl(book.coverUrl);
    return book;
  }
}

// Instance dùng chung (an toàn khi chưa có user)
const _bookService = new BookService();
export const bookService = _bookService;

// Re-export helpers để hỗ trợ import cũ
export const getBookById = (id: string) =>
  _bookService.getBookById(id);
export const getBooks = (params?: GetBooksParams, userIdOverride?: string) =>
  _bookService.getBooks(params, userIdOverride);
export const getAllBooks = (params?: GetBooksParams, userIdOverride?: string) =>
  _bookService.getAllBooks(params, userIdOverride);

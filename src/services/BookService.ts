import axios from "axios";
import { API_BASE_URL } from "@/config";
import { resolveFirebaseUrl } from "@/firebase";

/* =======================================================
   🧩 INTERFACES
======================================================= */
export interface Book {
  bookId: string;
  bookName: string;
  coverUrl: string;
  decription: string;
  authorId: string | null;
  progressStatus: number;          // ✅ đổi sang number
  publicationStatus: number;       // ✅ đổi sang number (đúng với BE enum byte)
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
  publicationStatus?: number;     // ✅ đổi sang number
  progressStatus?: number;
  isActived?: string;
  genreId?: string;
  bookshelfId?: string;
  [key: string]: any;
}

const AUTH_HEADER = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  },
});

/* =======================================================
   🧩 HÀM CHUẨN HÓA DỮ LIỆU TRƯỚC KHI GỬI
======================================================= */
function normalizeBookPayload(book: Partial<Book>) {
  // Đảm bảo publicationStatus & progressStatus là số
  const publication =
    typeof book.publicationStatus === "string"
      ? Number(book.publicationStatus)
      : book.publicationStatus;

  const progress =
    typeof book.progressStatus === "string"
      ? Number(book.progressStatus)
      : book.progressStatus;

  return {
    ...book,
    publicationStatus: publication ?? 0,
    progressStatus: progress ?? 0,
  };
}

/* =======================================================
   🧩 LẤY DANH SÁCH SÁCH (PHÂN TRANG)
======================================================= */
export const getBooks = async (
  params?: GetBooksParams
): Promise<PagedResponse<Book>> => {
  const finalParams = { page: params?.page ?? 0, size: params?.size ?? 20, ...params };

  const res = await axios.get<PagedResponse<Book>>(`${API_BASE_URL}/users/books`, {
    params: finalParams,
    ...AUTH_HEADER(),
  });

  const books = res.data.content || [];

  // 🔥 Convert toàn bộ coverUrl nếu là gs://
  const converted = await Promise.all(
    books.map(async (book) => ({
      ...book,
      coverUrl: await resolveFirebaseUrl(book.coverUrl),
    }))
  );

  return { ...res.data, content: converted };
};

/* =======================================================
   🧩 LẤY TOÀN BỘ SÁCH (KHÔNG PHÂN TRANG)
======================================================= */
export const getAllBooks = async (): Promise<Book[]> => {
  const res = await getBooks();
  const books = res.content || [];

  const converted = await Promise.all(
    books.map(async (book) => ({
      ...book,
      coverPreviewUrl: await resolveFirebaseUrl(book.coverUrl), // ảnh hiển thị
    }))
  );

  return converted;
};


/* =======================================================
   🧩 LẤY CHI TIẾT 1 SÁCH THEO ID
======================================================= */
export const getBookById = async (id: string): Promise<Book> => {
  const res = await axios.get<Book>(`${API_BASE_URL}/users/books/${id}`, AUTH_HEADER());
  const book = res.data;
  book.coverUrl = await resolveFirebaseUrl(book.coverUrl);
  return book;
};

/* =======================================================
   🧩 TẠO MỚI SÁCH
======================================================= */
export const createBook = async (book: Partial<Book>): Promise<Book> => {
  const normalized = normalizeBookPayload(book);
  const res = await axios.post(`${API_BASE_URL}/users/books`, normalized, AUTH_HEADER());
  return res.data;
};

/* =======================================================
   🧩 CẬP NHẬT SÁCH
======================================================= */
export const updateBook = async (id: string, book: Partial<Book>): Promise<Book> => {
  const normalized = normalizeBookPayload(book);
  const res = await axios.put(`${API_BASE_URL}/users/books/${id}`, normalized, AUTH_HEADER());
  return res.data;
};

/* =======================================================
   🧩 XOÁ SÁCH
======================================================= */
export const deleteBook = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/users/books/${id}`, AUTH_HEADER());
};

/* =======================================================
   🧩 CẬP NHẬT TRẠNG THÁI SÁCH (MOD DUYỆT) — gửi full JSON
======================================================= */
export const updateBookStatusFull = async (
  book: Book,
  newStatus: number,
  message?: string
): Promise<Book> => {
  // 🧠 FE sẽ gửi toàn bộ JSON đầy đủ như BookRequestDTO yêu cầu
  const updatedBook = {
    ...book,
    publicationStatus: newStatus,
    updatedAt: new Date().toISOString(),
    message: message || "",
  };

  const res = await axios.put(
    `${API_BASE_URL}/users/books/${book.bookId}`,
    updatedBook,
    AUTH_HEADER()
  );

  return res.data;
};


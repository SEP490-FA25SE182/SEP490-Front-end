import axios , { AxiosError, type AxiosRequestConfig } from "axios";
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
  progressStatus: number;         
  publicationStatus: number;
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
  _message?: string
): Promise<Book> => {
  if (!book?.bookId?.trim()) throw new Error("book.bookId is required");
  if (!Number.isFinite(newStatus)) throw new Error("publicationStatus must be a number");

  const url = `${API_BASE_URL}/users/books/${book.bookId}/publication-status`;

  // Only query params (no body)
  const config: AxiosRequestConfig = {
    ...AUTH_HEADER(),
    params: { publicationStatus: newStatus },
  };

  try {
    const res = await axios.patch<Book>(url, undefined, config);
    return res.data;
  } catch (err) {
    const e = err as AxiosError<unknown>;
    // Why: bật mí chi tiết lỗi từ server để debug nhanh
    const detail =
      e.response?.data ?? { message: e.message, status: e.response?.status };
    throw new Error(
      `PATCH publication status failed (bookId=${book.bookId}): ${JSON.stringify(detail)}`
    );
  }
};

/* =======================================================
   🧩 TÌM SÁCH THEO TÊN (DÙNG CHO GỢI Ý HASHTAG)
======================================================= */
export const searchByTitle = async (keyword: string): Promise<Book[]> => {
  if (!keyword.trim()) return [];

  try {
    // Gọi API gốc, backend có param q hoặc bookName tùy bạn map
    const res = await axios.get<PagedResponse<Book>>(`${API_BASE_URL}/users/books`, {
      params: { q: keyword, size: 10 },
      ...AUTH_HEADER(),
    });

    const books = res.data.content || [];

    // Chuyển đổi URL Firebase (nếu có)
    const converted = await Promise.all(
      books.map(async (book) => ({
        ...book,
        coverUrl: await resolveFirebaseUrl(book.coverUrl),
      }))
    );

    return converted;
  } catch (err) {
    console.error("❌ Lỗi khi tìm sách:", err);
    return [];
  }
};

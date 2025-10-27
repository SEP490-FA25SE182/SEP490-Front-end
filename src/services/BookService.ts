import axios from "axios";
import { API_BASE_URL } from "@/config";

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
  // additional optional fields from backend
  genreId?: string;
  bookshelfId?: string;
  [key: string]: any;
}

/** Generic paged response from backend */
export interface PagedResponse<T> {
  content: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  // backend may include other metadata
  [key: string]: any;
}

export interface GetBooksParams {
  page?: number;
  size?: number;
  sort?: string[]; // e.g. ["createdAt,desc"]
  q?: string;
  authorId?: string;
  publicationStatus?: string;
  progressStatus?: string;
  isActived?: string;
  genreId?: string;
  bookshelfId?: string;
  // allow additional query params
  [key: string]: any;
}

const AUTH_HEADER = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  },
});

/**
 * Lấy sách có phân trang / lọc
 * GET /users/books with query params shown in Swagger UI
 * Trả về toàn bộ response của backend (paged)
 */
export const getBooks = async (params?: GetBooksParams): Promise<PagedResponse<Book>> => {
  const finalParams = {
    page: params?.page ?? 0,
    size: params?.size ?? 20,
    ...params,
  };

  // axios will serialize arrays like sort[]=a&sort[]=b by default.
  const res = await axios.get<PagedResponse<Book>>(`${API_BASE_URL}/users/books`, {
    params: finalParams,
    ...AUTH_HEADER(),
  });

  return res.data;
};

/**
 * Lấy tất cả sách (đơn giản): sẽ gọi getBooks và trả về mảng content
 * Nếu cần toàn bộ metadata, dùng getBooks thay vì getAllBooks
 */
export const getAllBooks = async (params?: GetBooksParams): Promise<Book[]> => {
  const res = await getBooks(params);
  if (res && Array.isArray(res.content)) return res.content;
  return [];
};

/**
 * Lấy chi tiết sách theo ID
 */
export const getBookById = async (id: string): Promise<Book> => {
  const res = await axios.get<Book>(`${API_BASE_URL}/users/books/${id}`, AUTH_HEADER());
  return res.data;
};

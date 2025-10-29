import axios from "axios";
import { API_BASE_URL } from "@/config";
import { resolveFirebaseUrl } from "@/firebase";  

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
  authorId?: string;
  publicationStatus?: string;
  progressStatus?: string;
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

/** ✅ Lấy sách có phân trang + convert ảnh Firebase */
export const getBooks = async (params?: GetBooksParams): Promise<PagedResponse<Book>> => {
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

/** ✅ Lấy tất cả sách (rút gọn) */
export const getAllBooks = async (params?: GetBooksParams): Promise<Book[]> => {
  const res = await getBooks(params);
  return res.content ?? [];
};

/** ✅ Lấy chi tiết 1 sách theo ID */
export const getBookById = async (id: string): Promise<Book> => {
  const res = await axios.get<Book>(`${API_BASE_URL}/users/books/${id}`, AUTH_HEADER());
  const book = res.data;
  book.coverUrl = await resolveFirebaseUrl(book.coverUrl);
  return book;
};

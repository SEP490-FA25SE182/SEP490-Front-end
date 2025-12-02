import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { API_RK } from "@/config";

// ==============================
// Interfaces
// ==============================
export interface Book {
    bookId?: string;
    bookName: string;
    coverUrl?: string;
    decription?: string;
    authorId?: string;
    progressStatus?: string;
    publicationStatus?: string;
    publishedDate?: string;
    isActived?: string;
}

export interface Chapter {
    chapterId?: string;
    chapterName: string;
    chapterNumber: number;
    decription?: string;
    review?: string;
    publishedDate?: string;
    progressStatus?: string;
    publicationStatus?: string;
    bookId: string;
    isActived?: string;
}

export interface Page {
    pageId?: string;
    pageNumber: number;
    content: string;
    chapterId: string;
    pageType?: string; // added pageType
    isActived?: string;
}

/** Tạo sách mới */
export const createBook = async (data: Book): Promise<Book> => {
    const res = await axios.post<Book>(`${API_RK}/users/books`, data);
    return res.data;
};

/** Cập nhật sách (PUT /api/rookie/users/books/{id}) */
export const updateBook = async (id: string, data: Book): Promise<Book> => {
    const res = await axios.put<Book>(`${API_RK}/users/books/${id}`, data);
    return res.data;
};

/** Xóa sách (DELETE /api/rookie/users/books/{id}) */
export const deleteBook = async (id: string): Promise<void> => {
    await axios.delete(`${API_RK}/users/books/${id}`);
};

export const createChapter = async (data: Chapter): Promise<Chapter> => {
    const res = await axios.post<Chapter>(`${API_RK}/users/books/chapters`, data);
    return res.data;
};

/** Lấy tất cả chapter (GET /api/rookie/users/books/chapters) */
export const getAllChapters = async (params?: {
    page?: number;
    size?: number;
    sort?: string[];
    q?: string;
    bookId?: string;
    publicationStatus?: string;
    progressStatus?: string;
    isActived?: string;
}) => {
    const res = await axios.get(`${API_RK}/users/books/chapters`, { params });
    return res.data;
};

/** Lấy chapter theo ID (GET /api/rookie/users/books/chapters/{id}) */
export const getChapterById = async (id: string): Promise<Chapter> => {
    const res = await axios.get<Chapter>(`${API_RK}/users/books/chapters/${id}`);
    return res.data;
};

/** Cập nhật chapter (PUT /api/rookie/users/books/chapters/{id}) */
export const updateChapter = async (id: string, data: Partial<Chapter>): Promise<Chapter> => {
    const res = await axios.put<Chapter>(`${API_RK}/users/books/chapters/${id}`, data);
    return res.data;
};

/** Xóa chapter */
export const deleteChapter = async (id: string): Promise<void> => {
    await axios.delete(`${API_RK}/users/books/chapters/${id}`);
};


export const createPage = async (data: Page): Promise<Page> => {
    const res = await axios.post<Page>(`${API_RK}/users/books/pages`, data);
    return res.data;
};

export const getAllPages = async (params?: {
    page?: number;
    size?: number;
    sort?: string[];
    q?: string;
    chapterId?: string;
    isActived?: string;
}) => {
    const res = await axios.get(`${API_RK}/users/books/pages`, { params });
    return res.data;
};

/** Lấy page theo ID (GET /api/rookie/users/books/pages/{id}) */
export const getPageById = async (id: string): Promise<Page> => {
    const res = await axios.get<Page>(`${API_RK}/users/books/pages/${id}`);
    return res.data;
};

/** Cập nhật page (PUT /api/rookie/users/books/pages/{id}) */
export const updatePage = async (id: string, data: Partial<Page>): Promise<Page> => {
    const res = await axios.put<Page>(`${API_RK}/users/books/pages/${id}`, data);
    return res.data;
};

/** Xóa page */
export const deletePage = async (id: string): Promise<void> => {
    await axios.delete(`${API_RK}/users/books/pages/${id}`);
};

/** Lấy sách theo ID (GET /api/rookie/users/books/{id}) */
export const getBookById = async (id: string): Promise<Book> => {
    const res = await axios.get<Book>(`${API_RK}/users/books/${id}`);
    return res.data;
};


// ==============================
// React Query Hooks
// ==============================

// BOOK hooks
export const useCreateBook = () =>
    useMutation({ mutationFn: (data: Book) => createBook(data) });

export const useDeleteBook = () =>
    useMutation({ mutationFn: (id: string) => deleteBook(id) });

/** Hook: lấy book theo id */
export const useGetBookById = (id?: string) =>
    useQuery({
        queryKey: ["book", id],
        queryFn: () => getBookById(id as string),
        enabled: !!id,
    });

// CHAPTER hooks
export const useCreateChapter = () =>
    useMutation({ mutationFn: (data: Chapter) => createChapter(data) });

export const useGetAllChapters = (params?: {
    page?: number;
    size?: number;
    sort?: string[];
    q?: string;
    bookId?: string;
    publicationStatus?: string;
    progressStatus?: string;
    isActived?: string;
}) =>
    useQuery({
        queryKey: ["chapters", params?.bookId ?? "all"],
        queryFn: () => getAllChapters(params),
        enabled: !!params?.bookId,   // chỉ fetch khi đã có bookId
        retry: 1,                    // tránh retry vô hạn nếu BE lỗi
    });


// GET CHAPTER BY ID hook
export const useGetChapterById = (id: string) =>
    useQuery({
        queryKey: ["chapter", id],
        queryFn: () => getChapterById(id),
        enabled: !!id, // chỉ chạy khi có id
    });

/** Hook: cập nhật chapter */
export const useUpdateChapter = () =>
    useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Chapter> }) => updateChapter(id, data) });

export const useDeleteChapter = () =>
    useMutation({ mutationFn: (id: string) => deleteChapter(id) });


// PAGE hooks
export const useCreatePage = () =>
    useMutation({ mutationFn: (data: Page) => createPage(data) });

export const useGetAllPages = (params?: {
    page?: number;
    size?: number;
    sort?: string[];
    q?: string;
    chapterId?: string;
    isActived?: string;
}) =>
    useQuery({
        queryKey: ["pages", params],
        queryFn: () => getAllPages(params),
    });

/** Hook: lấy page theo id */
export const useGetPageById = (id?: string) =>
    useQuery({
        queryKey: ["page", id],
        queryFn: () => getPageById(id as string),
        enabled: !!id,
    });

/** Hook: cập nhật page */
export const useUpdatePage = () =>
    useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Page> }) =>
            updatePage(id, data),
    });

export const useDeletePage = () =>
    useMutation({ mutationFn: (id: string) => deletePage(id) });

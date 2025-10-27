import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";

const BASE_URL = "http://localhost:8081/api/rookie/users/books";

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
    isActived?: string;
}

/** Tạo sách mới */
export const createBook = async (data: Book): Promise<Book> => {
    const res = await axios.post<Book>(`${BASE_URL}`, data);
    return res.data;
};

/** Cập nhật sách (PUT /api/rookie/users/books/{id}) */
export const updateBook = async (id: string, data: Book): Promise<Book> => {
    const res = await axios.put<Book>(`${BASE_URL}/${id}`, data);
    return res.data;
};

/** Xóa sách (DELETE /api/rookie/users/books/{id}) */
export const deleteBook = async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/${id}`);
};

export const createChapter = async (data: Chapter): Promise<Chapter> => {
    const res = await axios.post<Chapter>(`${BASE_URL}/chapters`, data);
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
    const res = await axios.get(`${BASE_URL}/chapters`, { params });
    return res.data;
};

/** Lấy chapter theo ID (GET /api/rookie/users/books/chapters/{id}) */
export const getChapterById = async (id: string): Promise<Chapter> => {
    const res = await axios.get<Chapter>(`${BASE_URL}/chapters/${id}`);
    return res.data;
};

/** Cập nhật chapter (PUT /api/rookie/users/books/chapters/{id}) */
export const updateChapter = async (id: string, data: Partial<Chapter>): Promise<Chapter> => {
    const res = await axios.put<Chapter>(`${BASE_URL}/chapters/${id}`, data);
    return res.data;
};

/** Xóa chapter */
export const deleteChapter = async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/chapters/${id}`);
};


export const createPage = async (data: Page): Promise<Page> => {
    const res = await axios.post<Page>(`${BASE_URL}/pages`, data);
    return res.data;
};

/** Xóa page */
export const deletePage = async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/pages/${id}`);
};

/** Lấy sách theo ID (GET /api/rookie/users/books/{id}) */
export const getBookById = async (id: string): Promise<Book> => {
    const res = await axios.get<Book>(`${BASE_URL}/${id}`);
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
        queryKey: ["chapters", params],
        queryFn: () => getAllChapters(params),
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

export const useDeletePage = () =>
    useMutation({ mutationFn: (id: string) => deletePage(id) });

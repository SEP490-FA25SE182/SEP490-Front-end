import axios from "axios";
import { useMutation } from "@tanstack/react-query";

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


// ==============================
// React Query Hooks
// ==============================

// BOOK hooks
export const useCreateBook = () =>
    useMutation({ mutationFn: (data: Book) => createBook(data) });

export const useDeleteBook = () =>
    useMutation({ mutationFn: (id: string) => deleteBook(id) });

// CHAPTER hooks
export const useCreateChapter = () =>
    useMutation({ mutationFn: (data: Chapter) => createChapter(data) });

export const useDeleteChapter = () =>
    useMutation({ mutationFn: (id: string) => deleteChapter(id) });


// PAGE hooks
export const useCreatePage = () =>
    useMutation({ mutationFn: (data: Page) => createPage(data) });

export const useDeletePage = () =>
    useMutation({ mutationFn: (id: string) => deletePage(id) });

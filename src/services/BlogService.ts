import axios from "axios";
import { API_BASE_URL } from "@/config";
import { resolveFirebaseUrl } from "@/firebase";

/* -----------------------------------------
 🧩 Interface BlogPost
----------------------------------------- */
export interface BlogPost {
  blogId: string;
  title: string;
  content: string;
  coverUrl?: string | null; // lưu gs:// trong DB
  authorId: string;
  bookId?: string | null;
  isActived: "ACTIVE" | "INACTIVE" | "BANNED";
  tagIds?: string[];
  tagNames?: string[];
  updatedAt: string;
}

/* -----------------------------------------
 🧩 Interface tạo bài viết mới
----------------------------------------- */
export interface CreateBlogRequest {
  title: string;
  coverUrl?: string | null; // gửi gs:// về DB
  content: string;
  authorId: string;
  bookId?: string | null;
  isActived: "ACTIVE";
  tagIds?: string[];
}

/* -----------------------------------------
 🧩 BlogService
----------------------------------------- */
export const BlogService = {
  // 🔹 Lấy tất cả bài viết
  async getAll(): Promise<BlogPost[]> {
    const res = await axios.get(`${API_BASE_URL}/blogs/search`);
    const data = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.content)
      ? res.data.content
      : [];

    // ✅ convert gs:// thành link hiển thị https://
    const blogs = await Promise.all(
      data.map(async (b: BlogPost) => ({
        ...b,
        coverUrl: await resolveFirebaseUrl(b.coverUrl || ""),
      }))
    );
    return blogs;
  },

  // 🔹 Lấy bài viết theo ID
  async getById(blogId: string): Promise<BlogPost> {
    const res = await axios.get(`${API_BASE_URL}/blogs/${blogId}`);
    const blog = res.data;

    return {
      ...blog,
      coverUrl: await resolveFirebaseUrl(blog.coverUrl || ""),
    };
  },

  // 🔹 Tạo bài viết mới (coverUrl là gs://...)
  async create(data: CreateBlogRequest): Promise<BlogPost> {
    const payload = {
      ...data,
      bookId: data.bookId ?? null,
    };

    const res = await axios.post(`${API_BASE_URL}/blogs`, [payload], {
      headers: { "Content-Type": "application/json" },
    });

    const created = Array.isArray(res.data) ? res.data[0] : res.data;

    return {
      ...created,
      coverUrl: await resolveFirebaseUrl(created.coverUrl || ""),
    };
  },

  // 🔹 Cập nhật bài viết (có thể cập nhật lại coverUrl gs://...)
  async update(blogId: string, data: Partial<CreateBlogRequest>): Promise<BlogPost> {
    const res = await axios.put(`${API_BASE_URL}/blogs/${blogId}`, data);
    const updated = res.data;
    return {
      ...updated,
      coverUrl: await resolveFirebaseUrl(updated.coverUrl || ""),
    };
  },

  // 🔹 Xóa bài viết
  async remove(blogId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/blogs/${blogId}`);
  },

  // 🔹 Tìm kiếm bài viết (mặc định chỉ lấy ACTIVE)
  async search(params: {
    title?: string;
    content?: string;
    authorId?: string;
    bookId?: string;
    isActived?: "ACTIVE" | "INACTIVE" | "BANNED";
    tagIds?: string[];
    page?: number;
    size?: number;
    sort?: string[];
  }): Promise<BlogPost[]> {
    const res = await axios.get(`${API_BASE_URL}/blogs/search`, { params });
    const data = res.data.content ?? res.data;

    const blogs = await Promise.all(
      data.map(async (b: BlogPost) => ({
        ...b,
        coverUrl: await resolveFirebaseUrl(b.coverUrl || ""),
      }))
    );
    return blogs;
  },

  // 🔹 Lọc bài viết (ví dụ chỉ lấy ACTIVE)
  async filter(params: {
    isActived?: "ACTIVE" | "INACTIVE" | "BANNED";
    tagIds?: string[];
    page?: number;
    size?: number;
    sort?: string[];
  }): Promise<BlogPost[]> {
    const res = await axios.get(`${API_BASE_URL}/blogs/filter`, { params });
    const data = res.data.content ?? res.data;

    const blogs = await Promise.all(
      data.map(async (b: BlogPost) => ({
        ...b,
        coverUrl: await resolveFirebaseUrl(b.coverUrl || ""),
      }))
    );
    return blogs;
  },

  // 🔹 Lấy blog của user cụ thể
  async getByUser(authorId: string): Promise<BlogPost[]> {
    const res = await axios.get(`${API_BASE_URL}/blogs/search/user`, {
      params: { authorId },
    });
    const blogs = Array.isArray(res.data) ? res.data : res.data.content ?? [];

    return Promise.all(
      blogs.map(async (b: BlogPost) => ({
        ...b,
        coverUrl: await resolveFirebaseUrl(b.coverUrl || ""),
      }))
    );
  },
};

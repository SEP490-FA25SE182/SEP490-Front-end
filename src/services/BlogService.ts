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



/* =======================================================
   💬 INTERFACE COMMENT
======================================================= */
export interface Comment {
  commentId: string;
  content: string;
  isPublished: boolean;
  userId: string;
  blogId: string;
  createdAt: string;
  updatedAt: string;
  isActived: "ACTIVE" | "INACTIVE";
}

/* =======================================================
   💡 REQUEST BODY
======================================================= */

// 🔹 Body khi tạo mới comment
export interface CreateCommentRequest {
  content: string;
  isPublished: boolean;
  userId: string;
  blogId: string;
  isActived: "ACTIVE" | "INACTIVE";
}

// 🔹 Body khi cập nhật comment
export interface UpdateCommentRequest {
  content: string;
  isPublished: boolean;
  userId: string;
  blogId: string;
  isActived: "ACTIVE" | "INACTIVE";
}

/* =======================================================
   ⚙️ COMMENT SERVICE
======================================================= */
export const CommentService = {
  // 🔹 Lấy tất cả comment (GET /api/rookie/users/comments)
  async getAll(params?: {
    userId?: string;
    blogId?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<Comment[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.append("userId", params.userId);
    if (params?.blogId) query.append("blogId", params.blogId);
    if (params?.page !== undefined) query.append("page", String(params.page));
    if (params?.size !== undefined) query.append("size", String(params.size));
    if (params?.sort) query.append("sort", params.sort);

    const url = `${API_BASE_URL}/users/comments${query.toString() ? `?${query}` : ""}`;
    const res = await axios.get(url);
    const data = res.data;

    // ✅ Nếu backend trả dạng PageResponse thì chỉ lấy phần content
    if (Array.isArray(data?.content)) {
      return data.content;
    }

    // ✅ Nếu backend trả về list thuần
    return data;
  },

  // 🔹 Lấy comment theo ID (GET /api/rookie/users/comments/{id})
  async getById(id: string): Promise<Comment> {
    const res = await axios.get(`${API_BASE_URL}/users/comments/${id}`);
    return res.data;
  },

  // 🔹 Tạo mới comment (POST /api/rookie/users/comments)
  async create(data: CreateCommentRequest): Promise<Comment> {
    const res = await axios.post(`${API_BASE_URL}/users/comments`, data);
    return res.data;
  },

  // 🔹 Cập nhật comment (PUT /api/rookie/users/comments/{id})
   async update(id: string, data: UpdateCommentRequest): Promise<Comment> {
    const res = await axios.put(`${API_BASE_URL}/users/comments/${id}`, data);
    return res.data;
  },

  // 🔹 Xóa comment (DELETE /api/rookie/users/comments/{id})
  async remove(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/users/comments/${id}`);
  },
};



/* =======================================================
   🏷️ INTERFACES
======================================================= */

/**
 * Tag (Hashtag)
 */
export interface Tag {
  tagId: string;
  name: string;
  isActived: "ACTIVE" | "INACTIVE";
}

/**
 * Body khi tạo mới tag (POST)
 * ➤ Backend yêu cầu gửi MẢNG
 */
export interface CreateTagRequest {
  name: string;
  isActived: "ACTIVE" | "INACTIVE";
}

/**
 * Body khi cập nhật tag (PUT)
 */
export interface UpdateTagRequest {
  name?: string;
  isActived?: "ACTIVE" | "INACTIVE";
}

/* =======================================================
   ⚙️ TAG SERVICE
======================================================= */
export const TagService = {
  // 🔹 Lấy tất cả tag
  async getAll(): Promise<Tag[]> {
    const res = await axios.get(`${API_BASE_URL}/tags`);
    const data = res.data;
    if (Array.isArray(data?.content)) return data.content;
    return data;
  },

  // 🔹 Lấy tag theo ID
  async getById(id: string): Promise<Tag> {
    const res = await axios.get(`${API_BASE_URL}/tags/${id}`);
    return res.data;
  },

  // 🔹 Tạo mới tag (POST /api/rookie/tags)
  // ⚠️ Backend yêu cầu gửi MẢNG
  async create(tags: CreateTagRequest[]): Promise<Tag[]> {
    const res = await axios.post(`${API_BASE_URL}/tags`, tags);
    return res.data;
  },

  // 🔹 Cập nhật tag (PUT /api/rookie/tags/{id})
  async update(id: string, data: UpdateTagRequest): Promise<Tag> {
    const res = await axios.put(`${API_BASE_URL}/tags/${id}`, data);
    return res.data;
  },

  // 🔹 Xóa tag (DELETE /api/rookie/tags/{id})
  async remove(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/tags/${id}`);
  },

  // 🔹 Tìm kiếm tag theo tên (GET /api/rookie/tags/search?keyword=xxx)
  async search(keyword: string): Promise<Tag[]> {
    const res = await axios.get(`${API_BASE_URL}/tags/search`, {
      params: { keyword },
    });
    const data = res.data;
    if (Array.isArray(data?.content)) return data.content;
    return data;
  },
};
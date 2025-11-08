import React, { useEffect, useState } from "react";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  MessageCircle,
  PlusCircle,
  Upload,
  Search,
  Trash2,
  Loader2,
  Send,
  Edit2,
  Eye,
  Tag as TagIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  BlogService,
  type BlogPost,
  CommentService,
  type Comment,
} from "@/services/BlogService";
import { TagService, type Tag } from "@/services/BlogService";
import { getAllBooks, type Book } from "@/services/BookService";
import { UploadService } from "@/services/FirebaseService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getUserById, type User } from "@/services/UserService";
import { useNavigate } from "react-router-dom";

/* =======================================================
   🗨️ CommentDialog Component
======================================================= */
const CommentDialog: React.FC<{ blogId: string; currentUserId?: string }> = ({
  blogId,
  currentUserId,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadComments = async () => {
    try {
      const data = await CommentService.getAll({ blogId });
      setComments(data);

      const ids = [...new Set(data.map((c) => c.userId))];
      const fetched = await Promise.all(ids.map((id) => getUserById(id)));
      const mapped: Record<string, User> = {};
      fetched.forEach((u) => (mapped[u.userId] = u));
      setUsers(mapped);
    } catch {
      toast.error("Không thể tải bình luận!");
    }
  };

  useEffect(() => {
    loadComments();
  }, [blogId]);

  const handleAdd = async () => {
    if (!newContent.trim()) return toast.warning("Vui lòng nhập bình luận!");
    if (!currentUserId) return toast.warning("Bạn cần đăng nhập!");

    try {
      await CommentService.create({
        content: newContent,
        isPublished: true,
        userId: currentUserId,
        blogId,
        isActived: "ACTIVE",
      });
      setNewContent("");
      loadComments();
      toast.success("Đã gửi bình luận!");
    } catch {
      toast.error("Không thể gửi bình luận!");
    }
  };

  const handleEdit = async (commentId: string, nextContent: string) => {
    const base = comments.find((x) => x.commentId === commentId);
    if (!base) return;

    const payload = {
      content: nextContent,
      isPublished: base.isPublished,
      userId: base.userId,
      blogId: base.blogId,
      isActived: base.isActived,
    };

    try {
      await CommentService.update(commentId, payload);
      setEditingId(null);
      await loadComments();
      toast.success("Đã cập nhật bình luận!");
    } catch {
      toast.error("Không thể cập nhật bình luận!");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-gray-300 hover:text-blue-400"
        >
          <MessageCircle size={18} /> Bình luận ({comments.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-[#1e1e2e] text-white border border-white/10 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>💬 Bình luận bài viết</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-gray-400 text-sm">Chưa có bình luận nào.</p>
          )}
          {comments.map((c) => {
            const user = users[c.userId];
            const isMine = c.userId === currentUserId;
            return (
              <div key={c.commentId} className="bg-white/5 p-3 rounded-xl">
                <div className="flex items-start gap-3">
                  <img
                    src={user?.avatarUrl || `https://i.pravatar.cc/100?u=${c.userId}`}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">
                      {user?.fullName || "Người dùng"}
                    </p>

                    {editingId === c.commentId ? (
                      <div className="mt-2">
                        <Textarea
                          value={c.content}
                          onChange={(e) =>
                            setComments((prev) =>
                              prev.map((x) =>
                                x.commentId === c.commentId
                                  ? { ...x, content: e.target.value }
                                  : x
                              )
                            )
                          }
                          className="bg-white/10 border-white/20 text-white text-sm"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(c.commentId, c.content)}
                          >
                            Lưu
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap">
                        {c.content}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  {isMine && editingId !== c.commentId && (
                    <button
                      onClick={() => setEditingId(c.commentId)}
                      className="text-gray-400 hover:text-yellow-400"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Input
            placeholder="Viết bình luận..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="bg-white/10 border-white/20 text-white"
          />
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
            <Send size={16} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* =======================================================
   🧩 BlogCard Component
======================================================= */
const BlogCard: React.FC<{
  post: BlogPost;
  currentUserId?: string;
  onDelete?: (id: string) => void;
}> = ({ post, currentUserId, onDelete }) => {
  const [author, setAuthor] = useState<User | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const navigate = useNavigate();
  const isMine = post.authorId === currentUserId;

  useEffect(() => {
    (async () => {
      const user = await getUserById(post.authorId);
      setAuthor(user);
      const comments = await CommentService.getAll({ blogId: post.blogId });
      setCommentCount(comments.length);
    })();
  }, [post.blogId, post.authorId]);

  // 🔹 Chuyển #TênSách -> Link
  const renderHashtags = (text: string) =>
    text.split(/(\#[A-Za-zÀ-ỹ0-9_]+)/g).map((part, idx) =>
      part.startsWith("#") ? (
        <span
          key={idx}
          onClick={() => navigate(`/book/${part.substring(1)}`)}
          className="text-blue-400 cursor-pointer hover:underline"
        >
          {part}
        </span>
      ) : (
        part
      )
    );

  return (
    <div className="bg-white/10 rounded-2xl p-5 mb-6 border border-white/10 hover:bg-white/20 transition-all shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <img
            src={author?.avatarUrl || `https://i.pravatar.cc/100?u=${post.authorId}`}
            alt={author?.fullName || "User"}
            className="w-10 h-10 rounded-full border border-white/20"
          />
          <div>
            <p className="text-white font-semibold">{author?.fullName || "Đang tải..."}</p>
            <p className="text-xs text-gray-400">
              {new Date(post.updatedAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>

        {isMine && (
          <button
            onClick={() => onDelete?.(post.blogId)}
            className="text-red-400 hover:text-red-500"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>

      {/* Content */}
      <div className="text-white leading-relaxed mb-3 whitespace-pre-wrap">
        {renderHashtags(post.content)}
      </div>

      {/* Image */}
      {post.coverUrl && (
        <div className="rounded-xl overflow-hidden mb-3">
          <img src={post.coverUrl} alt={post.title} className="w-full object-contain rounded-xl" />
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-gray-300 pt-3 border-t border-white/10">
        <div className="flex items-center gap-4">
          <Heart size={18} className="hover:text-pink-400 cursor-pointer" />
          <CommentDialog blogId={post.blogId} currentUserId={currentUserId} />
        </div>

        <div className="flex items-center gap-4 text-gray-400 text-sm">
          <Eye size={16} /> {Math.floor(Math.random() * 400 + 50)} lượt xem
          <MessageCircle size={16} /> {commentCount}
        </div>
      </div>
    </div>
  );
};

/* =======================================================
   🧩 BlogPage
======================================================= */
export default function BlogPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", coverUrl: "" });
  const [bookSuggestions, setBookSuggestions] = useState<Book[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [tagData, bookData] = await Promise.all([TagService.getAll(), getAllBooks()]);
        setTags(tagData);
        setBooks(bookData);
      } catch {
        toast.error("Không thể tải dữ liệu!");
      }
    })();
  }, []);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const data = await BlogService.getAll();
      const activePosts = data.filter((b) => b.isActived === "ACTIVE");
      const sorted = [...activePosts].sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
      setPosts(sorted);
    } catch {
      toast.error("Không thể tải bài viết!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [sortOrder]);

  // 🔹 Tìm hashtag -> gợi ý sách
  const handleContentChange = (text: string) => {
    setNewPost((prev) => ({ ...prev, content: text }));
    const match = text.match(/#([^\s#]*)$/);
    if (match && match[1].length > 0) {
      const keyword = match[1].toLowerCase();
      const suggestions = books.filter((b) =>
        b.bookName.toLowerCase().includes(keyword)
      );
      setBookSuggestions(suggestions.slice(0, 5));
    } else setBookSuggestions([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const gsUrl = await UploadService.uploadImageToFirebase(file, "blog");
      setNewPost((prev) => ({ ...prev, coverUrl: gsUrl }));
      toast.success("Tải ảnh thành công!");
    } catch {
      toast.error("Không thể tải ảnh!");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newPost.content.trim()) return toast.warning("Vui lòng nhập nội dung!");
    const payload = {
      title: newPost.title || "Bài viết mới",
      coverUrl: newPost.coverUrl || null,
      content: newPost.content,
      authorId: user?.userId || "guest",
      isActived: "ACTIVE" as const,
      tagIds: selectedTags,
      bookId: null,
    };
    try {
      const created = await BlogService.create(payload);
      setPosts((prev) => [created, ...prev]);
      setNewPost({ title: "", content: "", coverUrl: "" });
      toast.success("🎉 Đăng bài thành công!");
    } catch {
      toast.error("Không thể đăng bài!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xoá bài viết này không?")) return;
    try {
      await BlogService.remove(id);
      setPosts((prev) => prev.filter((p) => p.blogId !== id));
      toast.success("🗑️ Đã xoá bài viết!");
    } catch {
      toast.error("Không thể xoá bài viết!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="container mx-auto px-6 py-12 text-white">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-wide">
            Cộng đồng chia sẻ & đánh giá
          </h1>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <PlusCircle className="mr-2 w-5 h-5" /> Tạo bài viết
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg bg-[#1e1e2e] text-white border border-white/10">
              <DialogHeader>
                <DialogTitle>📝 Tạo bài viết mới</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 relative">
                <Label>Tiêu đề</Label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Label>Nội dung</Label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />

                {/* Gợi ý sách */}
                {bookSuggestions.length > 0 && (
                  <div className="absolute z-10 bg-[#2a2a3e] border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto">
                    {bookSuggestions.map((b) => (
                      <div
                        key={b.bookId}
                        onClick={() =>
                          setNewPost((prev) => ({
                            ...prev,
                            content: prev.content.replace(
                              /#([^\s#]*)$/,
                              `#${b.bookId}`
                            ),
                          }))
                        }
                        className="px-3 py-1 hover:bg-white/10 cursor-pointer text-sm text-white"
                      >
                        📘 {b.bookName}
                      </div>
                    ))}
                  </div>
                )}

                <Label>Ảnh minh họa (tùy chọn)</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
              </div>

              <DialogFooter>
                <Button onClick={handleSubmit} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải...
                    </>
                  ) : (
                    "Đăng bài"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex justify-center mb-8">
          <div className="relative w-full md:w-1/2 flex gap-2">
            <Input
              placeholder="Tìm kiếm bài viết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={() =>
                BlogService.search({ title: searchTerm, content: searchTerm }).then((res) =>
                  setPosts(res)
                )
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Search size={18} />
            </Button>
          </div>
        </div>

        <Separator className="bg-white/20 mb-10" />

        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-white" size={32} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {posts.length > 0 ? (
              posts.map((p) => (
                <BlogCard
                  key={p.blogId}
                  post={p}
                  currentUserId={user?.userId}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <p className="text-center text-gray-400 py-10">
                Không có bài viết nào 🕵️
              </p>
            )}
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}

import React, { useEffect, useState } from "react";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Heart, Share2, MessageCircle, PlusCircle, Upload, Search, Trash2, Loader2 } from "lucide-react";
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
import { BlogService, type BlogPost } from "@/services/BlogService";
import { UploadService } from "@/services/FirebaseService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getUserById, type User } from "@/services/UserService";

/* -------------------------------------------
 🧩 BlogCard component
------------------------------------------- */
const BlogCard: React.FC<{
  post: BlogPost;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}> = ({ post, onDelete, currentUserId }) => {
  const [author, setAuthor] = useState<User | null>(null);
  const isMine = post.authorId === currentUserId;

  useEffect(() => {
    (async () => {
      const user = await getUserById(post.authorId);
      setAuthor(user);
    })();
  }, [post.authorId]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-white/10 hover:bg-white/20 transition-all duration-300 shadow-lg">
      {/* 🔹 Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <img
            src={
              author?.avatarUrl ||
              `https://i.pravatar.cc/100?u=${post.authorId}`
            }
            alt={author?.fullName || "User"}
            className="w-10 h-10 rounded-full border border-white/20"
          />
          <div>
            <p className="text-white font-semibold">
              {author?.fullName || "Đang tải..."}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(post.updatedAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>

        {isMine && (
          <button
            onClick={() => onDelete?.(post.blogId)}
            className="text-red-400 hover:text-red-500"
            title="Xóa bài viết"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* 🔹 Nội dung */}
      <div className="text-white leading-relaxed mb-3 whitespace-pre-wrap">
        {post.content}
      </div>

      {/* 🔹 Ảnh bài viết */}
      {post.coverUrl && (
        <div className="rounded-xl overflow-hidden mb-3">
          <img
            src={post.coverUrl}
            alt={post.title}
            className="w-full object-contain rounded-xl bg-black/20"
          />
        </div>
      )}

      {/* 🔹 Hành động */}
      <div className="flex justify-around items-center text-gray-300 pt-3 border-t border-white/10">
        <button className="flex items-center gap-2 hover:text-pink-400 transition">
          <Heart size={18} /> Thích
        </button>
        <button className="flex items-center gap-2 hover:text-blue-400 transition">
          <MessageCircle size={18} /> Bình luận
        </button>
        <button className="flex items-center gap-2 hover:text-green-400 transition">
          <Share2 size={18} /> Chia sẻ
        </button>
      </div>
    </div>
  );
};



/* -------------------------------------------
 🧩 BlogPage Component
------------------------------------------- */
export default function BlogPage() {
  const { user } = useAuth(); // user chứa userId, role, email, v.v.
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);


  // 🔹 Bài viết mới
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    coverUrl: "",
  });

  /* ---------------------------------------
   🧩 Load danh sách bài viết
  --------------------------------------- */
  const loadBlogs = async () => {
    try {
      setLoading(true);
      const data = await BlogService.getAll();

      // ✅ Lọc bỏ bài không ACTIVE
      const activePosts = data.filter((b) => b.isActived === "ACTIVE");

      // ✅ Sắp xếp
      const sorted = [...activePosts].sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
      setPosts(sorted);
    } catch (err) {
      toast.error("Không thể tải bài viết");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [sortOrder]);

  /* ---------------------------------------
   🔍 Tìm kiếm realtime
  --------------------------------------- */
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchTerm.trim()) return loadBlogs();
      try {
        const result = await BlogService.search({
          title: searchTerm,
          content: searchTerm,
          sort: ["updatedAt,desc"],
        });

        // ✅ Chỉ giữ lại bài viết ACTIVE
        const activeResults = result.filter((b) => b.isActived === "ACTIVE");
        setPosts(activeResults);
      } catch {
        toast.error("Không thể tìm kiếm bài viết");
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  /* ---------------------------------------
   📤 Upload ảnh Firebase
  --------------------------------------- */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true); // 🔹 bắt đầu upload
      toast.info("Đang tải ảnh lên Firebase...");

      const gsUrl = await UploadService.uploadImageToFirebase(file, "blog");
      setNewPost((prev) => ({ ...prev, coverUrl: gsUrl }));

      toast.success("Tải ảnh thành công!");
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải ảnh lên Firebase!");
    } finally {
      setUploading(false); // 🔹 kết thúc upload
    }
  };



  /* ---------------------------------------
   ✍️ Tạo bài viết mới
  --------------------------------------- */
  const handleSubmit = async () => {
    if (!newPost.content.trim()) {
      toast.warning("Vui lòng nhập nội dung!");
      return;
    }

    try {
      // 🟢 coverUrl đã là link thật từ Firebase
      const payload = {
        title: newPost.title || "Bài viết mới",
        coverUrl: newPost.coverUrl || null, // URL Firebase
        content: newPost.content,
        authorId: user?.userId || "guest",
        isActived: "ACTIVE" as const,
        tagIds: [],
        bookId: null,
      };

      const created = await BlogService.create(payload);
      setPosts((prev) => [created, ...prev]);
      setNewPost({ title: "", content: "", coverUrl: "" });
      toast.success("🎉 Đăng bài thành công!");
    } catch (error) {
      console.error(error);
      toast.error("Không thể đăng bài!");
    }
  };


  /* ---------------------------------------
   🗑️ Xóa bài viết
  --------------------------------------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await BlogService.remove(id);
      setPosts((prev) => prev.filter((p) => p.blogId !== id));
      toast.success("Đã xóa bài viết!");
    } catch {
      toast.error("Không thể xóa bài viết!");
    }
  };

  /* ---------------------------------------
   🧩 Render
  --------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="container mx-auto px-6 py-12 text-white">
        {/* 🔹 Header + Tạo bài viết */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-wide">
            Cộng đồng chia sẻ & đánh giá
          </h1>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <PlusCircle className="mr-2 w-5 h-5" />
                Tạo bài viết
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg bg-[#1e1e2e] text-white border border-white/10">
              <DialogHeader>
                <DialogTitle>📝 Tạo bài viết mới</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Label>Tiêu đề</Label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Nhập tiêu đề..."
                  className="bg-white/10 border-white/20 text-white"
                />

                <Label>Nội dung</Label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Chia sẻ cảm nhận hoặc kinh nghiệm của bạn..."
                  className="bg-white/10 border-white/20 text-white"
                />

                <Label>Ảnh minh họa (tùy chọn)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Upload size={20} />
                </div>

                {newPost.coverUrl && (
                  <img
                    src={newPost.coverUrl}
                    alt="preview"
                    className="rounded-lg mt-3 w-full h-40 object-cover"
                  />
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className={`${uploading ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    } text-white`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải ảnh...
                    </>
                  ) : (
                    "Đăng bài"
                  )}
                </Button>

              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 🔍 Thanh tìm kiếm */}
        <div className="flex justify-center mb-8">
          <div className="relative w-full md:w-1/2">
            <Input
              placeholder="Tìm kiếm bài viết theo tiêu đề hoặc nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        {/* ⚪ Bộ lọc sắp xếp */}
        <div className="flex justify-center mb-8">
          <RadioGroup
            defaultValue="newest"
            onValueChange={(val) => setSortOrder(val as "newest" | "oldest")}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="newest"
                id="newest"
                className="border-white data-[state=checked]:bg-white"
              />
              <Label htmlFor="newest" className="text-white">Mới nhất</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="oldest"
                id="oldest"
                className="border-white data-[state=checked]:bg-white"
              />
              <Label htmlFor="oldest" className="text-white">Cũ nhất</Label>
            </div>
          </RadioGroup>
        </div>

        <Separator className="bg-white/20 mb-10" />

        {/* 📜 Danh sách bài viết */}
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-white" size={32} />
          </div>
        ) : posts.length > 0 ? (
          <div className="max-w-2xl mx-auto">
            {posts.length > 0 ? (
              posts.map((p) => (
                <BlogCard
                  key={p.blogId}
                  post={p}
                  onDelete={handleDelete}
                  currentUserId={user?.userId}
                />
              ))
            ) : (
              <p className="text-center text-gray-400 py-10">Không có bài viết nào 🕵️</p>
            )}
          </div>

        ) : (
          <p className="text-center text-gray-400">Không có bài viết nào 🕵️</p>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}

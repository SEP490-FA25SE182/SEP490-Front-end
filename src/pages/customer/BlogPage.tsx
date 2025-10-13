import React, { useState } from "react";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";

// Dán interface BlogPost và posts ở đây
interface BlogPost {
  id: string;
  author: string;
  avatar: string;
  type: "review" | "share";
  content: string;
  bookTitle?: string; // chỉ có nếu là review
  rating?: number; // chỉ có nếu là review
  date: string;
}

const posts: BlogPost[] = [
  {
    id: "1",
    author: "Nguyễn Văn A",
    avatar: "https://i.pravatar.cc/100?img=12",
    type: "review",
    content: "Mình đã mua và đọc 'Nhà Giả Kim' — cực kỳ ý nghĩa, đọc xong cảm thấy có động lực hơn!",
    bookTitle: "Nhà Giả Kim",
    rating: 5,
    date: "2025-03-15"
  },
  {
    id: "2",
    author: "Trần Thị B",
    avatar: "https://i.pravatar.cc/100?img=15",
    type: "share",
    content: "Góc nhỏ chia sẻ: Mình thường đọc sách vào buổi sáng, lúc đó đầu óc rất tỉnh táo. Các bạn thử xem nhé!",
    date: "2025-04-10"
  },
  {
    id: "3",
    author: "Phạm Quang C",
    avatar: "https://i.pravatar.cc/100?img=5",
    type: "review",
    content: "Cuốn 'Dế Mèn Phiêu Lưu Ký' rất phù hợp cho thiếu nhi, có hình minh họa sinh động.",
    bookTitle: "Dế Mèn Phiêu Lưu Ký",
    rating: 4,
    date: "2025-05-02"
  }
];

// Dán BlogCard ở đây
const BlogCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <div className="bg-white/10 p-5 rounded-xl shadow-md hover:bg-white/20 transition">
    <div className="flex items-center mb-3">
      <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full mr-3" />
      <div>
        <h4 className="text-white font-semibold">{post.author}</h4>
        <p className="text-xs text-gray-300">{new Date(post.date).toLocaleDateString()}</p>
      </div>
    </div>

    {post.type === "review" && (
      <p className="text-yellow-400 flex items-center mb-1">
        {Array.from({ length: post.rating ?? 0 }).map((_, i) => (
          <Star key={i} size={16} fill="#facc15" stroke="none" />
        ))}
      </p>
    )}

    <p className="text-white mb-2">{post.content}</p>
    {post.bookTitle && (
      <p className="text-sm text-blue-300 italic">📘 {post.bookTitle}</p>
    )}

    <span
      className={`inline-block mt-3 px-3 py-1 text-xs font-semibold rounded-full ${
        post.type === "review"
          ? "bg-yellow-500/30 text-yellow-300"
          : "bg-purple-500/30 text-purple-300"
      }`}
    >
      {post.type === "review" ? "Đánh giá" : "Chia sẻ"}
    </span>
  </div>
);

export default function BlogPage() {
  const [filter, setFilter] = useState<"all" | "review" | "share">("all");

  const filteredPosts = posts.filter(
    (p) => filter === "all" || p.type === filter
  );

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="container mx-auto px-6 py-12 text-white">
        <h1 className="text-3xl font-bold text-center mb-8 uppercase tracking-wide">
          Cộng đồng chia sẻ & đánh giá
        </h1>

        {/* Bộ lọc */}
        <div className="flex justify-center mb-8">
          <RadioGroup
            defaultValue="all"
            onValueChange={(val) => setFilter(val as any)}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" className="peer border-gray-400 data-[state=checked]:bg-white data-[state=checked]:border-white" />
              <Label htmlFor="all">Tất cả</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="share" id="share" className="peer border-gray-400 data-[state=checked]:bg-white data-[state=checked]:border-white" />
              <Label htmlFor="share">Chia sẻ</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="review" id="review" className="peer border-gray-400 data-[state=checked]:bg-white data-[state=checked]:border-white" />
              <Label htmlFor="review">Đánh giá (Review)</Label>
            </div>
          </RadioGroup>
        </div>

        <Separator className="bg-white/20 mb-10" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}

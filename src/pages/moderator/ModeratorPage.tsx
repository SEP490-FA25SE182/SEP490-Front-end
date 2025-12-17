import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBooks } from "@/services/BookService";
import ModeratorLayout from "./ModeratorLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getAllUsers } from "@/services/UserService";

/** ✅ helper: convert gs://... -> https firebase download url (giống CustomerHeader) */
function gsToHttp(url?: string | null) {
  if (!url) return "";
  if (!url.startsWith("gs://")) return url;

  const parts = url.split("/");
  const bucket = parts[2];
  const path = parts.slice(3).join("/");

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

const DEFAULT_AVATAR = "https://avatar.iran.liara.run/public/boy?username=default";

export default function ModeratorPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [searchQuery] = useState("");
  const [booksState, setBooksState] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // 🔹 Lấy thật nhiều sách để không miss sách PENDING
        const [books, allUsers] = await Promise.all([
          // lấy 0–1000, bạn có thể tăng thêm nếu cần
          getAllBooks({ page: 0, size: 1000 }),
          getAllUsers(),
        ]);

        // 🔹 Chỉ giữ sách PENDING (3 hoặc "PENDING")
        const pendingBooks = (books ?? []).filter((b: any) => {
          const rawPub = b.publicationStatus ?? b.publication_status ?? b.status;
          if (rawPub == null) return false;

          const rawStr = String(rawPub).trim();
          const upper = rawStr.toUpperCase();
          const num = Number(rawStr);

          const isPending = num === 3 || upper === "PENDING";
          return isPending;
        });

        // 🔹 Lấy authorId từ các sách PENDING
        const authorIdSet = new Set(
          pendingBooks.map((b: any) => String(b.authorId))
        );

        const userMap = new Map(
          (allUsers ?? []).map((u: any) => [String(u.userId), u])
        );

        const authors = [...authorIdSet]
          .map((id) => userMap.get(id))
          .filter(Boolean);

        setUsers(authors as any[]);
        setBooksState(pendingBooks);
      } catch (err) {
        console.error("❌ Load moderator users failed", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = (u.fullName ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const keyword = searchQuery.toLowerCase();
      return name.includes(keyword) || email.includes(keyword);
    });
  }, [users, searchQuery]);

  return (
    <ModeratorLayout
      title="Tác giả cần kiểm duyệt"
      breadcrumb={[{ label: "Moderator" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredUsers.map((u) => (
          <Card
            key={u.userId}
            className="bg-white/5 hover:bg-white/10 cursor-pointer"
            onClick={() => {
              const relatedBooks = booksState.filter(
                (b: any) => String(b.authorId) === String(u.userId)
              );

              navigate(`/moderator/authors/${u.userId}/books`, {
                state: { books: relatedBooks },
              });
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <img
                  src={gsToHttp(u.avatarUrl) || DEFAULT_AVATAR}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
                <div className="flex flex-col text-white">
                  <span>{u.fullName}</span>
                  <span className="text-xs text-gray-400">{u.email}</span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="text-sm text-gray-300">
              {u.fullName} có sách cần duyệt
            </CardContent>
          </Card>
        ))}
      </div>
    </ModeratorLayout>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBooks } from "@/services/BookService";
import ModeratorLayout from "./ModeratorLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getAllUsers } from "@/services/UserService";

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

        // giờ không cần chaptersRes nữa, nhưng có thể giữ Promise.all cho dễ
        const [books, /* chaptersRes */, allUsers = []] = await Promise.all([
          getAllBooks(),
          // getAllChapters({ progressStatus: "0" }),
          getAllUsers(),
        ]);

        // 🔹 chỉ lấy sách PENDING (3)
        const visibleBooks = books.filter((b: any) => {
          const rawPub =
            b.publicationStatus ??
            b.publication_status ??
            b.status;

          if (rawPub == null) return false;

          const rawStr = String(rawPub).trim();
          const upper = rawStr.toUpperCase();
          const num = Number(rawStr);

          const isPending = num === 3 || upper === "PENDING";
          return isPending;
        });

        // Lấy authorId từ các sách PENDING
        const authorIdSet = new Set(
          visibleBooks.map((b: any) => String(b.authorId))
        );

        const userMap = new Map(
          allUsers.map((u: any) => [String(u.userId), u])
        );

        const authors = [...authorIdSet]
          .map((id) => userMap.get(id))
          .filter(Boolean);

        setUsers(authors as any[]);
        setBooksState(visibleBooks);
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
                  src={u.avatarUrl || "https://avatar.iran.liara.run/public/boy"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col text-white">
                  <span>{u.fullName}</span>
                  <span className="text-xs text-gray-400">{u.email}</span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="text-sm text-gray-300">
              👤 {u.fullName} có sách cần duyệt
            </CardContent>
          </Card>
        ))}
      </div>
    </ModeratorLayout>
  );
}

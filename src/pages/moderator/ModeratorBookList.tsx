import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModeratorLayout from "./ModeratorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ModeratorBookList() {
  const { state } = useLocation() as any;
  const [books] = useState<any[]>(state?.books ?? []);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // 🔹 chỉ hiện sách có publicationStatus = 3 hoặc PENDING
  const list = useMemo(() => {
    const keyword = search.toLowerCase();

    return books.filter((b) => {
      const rawPub =
        b.publicationStatus ??
        b.publication_status ??
        b.status;

      // ko có status => không hiện
      if (rawPub == null) return false;

      const rawStr = String(rawPub).trim();
      const upper = rawStr.toUpperCase();
      const num = Number(rawStr);

      const isPending =
        num === 3 || upper === "PENDING";

      if (!isPending) return false;

      const name = (b.bookName ?? "").toLowerCase();
      return name.includes(keyword);
    });
  }, [books, search]);

  return (
    <ModeratorLayout
      title="Danh sách sách"
      breadcrumb={[
        { label: "Moderator", to: "/moderator" },
        { label: "Books" },
      ]}
    >
      <Input
        placeholder="Tìm sách..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 bg-white/10 text-white"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {list.map((b) => (
          <div key={b.bookId} className="bg-white/5 p-3 rounded">
            <img
              src={b.coverUrl}
              className="w-full aspect-2/3 object-cover rounded"
            />
            <div className="text-center mt-2 text-sm">{b.bookName}</div>

            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                className="
                  text-xs text-white
                  bg-linear-to-r from-blue-500 via-purple-500 to-pink-500
                  border-none
                  ml-auto
                "
                onClick={() =>
                  navigate(`/moderator/books/${b.bookId}/preview`, {
                    state: {
                      book: b,
                      bookId: b.bookId,
                      authorId: b.authorId,
                    },
                  })
                }
              >
                Xem sách
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ModeratorLayout>
  );
}

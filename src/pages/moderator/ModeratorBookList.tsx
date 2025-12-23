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

      <div className="w-full overflow-x-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {list.map((b) => (
            <div
              key={b.bookId}
              className="bg-white/5 p-2 rounded-lg overflow-hidden min-w-0"
            >
              <img
                src={b.coverUrl}
                className="w-full max-w-full h-40 sm:h-44 object-cover rounded-md"
                alt={b.bookName}
              />

              <div className="text-center mt-2 text-xs sm:text-sm text-white/90 line-clamp-2">
                {b.bookName}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  className="
              text-[11px] sm:text-xs text-white
              bg-linear-to-r from-blue-500 via-purple-500 to-pink-500
              border-none
              ml-auto
              h-8 px-3
            "
                  onClick={() =>
                    navigate(`/moderator/books/${b.bookId}/preview`, {
                      state: { book: b, bookId: b.bookId, authorId: b.authorId },
                    })
                  }
                >
                  Xem sách
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModeratorLayout>
  );
}

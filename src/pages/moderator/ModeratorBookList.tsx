import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ModeratorLayout from "./ModeratorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBooks } from "@/services/BookService"; //  dùng api lấy sách

export default function ModeratorBookList() {
  const { state } = useLocation() as any;
  const { authorId } = useParams<{ authorId: string }>();
  const navigate = useNavigate();

  const [books, setBooks] = useState<any[]>(state?.books ?? []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  //  nếu không có state.books thì tự load theo authorId
  useEffect(() => {
    if (books.length > 0) return;
    if (!authorId) return;

    const load = async () => {
      try {
        setLoading(true);

        const res: any = await getBooks({
          authorId,
          page: 0,
          size: 200,
          // nếu backend hỗ trợ filter status thì thêm luôn cho nhẹ:
          // publicationStatus: 3,
          // sort: ["createdAt,desc"],
        });

        const list = res?.content ?? res ?? [];
        setBooks(list);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authorId]); // eslint-disable-line

  const list = useMemo(() => {
    const keyword = search.toLowerCase();
    return books.filter((b) => {
      const rawPub = b.publicationStatus ?? b.publication_status ?? b.status;
      if (rawPub == null) return false;

      const rawStr = String(rawPub).trim();
      const upper = rawStr.toUpperCase();
      const num = Number(rawStr);

      const isPending = num === 3 || upper === "PENDING";
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

      {loading && <p className="text-gray-300">Đang tải sách...</p>}

      <div className="w-full overflow-x-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {list.map((b) => (
            <div key={b.bookId} className="bg-white/5 p-2 rounded-lg overflow-hidden min-w-0">
              <img
                src={b.coverUrl}
                className="w-full max-w-full object-cover rounded-md"
                alt={b.bookName}
              />
              <div className="text-center mt-2 text-xs sm:text-sm text-white/90 line-clamp-2">
                {b.bookName}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  className="text-[11px] sm:text-xs text-white bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 border-none ml-auto h-8 px-3"
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
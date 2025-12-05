import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModeratorLayout from "./ModeratorLayout";
import { updateBookStatusFull } from "@/services/BookService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ModeratorBookList() {
  const { state } = useLocation() as any;
  const [books, setBooks] = useState<any[]>(state?.books ?? []);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const list = useMemo(() => {
    return books.filter((b) =>
      (b.bookName ?? "").toLowerCase().includes(search.toLowerCase())
    );
  }, [books, search]);

  const approveBook = async (b: any, status: number) => {
    await updateBookStatusFull(b, status);
    setBooks((prev) => prev.filter((x) => x.bookId !== b.bookId));
  };

  return (
    <ModeratorLayout
      title="Danh sách sách"
      breadcrumb={[
        { label: "Moderator", to: "/moderator" },
        { label: "Books",  },
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
            <img src={b.coverUrl} className="w-full aspect-[2/3] object-cover rounded" />
            <div className="text-center mt-2 text-sm">{b.bookName}</div>

            <div className="flex items-center gap-2 mt-2">
              {b.publicationStatus === 3 && (
                <Button
                  className="bg-green-600 text-xs"
                  onClick={() => approveBook(b, 2)}
                >
                  Duyệt sách
                </Button>
              )}

              <Button
                variant="outline"
                className="
    text-xs text-white
    bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
    border-none
    ml-auto
  "
                onClick={() =>
                  navigate(`/moderator/books/${b.bookId}/chapters`, {
                    state: { bookId: b.bookId,
                      authorId: b.authorId
                     }
                  })
                }
              >
                Xem chương
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ModeratorLayout>
  );
}

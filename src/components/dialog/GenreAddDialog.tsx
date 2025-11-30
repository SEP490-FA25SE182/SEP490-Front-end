import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllGenres, attachGenresToBook, type Genre } from "@/services/GenreService";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  onSaved?: () => void; // callback sau khi add thành công
};

const GenreAddDialog: React.FC<Props> = ({ isOpen, onClose, bookId, onSaved }) => {
  const { toast } = useToast();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const list = await getAllGenres();
        setGenres(list);
      } catch (e) {
        console.error(e);
        toast({ title: "Lỗi", description: "Không tải được danh sách thể loại", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return genres;
    return genres.filter(g =>
      (g.genreName ?? "").toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q)
    );
  }, [genres, search]);

  const toggle = (id: string) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) {
      toast({ title: "Chưa chọn thể loại", description: "Vui lòng chọn ít nhất một thể loại." });
      return;
    }
    setSaving(true);
    try {
      await attachGenresToBook(bookId, ids);
      toast({ title: "Thành công", description: "Đã gắn thể loại cho sách." });
      onSaved?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Lỗi", description: e?.response?.data?.message || "Không thể gắn thể loại.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Chọn thể loại cho sách</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Tìm theo tên/ mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-white/20"
          />

          <div className="max-h-[320px] overflow-auto rounded border border-white/10 p-2">
            {loading ? (
              <div className="p-4 text-sm text-gray-400">Đang tải thể loại...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">Không có thể loại phù hợp.</div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map((g) => (
                  <li key={g.genreId} className="flex items-start gap-2 rounded bg-white/5 p-2 border border-white/10">
                    <input
                      type="checkbox"
                      checked={!!selected[g.genreId]}
                      onChange={() => toggle(g.genreId)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{g.genreName}</div>
                      {g.description && (
                        <div className="text-xs text-gray-400">{g.description}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu thể loại"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenreAddDialog;

import { useEffect, useState } from "react";
import { Menu, X, Plus, Trash2, Pencil, Loader2, Search } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  getAllGenres,
  createGenre,
  updateGenre,
  deleteGenre,
  type Genre,
} from "@/services/GenreService";

import { toast } from "sonner";

export default function GenresManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);

  const [genreName, setGenreName] = useState("");
  const [description, setDescription] = useState("");
  const [isActived, setIsActived] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [saving, setSaving] = useState(false);

  const loadGenres = async () => {
    setLoading(true);
    try {
      const res = await getAllGenres();
      setGenres(res);
    } catch {
      toast.error("Không thể tải danh sách thể loại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGenres();
  }, []);

  const filtered = genres.filter((g) => {
    const matchSearch = g.genreName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || g.isActived === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAdd = () => {
    setModalMode("add");
    setGenreName("");
    setDescription("");
    setIsActived("ACTIVE");
    setSelectedGenre(null);
    setOpenModal(true);
  };

  const handleEdit = (g: Genre) => {
    setModalMode("edit");
    setSelectedGenre(g);
    setGenreName(g.genreName);
    setDescription(g.description ?? "");
    setIsActived(g.isActived as "ACTIVE" | "INACTIVE");
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!genreName.trim()) {
      toast.error("Tên thể loại không được để trống");
      return;
    }

    try {
      setSaving(true);

      if (modalMode === "add") {
        await createGenre({
          genreName,
          description,
          isActived,
        });
        toast.success("Tạo thể loại thành công");
      } else if (selectedGenre) {
        await updateGenre(selectedGenre.genreId, {
          genreName,
          description,
          isActived,
        });
        toast.success("Cập nhật thể loại thành công");
      }

      setOpenModal(false);
      loadGenres();
    } catch {
      toast.error("Lỗi khi lưu thể loại");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGenre = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa?")) return;

    try {
      await deleteGenre(id);
      toast.success("Xóa thành công");
      loadGenres();
    } catch {
      toast.error("Không thể xóa thể loại");
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AdminSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </header>

        {/* SEARCH + FILTER */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm thể loại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-transparent border-white/20 text-white"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] border-white/20 bg-transparent text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="INACTIVE">INACTIVE</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleAdd}
          >
            <Plus className="w-4 h-4 mr-1" /> Thêm thể loại
          </Button>
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang tải...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                    <TableHead className="text-white font-medium">
                      Tên
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Mô tả
                    </TableHead>
                    <TableHead className="text-white font-medium">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-white font-medium text-right">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="bg-transparent">
                  {filtered.map((g) => (
                    <TableRow
                      key={g.genreId}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="text-white font-medium">
                        {g.genreName}
                      </TableCell>

                      <TableCell className="text-white/70">
                        {g.description}
                      </TableCell>

                      <TableCell>
                        <span
                          className={
                            g.isActived === "ACTIVE"
                              ? "text-green-400 font-semibold"
                              : "text-white/50 font-semibold"
                          }
                        >
                          {g.isActived}
                        </span>
                      </TableCell>

                      <TableCell className="flex justify-end gap-2">
                        <Button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                          onClick={() => handleEdit(g)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteGenre(g.genreId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[420px] p-6 relative text-black">
            <button
              className="absolute right-4 top-4 text-gray-600 hover:text-black"
              onClick={() => setOpenModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {modalMode === "add" ? "Thêm thể loại" : "Cập nhật thể loại"}
            </h2>

            <div className="mb-4">
              <label className="text-gray-600 text-sm">Tên thể loại</label>
              <Input
                value={genreName}
                onChange={(e) => setGenreName(e.target.value)}
                className="text-black mt-1"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-600 text-sm">Mô tả</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-black mt-1"
              />
            </div>

            <div className="mb-6">
              <label className="text-gray-600 text-sm">Trạng thái</label>

              <Select
                value={isActived}
                onValueChange={(v) => setIsActived(v as any)}
              >
                <SelectTrigger className="w-full mt-1 text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenModal(false)}
                disabled={saving}
              >
                Hủy
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

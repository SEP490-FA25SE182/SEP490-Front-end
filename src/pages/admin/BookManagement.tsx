import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  Search,
  Trash2,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { toast } from "sonner";

import {
  createBook,
  updateBook,
  deleteBook,
  type Book,
} from "@/services/BookService";

import { getUserById } from "@/services/UserService"; //  LẤY TÊN TÁC GIẢ

import axios from "axios";
import { API_RK } from "@/config";

/* =========================
   SERVER-SIDE PAGINATION
========================= */
type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 0-based
  size: number;
  first: boolean;
  last: boolean;
};

const getBooksPage = async (params: {
  page: number; // 0-based
  size: number;
  sort?: string; // ex: "updatedAt-DESC" (đúng với BE split("-"))
  q?: string;
  publicationStatus?: number;
}): Promise<PageResponse<Book>> => {
  const res = await axios.get(`${API_RK}/users/books`, { params });
  return res.data;
};

const PROGRESS_COLOR: Record<number, string> = {
  0: "text-yellow-600", // Đang sáng tác
  1: "text-green-600", // Hoàn thành
  2: "text-red-600", // Ngưng
};

const PUBLIC_COLOR: Record<number, string> = {
  0: "text-white-600", // Bản nháp
  1: "text-green-600", // Đã xuất bản
  2: "text-orange-600", // Đã được duyệt
  3: "text-yellow-600", // Đang chờ duyệt
};

// ENUM mapping
const BOOK_PROGRESS: Record<number, string> = {
  0: "Đang sáng tác",
  1: "Hoàn thành",
  2: "Ngưng",
};

const BOOK_PUBLIC: Record<number, string> = {
  0: "Bản nháp",
  1: "Đã xuất bản",
  2: "Đã được duyệt",
  3: "Đang chờ duyệt",
};

export default function BookManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  //  Pagination (server-side)
  const [page, setPage] = useState(1); // UI 1-based
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Tên tác giả đã load (cache)
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // form fields
  const [bookName, setBookName] = useState("");
  const [progressStatus, setProgressStatus] = useState("0");
  const [publicationStatus, setPublicationStatus] = useState("0");
  const [price, setPrice] = useState("0");
  const [quantity, setQuantity] = useState("0");

  const [saving, setSaving] = useState(false);

  const disableEditing =
    modalMode === "edit" &&
    selectedBook?.progressStatus === 1 &&
    selectedBook?.publicationStatus === 1;

  //  Reset về trang 1 khi search/filter/pageSize đổi
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterStatus, pageSize]);

  // Load books + author names (SERVER-SIDE)
  const loadBooks = async () => {
    setLoading(true);
    try {
      const q = searchQuery.trim();
      const res = await getBooksPage({
        page: page - 1, //  convert UI -> API
        size: pageSize,
        sort: "updatedAt-DESC",
        q: q.length ? q : undefined,
        publicationStatus:
          filterStatus === "all" ? undefined : Number(filterStatus),
      });

      // nếu delete xong bị rơi vào trang trống -> lùi 1 trang
      if (res.content.length === 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
        return;
      }

      setBooks(res.content);
      setTotalPages(Math.max(1, res.totalPages));
      setTotalItems(res.totalElements);

      // Fetch missing author names (cache theo authorId)
      const ids = Array.from(
        new Set(res.content.map((b) => b.authorId).filter(Boolean))
      ) as string[];

      if (ids.length) {
        const missing = ids.filter((id) => !authorNames[id]);
        if (missing.length) {
          const newMap: Record<string, string> = {};
          for (const id of missing) {
            try {
              const user = await getUserById(id);
              newMap[id] = user.fullName ?? "Unknown";
            } catch {
              newMap[id] = "Unknown";
            }
          }
          setAuthorNames((prev) => ({ ...prev, ...newMap }));
        }
      }
    } catch {
      toast.error("Không thể tải danh sách sách");
    } finally {
      setLoading(false);
    }
  };

  //  Trigger load theo server-side pagination + filters
  useEffect(() => {
    loadBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchQuery, filterStatus]);

  // UI helper: list trang có dấu ...
  const pageItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: Array<number | "..."> = [];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    items.push(1);
    if (left > 2) items.push("...");
    for (let p = left; p <= right; p++) items.push(p);
    if (right < totalPages - 1) items.push("...");
    items.push(totalPages);

    return items;
  }, [page, totalPages]);

  // range hiển thị
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const handleProgressChange = (value: string) => {
    setProgressStatus(value);

    // Hoàn thành → XB chỉ được "Đã xuất bản"
    if (value === "1") {
      setPublicationStatus("1");
    }

    // Ngưng → XB về "Bản nháp"
    if (value === "2") {
      setPublicationStatus("0");
    }

    // Đang sáng tác → nếu đang lỡ là "Đã xuất bản" thì ép về "Bản nháp"
    if (value === "0" && publicationStatus === "1") {
      setPublicationStatus("0");
    }
  };

  // Open EDIT modal
  const handleEdit = (b: Book) => {
    setModalMode("edit");
    setSelectedBook(b);
    setBookName(b.bookName);
    setProgressStatus(String(b.progressStatus));
    setPublicationStatus(String(b.publicationStatus));
    setPrice(String(b.price ?? 0));
    setQuantity(String(b.quantity ?? 0));
    setOpenModal(true);
  };

  // Save
  const handleSave = async () => {
    if (!bookName.trim()) return toast.error("Tên sách không được để trống");

    try {
      setSaving(true);

      const newPublicationStatus = Number(publicationStatus);

      const payload: any = {
        bookName,
        progressStatus: Number(progressStatus),
        publicationStatus: Number(publicationStatus),
        price: Number(price),
        quantity: Number(quantity),
      };

      if (
        modalMode === "edit" &&
        selectedBook?.publicationStatus !== 1 &&
        newPublicationStatus === 1
      ) {
        payload.publishedDate = new Date().toISOString();
      }

      if (modalMode === "add") {
        await createBook(payload);
        toast.success("Tạo sách thành công");
      } else if (selectedBook) {
        await updateBook(selectedBook.bookId!, payload);
        toast.success("Cập nhật sách thành công");
      }

      setOpenModal(false);
      loadBooks();
    } catch {
      toast.error("Không thể lưu sách");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa sách này?")) return;

    try {
      await deleteBook(id);
      toast.success("Xóa sách thành công");
      loadBooks();
    } catch {
      toast.error("Không thể xóa sách");
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AdminSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
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

        {/* Filters */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm sách hoặc tác giả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border-white/20 text-white"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] border-white/20 bg-transparent text-white">
              <SelectValue placeholder="Trạng thái XB" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="0">Bản nháp</SelectItem>
              <SelectItem value="2">Đã được duyệt</SelectItem>
              <SelectItem value="3">Đang chờ duyệt</SelectItem>
              <SelectItem value="1">Đã xuất bản</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang tải...
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                      <TableHead className="text-white">Tên sách</TableHead>
                      <TableHead className="text-white">Tác giả</TableHead>
                      <TableHead className="text-white">Tiến độ</TableHead>
                      <TableHead className="text-white">Xuất bản</TableHead>
                      <TableHead className="text-white">Số lượng</TableHead>
                      <TableHead className="text-white">Đơn giá</TableHead>
                      <TableHead className="text-white text-right">
                        Hành động
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                <TableBody className="bg-transparent">
                  {filteredBooks.length === 0 ? (
                    <TableRow className="border-b border-white/10">
                      <TableCell
                        colSpan={7}
                        className="text-center text-white/60 py-8"
                      >
                        Không có sách nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBooks.map((b) => (
                      <TableRow
                        key={b.bookId}
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <TableCell className="text-white font-medium">
                          {b.bookName}
                        </TableCell>

                        <TableCell className="text-white/70">
                          {authorNames[b.authorId ?? ""] ?? "Unknown"}
                        </TableCell>

                        <TableCell className="text-white/70">
                          <span
                            className={`font-semibold ${
                              PROGRESS_COLOR[Number(b.progressStatus)]
                            }`}
                          >
                            {BOOK_PROGRESS[Number(b.progressStatus)]}
                          </span>
                        </TableCell>

                        <TableCell className="text-white/70">
                          <span
                            className={`font-semibold ${
                              PUBLIC_COLOR[Number(b.publicationStatus)]
                            }`}
                          >
                            {BOOK_PUBLIC[Number(b.publicationStatus)]}
                          </span>
                        </TableCell>

                        <TableCell className="text-white/70">
                          {b.quantity ?? 0}
                        </TableCell>

                        <TableCell className="text-white/70">
                          {b.price?.toLocaleString("vi-VN")}₫
                        </TableCell>

                        <TableCell className="flex justify-end gap-2">
                          {/* ✅ nút vàng giữ đúng style bạn chốt */}
                          <Button
                            className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            onClick={() => handleEdit(b)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(b.bookId!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[420px] p-6 relative">
            <button
              className="absolute right-4 top-4 text-gray-600 hover:text-black"
              onClick={() => setOpenModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {modalMode === "add" ? "Thêm Sách" : "Cập nhật Sách"}
            </h2>

            {/* Tên sách */}
            <div className="mb-4">
              <label className="text-gray-600 text-sm">Tên sách</label>
              <Input
                value={bookName}
                disabled={disableEditing}
                onChange={(e) => setBookName(e.target.value)}
                className="text-black mt-1"
              />
            </div>

            {/* Tiến độ */}
            <div className="mb-4">
              <label className="text-gray-600 text-sm">Tiến độ</label>
              <Select
                value={progressStatus}
                onValueChange={handleProgressChange}
                disabled={disableEditing}
              >
                <SelectTrigger className="w-full mt-1 text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Đang sáng tác</SelectItem>
                  <SelectItem value="1">Hoàn thành</SelectItem>
                  <SelectItem value="2">Ngưng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Xuất bản */}
            <div className="mb-4">
              <label className="text-gray-600 text-sm">
                Trạng thái xuất bản
              </label>
              <Select
                value={publicationStatus}
                onValueChange={setPublicationStatus}
                disabled={disableEditing || progressStatus === "2"}
              >
                <SelectTrigger className="w-full mt-1 text-black">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {/*  Đang sáng tác */}
                  {progressStatus === "0" && (
                    <>
                      <SelectItem value="0">Bản nháp</SelectItem>
                      <SelectItem value="2">Đã được duyệt</SelectItem>
                      <SelectItem value="3">Đang chờ duyệt</SelectItem>
                    </>
                  )}

                  {/*  Hoàn thành */}
                  {progressStatus === "1" && (
                    <SelectItem value="1">Đã xuất bản</SelectItem>
                  )}

                  {/*  Ngưng */}
                  {progressStatus === "2" && (
                    <SelectItem value="0">Bản nháp</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Số lượng */}
            <div className="mb-4">
              <label className="text-gray-600 text-sm">
                Số lượng (quantity)
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-black mt-1"
              />
            </div>

            {/* Đơn giá */}
            <div className="mb-6">
              <label className="text-gray-600 text-sm">Đơn giá</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="text-black mt-1"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
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

            {/* Thông báo trạng thái bị khóa */}
            {disableEditing && (
              <p className="mt-2 text-xs text-red-500">
                Sách đã <b>Hoàn thành</b> và <b>Đã xuất bản</b> — chỉ có thể
                chỉnh sửa <b>Số lượng</b> và <b>Đơn giá.</b>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

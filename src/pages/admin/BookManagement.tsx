import { useEffect, useState } from "react";
import { Menu, X, Search, Trash2, Pencil, Loader2 } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import {
    createBook,
    updateBook,
    deleteBook,
    type Book,
} from "@/services/BookService";

import { getUserById } from "@/services/UserService"; // 🔥 LẤY TÊN TÁC GIẢ

import axios from "axios";
import { API_RK } from "@/config";

// ===============================
// TEMP: API get all books
// ===============================
const getAllBooks = async (): Promise<Book[]> => {
    const res = await axios.get(`${API_RK}/users/books`);
    return res.data?.content ?? res.data ?? [];
};

const PROGRESS_COLOR: Record<number, string> = {
    0: "text-blue-600",     // IN_PROGRESS
    1: "text-green-600",    // COMPLETED
    2: "text-red-600",      // DROPPED
};

const PUBLIC_COLOR: Record<number, string> = {
    0: "text-gray-600",     // Bản nháp
    1: "text-green-600",    // Đã xuất bản
    2: "text-orange-600",   // Đã được duyệt
    3: "text-yellow-600",   // Đang chờ duyệt
};



// ENUM mapping
const BOOK_PROGRESS: Record<number, string> = {
    0: "IN_PROGRESS",
    1: "COMPLETED",
    2: "DROPPED",
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

    // Tên tác giả đã load
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

    // Load books + author names
    const loadBooks = async () => {
        setLoading(true);
        try {
            const res = await getAllBooks();
            setBooks(res);

            // 🔥 Fetch author names
            const map: Record<string, string> = {};

            for (const b of res) {
                if (b.authorId) {
                    try {
                        const user = await getUserById(b.authorId);
                        map[b.authorId] = user.fullName ?? "Unknown";
                    } catch {
                        map[b.authorId] = "Unknown";
                    }
                }
            }

            setAuthorNames(map);
        } catch {
            toast.error("Không thể tải danh sách sách");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBooks();
    }, []);

    // Filter
    const filteredBooks = books.filter((b) => {
        const matchSearch =
            b.bookName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            authorNames[b.authorId ?? ""]?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchStatus =
            filterStatus === "all" ||
            String(b.publicationStatus) === filterStatus;

        return matchSearch && matchStatus;
    });

    
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

            const payload = {
                bookName,
                progressStatus: Number(progressStatus),
                publicationStatus: Number(publicationStatus),
                price: Number(price),
                quantity: Number(quantity),
            };

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
                            <SelectItem value="1">Đã xuất bản</SelectItem>
                            <SelectItem value="2">Đã được duyệt</SelectItem>
                            <SelectItem value="3">Đang chờ duyệt</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center items-center py-16 text-gray-500">
                                <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang tải...
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                                        <TableHead className="text-white">Tên sách</TableHead>
                                        <TableHead className="text-white">Tác giả</TableHead>
                                        <TableHead className="text-white">Tiến độ</TableHead>
                                        <TableHead className="text-white">Xuất bản</TableHead>
                                        <TableHead className="text-white">Số lượng</TableHead>
                                        <TableHead className="text-white">Đơn giá</TableHead>
                                        <TableHead className="text-white text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredBooks.map((b) => (
                                        <TableRow key={b.bookId}>
                                            <TableCell className="text-gray-900 font-medium">
                                                {b.bookName}
                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                {authorNames[b.authorId ?? ""] ?? "Unknown"}
                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                <TableCell>
                                                    <span className={`font-semibold ${PROGRESS_COLOR[Number(b.progressStatus)]}`}>
                                                        {BOOK_PROGRESS[Number(b.progressStatus)]}
                                                    </span>
                                                </TableCell>

                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                <TableCell>
                                                    <span className={`font-semibold ${PUBLIC_COLOR[Number(b.publicationStatus)]}`}>
                                                        {BOOK_PUBLIC[Number(b.publicationStatus)]}
                                                    </span>
                                                </TableCell>

                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                {b.quantity ?? 0}
                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                {b.price?.toLocaleString("vi-VN")}₫
                                            </TableCell>

                                            <TableCell className="flex justify-end gap-2">
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
                                disabled={modalMode === "edit"}
                                onChange={(e) => setBookName(e.target.value)}
                                className="text-black mt-1"
                            />
                        </div>

                        {/* Tiến độ */}
                        <div className="mb-4">
                            <label className="text-gray-600 text-sm">Tiến độ</label>
                            <Select value={progressStatus} onValueChange={setProgressStatus}>
                                <SelectTrigger className="w-full mt-1 text-black">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">IN_PROGRESS</SelectItem>
                                    <SelectItem value="1">COMPLETED</SelectItem>
                                    <SelectItem value="2">DROPPED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Xuất bản */}
                        <div className="mb-4">
                            <label className="text-gray-600 text-sm">Trạng thái xuất bản</label>
                            <Select value={publicationStatus} onValueChange={setPublicationStatus}>
                                <SelectTrigger className="w-full mt-1 text-black">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Bản nháp</SelectItem>
                                    <SelectItem value="1">Đã xuất bản</SelectItem>
                                    <SelectItem value="2">Đã được duyệt</SelectItem>
                                    <SelectItem value="3">Đang chờ duyệt</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Số lượng */}
                        <div className="mb-4">
                            <label className="text-gray-600 text-sm">Số lượng (quantity)</label>
                            <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="text-black mt-1"
                            />
                        </div>

                        {/*Đơn giá*/}
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
                            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={saving}>
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

import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  DollarSign,
  TrendingUp,
  BookOpen,
  Clock,
  CheckCircle,
} from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllBooks } from "@/services/BookService";
import { getAllWallets, type Wallet } from "@/services/WalletService";

// NOTE: payment history previously was hardcoded. Now we fetch wallets and show them as the history rows.

export default function AuthorIncome() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [books, setBooks] = useState<any[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [, setLoading] = useState(false);

  // resolve current user id from localStorage (used to count books for this author)
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = currentUser?.userId;

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        // fetch books (fetch many so we get all author's books)
        const booksResp = await getAllBooks({ size: 1000 });
        if (!mounted) return;
        // if returned items contain authorId, filter by current user if available
        // guard against non-array responses and ensure .content exists and is an array
        const filtered = Array.isArray(booksResp)
          ? (booksResp as any[])
          : booksResp && typeof booksResp === "object" && "content" in booksResp && Array.isArray((booksResp as any).content)
          ? (booksResp as any).content
          : [];
        const myBooks = userId
          ? (filtered as any[]).filter((b) => String(b.authorId) === String(userId))
          : (filtered as any[]);
        setBooks(myBooks);

        // fetch wallets (used as history source per request)
        const walletsResp = await getAllWallets();
        if (!mounted) return;
        setWallets(walletsResp ?? []);
      } catch (err) {
        console.error("Error loading author income data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // compute metrics from fetched data
  const totalBooks = books.length;
  const publishedBooks = books.filter((b) => Number(b.publicationStatus) === 1).length;
  const pendingBooks = books.filter((b) => Number(b.publicationStatus) !== 1).length;

  // revenue derived from wallets (sum of balances) — adjust if backend has dedicated revenue endpoint
  const totalRevenue = useMemo(
    () => wallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
    [wallets]
  );
  // royalty assumed 70% of revenue (previous behavior) → removed as requested; we only keep copyright fee here
  const authorRoyalty = Math.round(totalRevenue * 0.7);
  const copyrightFee = totalRevenue - authorRoyalty;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  // Cards array: only 5 cards requested
  const cards = [
    {
      title: "Tổng Doanh Thu",
      value: formatCurrency(totalRevenue),
      desc: "Tổng từ ví / lịch sử",
      icon: <DollarSign className="w-6 h-6" />,
      accent: "from-[#764BA2] to-[#667EEA]",
    },
    {
      title: "Phí tác quyền",
      value: formatCurrency(copyrightFee),
      desc: "Phí/chiết khấu nền tảng",
      icon: <BookOpen className="w-6 h-6" />,
      accent: "from-[#334155] to-[#475569]",
    },
    {
      title: "Tổng số sách",
      value: String(totalBooks),
      desc: "Số sách của bạn",
      icon: <BookOpen className="w-6 h-6" />,
      accent: "from-[#0ea5e9] to-[#667eea]",
    },
    {
      title: "Sách chờ duyệt",
      value: String(pendingBooks),
      desc: "Cần duyệt xuất bản",
      icon: <Clock className="w-6 h-6" />,
      accent: "from-[#f59e0b] to-[#f97316]",
    },
    {
      title: "Sách đã xuất bản",
      value: String(publishedBooks),
      desc: "Sách đã công khai",
      icon: <CheckCircle className="w-6 h-6" />,
      accent: "from-[#10b981] to-[#059669]",
    },
  ];

  // Map wallets to table rows for display
  const paymentRows = wallets.map((w) => ({
    id: w.walletId,
    book_name: "-", // wallet entries don't have book name; left intentionally blank
    reader: w.userId,
    date: w.createdAt,
    amount: Number(w.balance) || 0,
    commission: 0,
    status: w.isActived === "ACTIVE" ? "completed" : "pending",
  }));

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white hover:bg-white/10"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* single-row 5 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 mb-8">
            {cards.map((card) => (
              <Card key={card.title} className={`text-white bg-gradient-to-l ${card.accent}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 bg-white/20 rounded-lg">{card.icon}</div>
                    <TrendingUp className="w-5 h-5 text-green-300" />
                  </div>
                  <CardDescription className="text-white/70">{card.title}</CardDescription>
                  <CardTitle className="text-2xl">{card.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-xs">{card.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment History (from getAllWallets) */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1a2332] border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Lịch Sử Thanh Toán (Wallets)</h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                  <TableHead className="text-white font-medium">Mã</TableHead>
                  <TableHead className="text-white font-medium">Tài khoản</TableHead>
                  <TableHead className="text-white font-medium">Ngày</TableHead>
                  <TableHead className="text-white font-medium">Số dư</TableHead>
                  <TableHead className="text-white font-medium">Hoa Hồng</TableHead>
                  <TableHead className="text-white font-medium">Trạng Thái</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paymentRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{row.id}</TableCell>                   
                    <TableCell>
                      <div className="text-gray-600">{row.reader}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-900 text-sm">
                        {row.date ? new Date(row.date).toLocaleDateString("vi-VN") : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-900 font-semibold">{formatCurrency(row.amount)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-600 font-semibold">{formatCurrency(row.commission)}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          row.status === "completed" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {row.status === "completed" ? "Hoàn thành" : "Chờ xử lý"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Tổng cộng: <span className="font-semibold">{paymentRows.length} mục</span>
              </div>
              <div className="flex gap-6">
                <div className="text-sm">
                  <span className="text-gray-600">Tổng doanh thu: </span>
                  <span className="font-bold text-purple-600">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Tổng hoa hồng: </span>
                  <span className="font-bold text-green-600">{formatCurrency(totalCommission(wallets))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// helper to compute total commission from wallets (here commission is placeholder 0)
function totalCommission(wallets: Wallet[]) {
  // if your backend provides commission per wallet entry, compute here.
  // For now we sum 0 to keep layout consistent.
  return wallets.reduce((s) => s + 0, 0);
}
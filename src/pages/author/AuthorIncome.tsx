import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BookOpen,
  Clock,
  CheckCircle,
} from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllBooks } from "@/services/BookService";
import { OrderService } from "@/services/OrderService";
import { OrderDetailService } from "@/services/OrderDetailService";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUserId } from "@/utils/authStorage";
import { getUserByEmail } from "@/services/UserService";

import { getWalletByUserId } from "@/services/WalletService";
import { TransactionService } from "@/services/TransactionService";

// Recharts
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function AuthorIncome() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [books, setBooks] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [authorRevenue, setAuthorRevenue] = useState<number>(0);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = currentUser?.userId;

  const { user } = useAuth();
  const [authorId, setAuthorId] = useState<string | null>(null);

  //  NEW: chọn tháng (default: tháng hiện tại) để tính tất cả phí theo tháng
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
  );

  const monthRange = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split("-");
    const y = Number(yStr);
    const m = Number(mStr); // 1-12
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 1, 0, 0, 0, 0);
    return { start, end };
  }, [selectedMonth]);

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-");
    return `${m}/${y}`;
  }, [selectedMonth]);

  //  CHANGED: phí tác quyền theo Transaction (SETTLEMENT + status=3) theo tháng
  const [settlementThisMonth, setSettlementThisMonth] = useState<number>(0);
  const [walletId, setWalletId] = useState<string | null>(null);

  // ===== helper: giống AuthorBookList, ĐẶT LÊN TRÊN =====
  const isBookActive = (book: any) => {
    const rawStatus =
      book.status ??
      book.bookStatus ??
      book.isActived ??
      book.is_active ??
      book.isActive ??
      book.publicationStatus ??
      book.publication_status;

    if (rawStatus == null) return true;

    const val = String(rawStatus).toUpperCase().trim();

    if (["ACTIVE", "1", "TRUE"].includes(val)) return true;
    if (["INACTIVE", "0", "FALSE"].includes(val)) return false;

    return true;
  };

  const normalizePublicationStatus = (raw: any): number => {
    if (raw == null) return -1;

    const s = String(raw).trim().toUpperCase();

    // numeric
    if (/^\d+$/.test(s)) return Number(s);

    // token
    if (s === "DRAFT") return 0;
    if (s === "PUBLISHED") return 1;
    if (s === "ARCHIVED") return 2;
    if (s === "PENDING") return 3;
    if (s === "REJECTED") return 4;

    return -1;
  };

  const pubStatusLabel = (code: number) => {
    switch (code) {
      case 0:
        return "Nháp (đang làm)";
      case 1:
        return "Đã xuất bản";
      case 2:
        return "Đã được duyệt";
      case 3:
        return "Chờ duyệt";
      case 4:
        return "Bị từ chối duyệt";
      default:
        return "Không xác định";
    }
  };

  // =====================================================

  // dùng cùng tập sách ACTIVE như BookList
  const activeBooks = useMemo(() => books.filter((b) => isBookActive(b)), [books]);

  // tổng sách = số sách ACTIVE
  const totalBooks = activeBooks.length;

  // chỉ đếm status = 1 là "Đã xuất bản"
  const publishedBooks = activeBooks.filter(
    (b) => Number(b.publicationStatus ?? b.publication_status) === 1
  ).length;

  // chỉ đếm status = 3 là "Chờ duyệt"
  const pendingBooks = activeBooks.filter(
    (b) => Number(b.publicationStatus ?? b.publication_status) === 3
  ).length;

  // ===== resolve authorId =====
  useEffect(() => {
    const fetchAuthorId = async () => {
      try {
        const uidFromStorage = getCurrentUserId();
        if (uidFromStorage) {
          setAuthorId(uidFromStorage);
          return;
        }

        if (user?.userId) {
          setAuthorId(user.userId);
          return;
        }

        if (user?.email) {
          const currentUser = await getUserByEmail(user.email);
          if (currentUser?.userId) {
            setAuthorId(currentUser.userId);
            return;
          }
        }
      } catch (error) {
        console.error(" Lỗi khi xác định authorId:", error);
      }
    };

    fetchAuthorId();
  }, [user]);

  //  NEW: lấy walletId theo authorId
  useEffect(() => {
    let mounted = true;
    const fetchWallet = async () => {
      if (!authorId) return;
      try {
        const w = await getWalletByUserId(authorId);
        if (!mounted) return;
        setWalletId(w?.walletId ?? null);
      } catch (err) {
        console.error("Error fetching wallet by userId:", err);
        if (mounted) setWalletId(null);
      }
    };
    fetchWallet();
    return () => {
      mounted = false;
    };
  }, [authorId]);

  // ===== fetch books =====
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        const booksResp = await getAllBooks({ size: 1000 });
        if (!mounted) return;
        const filtered = Array.isArray(booksResp)
          ? (booksResp as any[])
          : booksResp &&
            typeof booksResp === "object" &&
            "content" in booksResp &&
            Array.isArray((booksResp as any).content)
          ? (booksResp as any).content
          : [];
        setAllBooks(filtered);
        const myBooks = userId
          ? (filtered as any[]).filter((b) => String(b.authorId) === String(userId))
          : (filtered as any[]);
        setBooks(myBooks);
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  //  CHANGED: tính phí tác quyền = sum(totalPrice) của transType=SETTLEMENT & status=3 theo tháng
  useEffect(() => {
    let mounted = true;

    const computeSettlementByTransactions = async () => {
      if (!walletId) return;

      try {
        let page = 0;
        let totalPages = 1;
        let sum = 0;

        while (page < totalPages) {
          const res: any = await TransactionService.searchTransactions({
            walletId,
            transType: "SETTLEMENT",
            page,
            size: 1000,
            sort: ["createdAt,asc"],
          });

          const items: any[] = res?.content ?? [];
          totalPages = Number(res?.totalPages ?? 1);

          items.forEach((tx) => {
            const status = Number(tx?.status);
            if (status !== 3) return;

            const t = tx?.updatedAt ?? tx?.createdAt ?? tx?.createdDate ?? tx?.date;
            if (t) {
              const d = new Date(t);
              if (!(d >= monthRange.start && d < monthRange.end)) return;
            }
            sum += Number(tx?.totalPrice ?? 0);
          });

          page += 1;
        }

        if (mounted) setSettlementThisMonth(sum);
      } catch (err) {
        console.error("Error fetching settlement transactions:", err);
        if (mounted) setSettlementThisMonth(0);
      }
    };

    computeSettlementByTransactions();
    return () => {
      mounted = false;
    };
  }, [walletId, monthRange.start, monthRange.end]);

  // ===== doanh thu thực tế ( theo tháng) =====
  useEffect(() => {
    let mounted = true;

    const computeRevenue = async () => {
      if (!authorId || allBooks.length === 0) return;
      try {
        const resp = await OrderService.searchOrders({
          status: "RECEIVED",
          page: 0,
          size: 1000,
        });

        const orders = Array.isArray(resp) ? resp : resp && resp.content ? resp.content : [];

        const ordersInMonth = (orders as any[]).filter((ord: any) => {
          const t = ord?.updatedAt ?? ord?.createdAt ?? ord?.createdDate ?? ord?.date;
          if (!t) return true;
          const d = new Date(t);
          return d >= monthRange.start && d < monthRange.end;
        });

        let total = 0;

        await Promise.all(
          ordersInMonth.map(async (ord: any) => {
            const orderId = ord.orderId || ord.id || ord.orderID || ord._id;
            if (!orderId) return;

            try {
              const details = await OrderDetailService.getOrderDetailsByOrderId(orderId);
              if (Array.isArray(details)) {
                details.forEach((d: any) => {
                  const bookId = d.bookId;
                  const book = allBooks.find(
                    (b) => String(b.bookId ?? b.id ?? b.bookID ?? b._id) === String(bookId)
                  );
                  const bookAuthorId = book ? book.authorId ?? book.userId ?? book.author?.id : null;

                  if (String(bookAuthorId) === String(authorId)) {
                    total += (Number(d.price) || 0) * (Number(d.quantity) || 1);
                  }
                });
              }
            } catch (err) {
              console.error("Error fetching order details for order", orderId, err);
            }
          })
        );

        if (mounted) setAuthorRevenue(total);
      } catch (err) {
        console.error("Error fetching delivered orders:", err);
      }
    };

    computeRevenue();
    return () => {
      mounted = false;
    };
  }, [authorId, allBooks, monthRange.start, monthRange.end]);

  //  CHANGED: Phí tác quyền = settlementThisMonth (sum totalPrice)
  const royaltyFee = useMemo(() => Math.round(settlementThisMonth), [settlementThisMonth]);

  const cards = [
    {
      title: "Tổng Doanh Thu",
      value: formatCurrency(authorRevenue),
      desc: `Tổng doanh thu đơn hàng tháng ${monthLabel}`,
      icon: <DollarSign className="w-6 h-6" />,
      accent: "from-[#764BA2] to-[#667EEA]",
    },
    {
      title: "Phí tác quyền",
      value: formatCurrency(royaltyFee),
      desc: `Phí tác quyền trong tháng ${monthLabel}`,
      icon: <BookOpen className="w-6 h-6" />,
      accent: "from-[#334155] to-[#475569]",
    },
    {
      title: "Tổng số sách",
      value: String(totalBooks),
      desc: "Tổng số sách của bạn",
      icon: <BookOpen className="w-6 h-6" />,
      accent: "from-[#0ea5e9] to-[#667eea]",
    },
    {
      title: "Sách chờ duyệt",
      value: String(pendingBooks),
      desc: "Sách đang trong quá trình duyệt",
      icon: <Clock className="w-6 h-6" />,
      accent: "from-[#f59e0b] to-[#f97316]",
    },
    {
      title: "Sách đã xuất bản",
      value: String(publishedBooks),
      desc: "Sách đã được xuất bản",
      icon: <CheckCircle className="w-6 h-6" />,
      accent: "from-[#10b981] to-[#059669]",
    },
  ];

  // ===== charts =====
  type Timeframe = "week" | "month" | "quarter" | "year";
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [showPercent, setShowPercent] = useState(false);

  function generateTimeSeries(booksList: any[], tf: Timeframe) {
    const now = new Date();
    const buckets: { label: string; start: Date; end: Date }[] = [];
    const fmtDay = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
    const fmtMonth = new Intl.DateTimeFormat("vi-VN", {
      month: "short",
      year: "numeric",
    });

    if (tf === "week" || tf === "month") {
      const days = tf === "week" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        buckets.push({ label: fmtDay.format(start), start, end });
      }
    } else if (tf === "quarter") {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        buckets.push({
          label: `Wk ${Math.ceil((start.getDate() + start.getMonth() * 30) / 7)}`,
          start,
          end,
        });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        buckets.push({ label: fmtMonth.format(start), start, end });
      }
    }

    return buckets.map((b) => {
      const count = booksList.filter((bk) => {
        const d = bk?.createdAt ? new Date(bk.createdAt) : null;
        return d && d >= b.start && d < b.end;
      }).length;
      return { name: b.label, count };
    });
  }

  const lineData = useMemo(() => generateTimeSeries(activeBooks, timeframe), [activeBooks, timeframe]);

  const pubStatusCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    activeBooks.forEach((b) => {
      const raw = b.publicationStatus ?? b.publication_status;
      const code = normalizePublicationStatus(raw);
      counts[code] = (counts[code] ?? 0) + 1;
    });
    return counts;
  }, [activeBooks]);

  const pieDataCounts = useMemo(() => {
    return Object.entries(pubStatusCounts)
      .map(([k, v]) => ({ code: Number(k), name: pubStatusLabel(Number(k)), value: v }))
      .filter((x) => x.value > 0)
      .sort((a, b) => a.code - b.code);
  }, [pubStatusCounts]);

  const pieDataDisplayed = useMemo(() => {
    const total = pieDataCounts.reduce((sum, d) => sum + d.value, 0);
    if (!showPercent || total === 0) return pieDataCounts;
    return pieDataCounts.map((d) => ({
      ...d,
      value: Number(((d.value / total) * 100).toFixed(1)),
    }));
  }, [pieDataCounts, showPercent]);

  const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#64748b"];

  // ===== render =====
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
                {sidebarOpen ? (
                  <ChevronLeft className="w-6 h-6" />
                ) : (
                  <ChevronRight className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 mb-8">
            {cards.map((card) => (
              <Card key={card.title} className={`text-white bg-linear-to-l ${card.accent}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 bg-white/20 rounded-lg">{card.icon}</div>
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

          {/* charts */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Hoạt động tạo sách</h2>

              <div className="flex gap-2">
                {/*  chọn tháng để tính phí theo tháng */}
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1 rounded bg-gray-100 text-sm"
                />

                <div className="flex gap-2">
                  {(["week", "month", "quarter", "year"] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded ${
                        timeframe === tf ? "bg-indigo-600 text-white" : "bg-gray-100"
                      }`}
                    >
                      {tf === "week" ? "Tuần" : tf === "month" ? "Tháng" : tf === "quarter" ? "Quý" : "Năm"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowPercent((s) => !s)}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                >
                  {showPercent ? "Hiện số" : "Hiện %"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="col-span-2 bg-white p-4 rounded">
                <h3 className="text-sm text-gray-600 mb-2">Số sách tạo theo thời gian</h3>
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#667eea" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-4 rounded">
                <h3 className="text-sm text-gray-600 mb-2">Trạng thái sách</h3>
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieDataDisplayed}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) =>
                          `${name}: ${showPercent ? String(value) + "%" : String(value)}`
                        }
                      >
                        {pieDataDisplayed.map((_entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(val: any) => (showPercent ? `${val}%` : String(val))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              Tổng sách: <span className="font-semibold">{totalBooks}</span>
              <span className="ml-4">
                Đã xuất bản: <span className="font-semibold">{publishedBooks}</span>
              </span>
              <span className="ml-4">
                Chờ duyệt: <span className="font-semibold">{pendingBooks}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

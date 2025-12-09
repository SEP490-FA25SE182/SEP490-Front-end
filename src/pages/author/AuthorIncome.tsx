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

// NOTE: payment history previously was hardcoded. Now we fetch books and show charts.

export default function AuthorIncome() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [books, setBooks] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [authorRevenue, setAuthorRevenue] = useState<number>(0);

  // resolve current user id from localStorage (used to count books for this author)
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = currentUser?.userId;

  // 🆕 lấy authorId chuẩn giống CreateAudioDialog (dùng cho tính doanh thu)
  const { user } = useAuth();
  const [authorId, setAuthorId] = useState<string | null>(null);

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
        console.error("❌ Lỗi khi xác định authorId:", error);
      }
    };

    fetchAuthorId();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      try {
        // fetch books (fetch many so we get all books)
        const booksResp = await getAllBooks({ size: 1000 });
        if (!mounted) return;
        // if returned items contain authorId, normalize to array
        const filtered = Array.isArray(booksResp)
          ? (booksResp as any[])
          : booksResp &&
            typeof booksResp === "object" &&
            "content" in booksResp &&
            Array.isArray((booksResp as any).content)
          ? (booksResp as any).content
          : [];
        // save all books for later mapping when summing revenue
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

  // compute metrics from fetched data
  const totalBooks = books.length;
  const publishedBooks = books.filter((b) => Number(b.publicationStatus) === 1).length;
  const pendingBooks = books.filter((b) => Number(b.publicationStatus) !== 1).length;

  // estimate revenue from books (fallback / dùng cho phí tác quyền cũ)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  // --- TÍNH TỔNG DOANH THU THỰC TẾ từ các order DELIVERED + order details ---
  useEffect(() => {
    let mounted = true;

    const computeRevenue = async () => {
      // cần xác định được authorId và đã có danh sách sách để map
      if (!authorId || allBooks.length === 0) return;
      try {
        // lấy tất cả order có status DELIVERED
        const resp = await OrderService.searchOrders({
          status: "DELIVERED",
          page: 0,
          size: 1000,
        });

        const orders = Array.isArray(resp)
          ? resp
          : resp && resp.content
          ? resp.content
          : [];

        let total = 0;

        await Promise.all(
          orders.map(async (ord: any) => {
            const orderId = ord.orderId || ord.id || ord.orderID || ord._id;
            if (!orderId) return;

            try {
              const details = await OrderDetailService.getOrderDetailsByOrderId(orderId);
              if (Array.isArray(details)) {
                details.forEach((d: any) => {
                  const bookId = d.bookId;
                  // tìm book trong allBooks
                  const book = allBooks.find((b) =>
                    String(b.bookId ?? b.id ?? b.bookID ?? b._id) === String(bookId)
                  );
                  const bookAuthorId = book
                    ? (book.authorId ?? book.userId ?? book.author?.id)
                    : null;

                  // chỉ cộng doanh thu cho những book thuộc author hiện tại
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
  }, [authorId, allBooks]);

  // 🆕 Phí tác quyền = 20% tổng doanh thu thực tế
  const royaltyFee = useMemo(
    () => Math.round(authorRevenue * 0.2),
    [authorRevenue]
  );

  // Cards array: only 5 cards requested
  const cards = [
    {
      title: "Tổng Doanh Thu",
      // dùng doanh thu thực từ order DELIVERED
      value: formatCurrency(authorRevenue),
      desc: "Tổng doanh thu từ đơn hàng đã giao",
      icon: <DollarSign className="w-6 h-6" />,
      accent: "from-[#764BA2] to-[#667EEA]",
    },
    {
      title: "Phí tác quyền",
      // 🆕 20% của tổng doanh thu
      value: formatCurrency(royaltyFee),
      desc: "Tác quyền 20% trên tổng doanh thu",
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

  // Timeframe state for line chart
  type Timeframe = "week" | "month" | "quarter" | "year";
  const [timeframe, setTimeframe] = useState<Timeframe>("month");

  // Toggle: show numbers or percentages in pie chart
  const [showPercent, setShowPercent] = useState(false);

  // Helper: generate time buckets and counts
  function generateTimeSeries(booksList: any[], tf: Timeframe) {
    const now = new Date();
    const buckets: { label: string; start: Date; end: Date }[] = [];
    const fmtDay = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
    const fmtMonth = new Intl.DateTimeFormat("vi-VN", { month: "short", year: "numeric" });

    if (tf === "week") {
      for (let i = 6; i >= 0; i--) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        buckets.push({ label: fmtDay.format(start), start, end });
      }
    } else if (tf === "month") {
      // last 30 days
      for (let i = 29; i >= 0; i--) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        buckets.push({ label: fmtDay.format(start), start, end });
      }
    } else if (tf === "quarter") {
      // last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        buckets.push({ label: `Wk ${Math.ceil((start.getDate() + start.getMonth() * 30) / 7)}`, start, end });
      }
    } else {
      // year: last 12 months
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        buckets.push({ label: fmtMonth.format(start), start, end });
      }
    }

    const series = buckets.map((b) => {
      const count = booksList.filter((bk) => {
        const d = bk?.createdAt ? new Date(bk.createdAt) : null;
        return d && d >= b.start && d < b.end;
      }).length;
      return { name: b.label, count };
    });

    return series;
  }

  const lineData = useMemo(() => generateTimeSeries(books, timeframe), [books, timeframe]);

  // raw counts for pie
  const pieDataCounts = useMemo(
    () => [
      { name: "Đã xuất bản", value: publishedBooks },
      { name: "Chờ duyệt", value: pendingBooks },
    ],
    [publishedBooks, pendingBooks]
  );

  // pie data displayed either as counts or rounded percentages
  const pieDataDisplayed = useMemo(() => {
    const total = publishedBooks + pendingBooks;
    if (!showPercent || total === 0) return pieDataCounts;
    return pieDataCounts.map((d) => ({
      name: d.name,
      value: Number(((d.value / total) * 100).toFixed(1)), // percent with 1 decimal
    }));
  }, [pieDataCounts, showPercent, publishedBooks, pendingBooks]);

  const COLORS = ["#10b981", "#f59e0b"];

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
                {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* single-row 5 cards */}
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

          {/* Charts: Line chart + Pie chart */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Hoạt động tạo sách</h2>
              <div className="flex gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeframe("week")}
                    className={`px-3 py-1 rounded ${timeframe === "week" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  >
                    Tuần
                  </button>
                  <button
                    onClick={() => setTimeframe("month")}
                    className={`px-3 py-1 rounded ${timeframe === "month" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  >
                    Tháng
                  </button>
                  <button
                    onClick={() => setTimeframe("quarter")}
                    className={`px-3 py-1 rounded ${timeframe === "quarter" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  >
                    Quý
                  </button>
                  <button
                    onClick={() => setTimeframe("year")}
                    className={`px-3 py-1 rounded ${timeframe === "year" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
                  >
                    Năm
                  </button>
                </div>

                {/* Toggle numbers / percent for Pie chart */}
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
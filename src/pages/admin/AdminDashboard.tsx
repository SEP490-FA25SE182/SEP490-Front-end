import { useState, useEffect, useMemo } from "react";
import {
    Menu,
    X,
    DollarSign,
    Users,
    ShoppingBag,
    Cpu,
    TrendingUp,
    Star,
    MessageCircle,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
    CartesianGrid,
    Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { getAllBooks, type Book } from "@/services/BookService";
import { useGetAllAIGenerations } from "@/services/AIService";
import { OrderService, type OrderResponse } from "@/services/OrderService";
import { getUserById } from "@/services/UserService";
import { FeedbackService, type Feedback } from "@/services/FeedbackService";
import { OrderDetailService } from "@/services/OrderDetailService";



/* =========================================================
        🔢 TYPES & HELPERS
========================================================= */

type RevenueFilter = "day" | "week" | "month" | "quarter" | "year";

type BookStats = {
    bookId: string;
    book?: Book;
    totalQty: number;
    totalRevenue: number;
    feedbackCount: number;
};

const USD_TO_VND = 25000;
const HOST_COST_MONTH = 4_000_000;

const COLORS = ["#667EEA", "#764BA2", "#FFB830", "#F87171"];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(isNaN(value) ? 0 : value);

const normalizeRoyalty = (raw: unknown): number => {
    const royaltyRaw = Number(raw ?? 0);
    if (royaltyRaw <= 0) return 0;
    let r = royaltyRaw > 1 ? royaltyRaw / 100 : royaltyRaw;
    if (r > 1) r = 1;
    return r;
};

/* =========================================================
  🔥 BUILD CHART THEO THỜI GIAN (REAL ORDER TIMELINE)
========================================================= */

const buildSalesSeries = (
    orders: OrderResponse[],
    filter: RevenueFilter
): { time: string; revenue: number }[] => {
    const now = new Date();

    const parseDate = (o: OrderResponse) => {
        if (!o.createdAt) return null;
        const d = new Date(o.createdAt);
        return isNaN(d.getTime()) ? null : d;
    };

    const result: Record<string, number> = {};

    switch (filter) {
        case "day": {
            const labels = ["0–4h", "4–8h", "8–12h", "12–16h", "16–20h", "20–24h"];
            labels.forEach((l) => (result[l] = 0));

            for (const o of orders) {
                const d = parseDate(o);
                if (!d) continue;
                if (now.getTime() - d.getTime() > 24 * 3600 * 1000) continue;

                const h = d.getHours();
                let label = "0–4h";
                if (h >= 4 && h < 8) label = "4–8h";
                else if (h >= 8 && h < 12) label = "8–12h";
                else if (h >= 12 && h < 16) label = "12–16h";
                else if (h >= 16 && h < 20) label = "16–20h";
                else if (h >= 20) label = "20–24h";

                result[label] += o.totalPrice || 0;
            }

            return labels.map((l) => ({ time: l, revenue: result[l] }));
        }

        case "week": {
            const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
            labels.forEach((l) => (result[l] = 0));

            for (const o of orders) {
                const d = parseDate(o);
                if (!d) continue;

                if (now.getTime() - d.getTime() > 7 * 24 * 3600 * 1000) continue;

                const wd = d.getDay();
                const label = wd === 0 ? "CN" : `T${wd + 1}`;
                result[label] += o.totalPrice || 0;
            }

            return labels.map((l) => ({ time: l, revenue: result[l] }));
        }

        case "month": {
            const labels = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
            labels.forEach((l) => (result[l] = 0));

            for (const o of orders) {
                const d = parseDate(o);
                if (!d) continue;

                if (now.getTime() - d.getTime() > 30 * 24 * 3600 * 1000) continue;

                const diffDays = Math.floor(
                    (now.getTime() - d.getTime()) / (24 * 3600 * 1000)
                );
                let idx = 3 - Math.floor(diffDays / 7);
                if (idx < 0) idx = 0;

                result[labels[idx]] += o.totalPrice || 0;
            }

            return labels.map((l) => ({ time: l, revenue: result[l] }));
        }

        case "quarter": {
            const labels = ["Tháng -2", "Tháng -1", "Tháng này"];
            labels.forEach((l) => (result[l] = 0));

            for (const o of orders) {
                const d = parseDate(o);
                if (!d) continue;

                const monthDiff =
                    (now.getFullYear() - d.getFullYear()) * 12 +
                    (now.getMonth() - d.getMonth());

                if (monthDiff >= 0 && monthDiff <= 2) {
                    const label =
                        monthDiff === 2 ? "Tháng -2" : monthDiff === 1 ? "Tháng -1" : "Tháng này";
                    result[label] += o.totalPrice || 0;
                }
            }

            return labels.map((l) => ({ time: l, revenue: result[l] }));
        }

        case "year": {
            const labels = [
                "Th1",
                "Th2",
                "Th3",
                "Th4",
                "Th5",
                "Th6",
                "Th7",
                "Th8",
                "Th9",
                "Th10",
                "Th11",
                "Th12",
            ];
            labels.forEach((l) => (result[l] = 0));

            for (const o of orders) {
                const d = parseDate(o);
                if (!d) continue;
                if (d.getFullYear() !== now.getFullYear()) continue;

                const label = labels[d.getMonth()];
                result[label] += o.totalPrice || 0;
            }

            return labels.map((l) => ({ time: l, revenue: result[l] }));
        }

        default:
            return [];
    }
};
/* =========================================================
    🔥 BUILD CƠ CẤU DOANH THU (STRUCTURE)
========================================================= */

const buildRevenueStructure = (
    totalRevenue: number,
    authorRevenue: number,
    aiCost: number,
    filter: RevenueFilter
) => {
    let factor = 1;
    switch (filter) {
        case "day":
            factor = 1 / 30;
            break;
        case "week":
            factor = 7 / 30;
            break;
        case "month":
            factor = 1;
            break;
        case "quarter":
            factor = 3;
            break;
        case "year":
            factor = 12;
            break;
    }

    return [
        { name: "Đơn hàng", value: totalRevenue * factor },
        { name: "Doanh thu tác giả", value: authorRevenue * factor },
        { name: "Chi phí host", value: HOST_COST_MONTH * factor },
        { name: "Chi phí AI", value: aiCost * factor },
    ];
};

/* =========================================================
          🧠 MAIN COMPONENT
========================================================= */

export default function AdminDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [bookCount, setBookCount] = useState(0);

    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [aiCost, setAiCost] = useState(0);
    const [authorRevenue, setAuthorRevenue] = useState(0);

    const [revenueFilter, setRevenueFilter] =
        useState<RevenueFilter>("month");
    const [structureFilter, setStructureFilter] =
        useState<RevenueFilter>("month");

    const [bookStatsMap, setBookStatsMap] = useState<
        Map<string, BookStats>
    >(new Map());

    const [loading, setLoading] = useState(true);

    const aiHook = useGetAllAIGenerations();
    const { data: aiResp } = aiHook;

    /* =========================================================
        🔥 LOAD DASHBOARD DATA (BOOKS + ORDERS + ITEMS + FEEDBACK)
    ========================================================== */
    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setLoading(true);

                // 1️⃣ Lấy danh sách SÁCH
                const books: Book[] = await getAllBooks();
                setBookCount(books.length);

                const bookMap = new Map<string, Book>();
                books.forEach(b => bookMap.set(b.bookId, b));

                // 2️⃣ Lấy tất cả đơn hàng (status = 4)
                const orderRes = await OrderService.getAllOrders();
                const successOrders = orderRes.filter(o => Number(o.status) === 4);

                setOrders(successOrders);
                setTotalOrders(successOrders.length);

                const totalRev = successOrders.reduce(
                    (sum, o) => sum + (o.totalPrice || 0),
                    0
                );
                setTotalRevenue(totalRev);

                // 3️⃣ Lấy tất cả orderDetails
                const orderDetails = await OrderDetailService.getAllOrderDetails();
                const successOrderIds = new Set(successOrders.map(o => o.orderId));

                const details = orderDetails.filter(d =>
                    successOrderIds.has(d.orderId)
                );

                // 4️⃣ Build thống kê sách
                const stats = new Map<string, BookStats>();

                for (const d of details) {
                    const bookId = d.bookId;

                    if (!stats.has(bookId)) {
                        stats.set(bookId, {
                            bookId,
                            totalQty: 0,
                            totalRevenue: 0,
                            feedbackCount: 0,
                            book: bookMap.get(bookId),
                        });
                    }

                    const s = stats.get(bookId)!;

                    s.totalQty += d.quantity;
                    s.totalRevenue += d.quantity * d.price;
                }

                // 5️⃣ Feedback (CHỈ CHẠY 1 LẦN — ngoài for)
                const feedbacks = await FeedbackService.getAll();

                for (const fb of feedbacks) {
                    const st = stats.get(fb.bookId);
                    if (st) st.feedbackCount += 1;
                }

                // 6️⃣ Set thống kê sách
                setBookStatsMap(stats);

                // 7️⃣ Tính doanh thu tác giả
                let authorTotal = 0;

                for (const s of stats.values()) {
                    const book = s.book;
                    if (!book?.authorId) continue;

                    let royalty = 0;
                    try {
                        const user = await getUserById(book.authorId);
                        const raw = Number(user?.royalty ?? 0);
                        royalty = raw > 1 ? raw / 100 : raw;
                    } catch {
                        royalty = 0;
                    }

                    authorTotal += s.totalRevenue * royalty;
                }

                setAuthorRevenue(authorTotal);

            } catch (err) {
                console.error("Dashboard error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);


    /* =========================================================
        🔥 AI COST
    ========================================================== */
    const totalAIGenerations = useMemo(() => {
        if (!aiResp) return 0;

        if (Array.isArray(aiResp)) return aiResp.length;

        const paged = aiResp as any;
        if (typeof paged.totalElements === "number") return paged.totalElements;
        if (Array.isArray(paged.content)) return paged.content.length;

        return 0;
    }, [aiResp]);

    useEffect(() => {
        const credits = totalAIGenerations * 3;
        const usd = credits * 0.03;
        const vnd = usd * USD_TO_VND;
        setAiCost(vnd);
    }, [totalAIGenerations]);

    /* =========================================================
          🔥 CHART DATA
    ========================================================== */

    const currentRevenueStructure = useMemo(
        () =>
            buildRevenueStructure(
                totalRevenue,
                authorRevenue,
                aiCost,
                structureFilter
            ),
        [totalRevenue, authorRevenue, aiCost, structureFilter]
    );

    const currentSalesData = useMemo(
        () => buildSalesSeries(orders, revenueFilter),
        [orders, revenueFilter]
    );

    /* =========================================================
          🔥 TOP BOOKS (best seller / interested / feedback)
    ========================================================== */
    const allStats = useMemo(() => Array.from(bookStatsMap.values()), [bookStatsMap]);

    const topSellingBooks = useMemo(
        () =>
            [...allStats]
                .sort((a, b) => b.totalQty - a.totalQty)
                .slice(0, 5),
        [allStats]
    );



    const mostFeedbackBooks = useMemo(
        () =>
            [...allStats]
                .sort((a, b) => b.feedbackCount - a.feedbackCount)
                .slice(0, 5),
        [allStats]
    );

    /* =========================================================
                  🔥 RENDER UI
    ========================================================== */

    return (
        <div className="flex h-screen bg-[#1a1a2e] text-white">
            <AdminSidebar isOpen={sidebarOpen} />

            {/* MAIN */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* HEADER */}
                <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
                    <div className="flex items-center justify-between px-6 py-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="text-white hover:bg-white/10"
                        >
                            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </Button>

                        <h1 className="text-lg font-semibold">
                            Thống kê tổng quan
                            {loading && (
                                <span className="text-xs text-white/60 ml-2">(Đang tải...)</span>
                            )}
                        </h1>
                    </div>
                </header>

                {/* CONTENT */}
                <div className="flex-1 p-6 overflow-auto space-y-8">

                    {/* CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                        {/* Doanh thu */}
                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" /> Doanh thu
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                                <p className="text-white/70 text-sm">Chỉ tính đơn thành công (status 4)</p>
                            </CardContent>
                        </Card>

                        {/* Tổng đơn */}
                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" /> Tổng đơn hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{totalOrders}</p>
                                <p className="text-white/70 text-sm">Đơn thành công</p>
                            </CardContent>
                        </Card>

                        {/* Số lượng sách */}
                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Số lượng sách
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{bookCount}</p>
                            </CardContent>
                        </Card>

                        {/* Chi phí AI */}
                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Cpu className="w-5 h-5" /> Chi phí AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{formatCurrency(aiCost)}</p>
                                <p className="text-white/70 text-sm">
                                    {totalAIGenerations} lượt × 3 credits × 0.03 USD
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CHARTS: PIE + BAR */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Pie */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white">Cơ cấu doanh thu</CardTitle>

                                <Select
                                    value={structureFilter}
                                    onValueChange={(v) => setStructureFilter(v as RevenueFilter)}
                                >
                                    <SelectTrigger className="w-32 bg-[#1a1a2e] border-white/20 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Ngày</SelectItem>
                                        <SelectItem value="week">Tuần</SelectItem>
                                        <SelectItem value="month">Tháng</SelectItem>
                                        <SelectItem value="quarter">Quý</SelectItem>
                                        <SelectItem value="year">Năm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>

                            <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={currentRevenueStructure}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={110}
                                            dataKey="value"
                                            label={(d: any) =>
                                                `${d.name} ${(d.percent * 100).toFixed(1)}%`
                                            }


                                        >
                                            {currentRevenueStructure.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>

                                        <Tooltip
                                            formatter={(v) => formatCurrency(Number(v))}
                                            contentStyle={{ backgroundColor: "#1a2332", border: "none" }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Bar */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white">Chi tiết cơ cấu</CardTitle>

                                <Select
                                    value={structureFilter}
                                    onValueChange={(v) => setStructureFilter(v as RevenueFilter)}
                                >
                                    <SelectTrigger className="w-32 bg-[#1a1a2e] border-white/20 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Ngày</SelectItem>
                                        <SelectItem value="week">Tuần</SelectItem>
                                        <SelectItem value="month">Tháng</SelectItem>
                                        <SelectItem value="quarter">Quý</SelectItem>
                                        <SelectItem value="year">Năm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>

                            <CardContent className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={currentRevenueStructure}>
                                        <XAxis dataKey="name" stroke="#ccc" />
                                        <YAxis stroke="#ccc" />
                                        <Tooltip
                                            formatter={(v) => formatCurrency(Number(v))}
                                            contentStyle={{ backgroundColor: "#1a2332", border: "none" }}
                                        />
                                        <Legend />
                                        <Bar dataKey="value" fill="#667EEA" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* LINE CHART */}
                    <Card className="bg-[#1a2332] border border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-white">Doanh thu theo thời gian</CardTitle>

                            <Select
                                value={revenueFilter}
                                onValueChange={(v) => setRevenueFilter(v as RevenueFilter)}
                            >
                                <SelectTrigger className="w-32 bg-[#1a1a2e] border-white/20 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Ngày</SelectItem>
                                    <SelectItem value="week">Tuần</SelectItem>
                                    <SelectItem value="month">Tháng</SelectItem>
                                    <SelectItem value="quarter">Quý</SelectItem>
                                    <SelectItem value="year">Năm</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>

                        <CardContent className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={currentSalesData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="time" stroke="#ccc" />
                                    <YAxis stroke="#ccc" />

                                    <Tooltip
                                        formatter={(v) => formatCurrency(Number(v))}
                                        contentStyle={{ backgroundColor: "#eaedf1ff", border: "none" }}
                                    />

                                    <Legend />

                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#764BA2"
                                        strokeWidth={3}
                                        dot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* TOP BOOKS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Bán chạy */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <TrendingUp className="w-5 h-5" /> Sách bán chạy
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {topSellingBooks.length === 0 && (
                                    <p className="text-sm text-white/60">Chưa có dữ liệu</p>
                                )}
                                {topSellingBooks.map((s, i) => (
                                    <div
                                        key={s.bookId}
                                        className="flex items-center justify-between px-3 py-2 border border-white/10 rounded-lg"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">
                                                #{i + 1} {s.book?.bookName}
                                            </span>
                                            <span className="text-xs text-white/60">
                                                Bán: {s.totalQty} – Doanh thu:{" "}
                                                {formatCurrency(s.totalRevenue)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Nhiều người quan tâm */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Star className="w-5 h-5" /> Sách nhiều người quan tâm
                                </CardTitle>
                            </CardHeader>

                            
                        </Card>

                        {/* Nhiều feedback */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <MessageCircle className="w-5 h-5" /> Sách nhiều feedback
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                {mostFeedbackBooks.length === 0 && (
                                    <p className="text-sm text-white/60">Chưa có dữ liệu</p>
                                )}
                                {mostFeedbackBooks.map((s, i) => (
                                    <div
                                        key={s.bookId}
                                        className="flex items-center justify-between px-3 py-2 border border-white/10 rounded-lg"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-white">
                                                #{i + 1} {s.book?.bookName}
                                            </span>
                                            <span className="text-xs text-white/60">
                                                Feedback: {s.feedbackCount} – Doanh thu:{" "}
                                                {formatCurrency(s.totalRevenue)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
}

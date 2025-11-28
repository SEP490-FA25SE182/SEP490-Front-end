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
import { OrderService, type OrderResponse } from "@/services/OrderService";
import { getUserById } from "@/services/UserService";
import { FeedbackService } from "@/services/FeedbackService";
import { OrderDetailService } from "@/services/OrderDetailService";
import { TransactionService } from "@/services/TransactionService";



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



const COLORS = ["#667EEA", "#764BA2", "#FFB830", "#F87171"];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(isNaN(value) ? 0 : value);


// =================== HELPERS ===================

const getStartDateByFilter = (filter: RevenueFilter) => {
    const now = new Date();
    const d = new Date(now);

    switch (filter) {
        case "day":
            d.setDate(now.getDate() - 1);
            break;
        case "week":
            d.setDate(now.getDate() - 7);
            break;
        case "month":
            d.setMonth(now.getMonth() - 1);
            break;
        case "quarter":
            d.setMonth(now.getMonth() - 3);
            break;
        case "year":
            d.setFullYear(now.getFullYear() - 1);
            break;
    }

    d.setHours(0, 0, 0, 0);
    return d;
};
const buildCostStructure = (
    platformMonthlyCost: number,
    authorPaidAmount: number,
    filter: RevenueFilter
) => {
    let platformCost = platformMonthlyCost;

    switch (filter) {
        case "day":
            platformCost /= 30;
            break;
        case "week":
            platformCost = (platformMonthlyCost * 7) / 30;
            break;
        case "month":
            break;
        case "quarter":
            platformCost *= 3;
            break;
        case "year":
            platformCost *= 12;
            break;
    }

    return [
        { name: "Chi phí nền tảng", value: Math.round(platformCost) },
        { name: "Chi phí tác quyền", value: authorPaidAmount },
    ];
};

const buildSalesSeries = (
    orders: OrderResponse[],
    filter: RevenueFilter
) => {
    const now = new Date();
    const result: Record<string, number> = {};

    const parseDate = (o: OrderResponse) => {
        if (!o.createdAt) return null;
        const d = new Date(o.createdAt);
        return isNaN(d.getTime()) ? null : d;
    };

    const labels =
        filter === "day"
            ? ["0–4h", "4–8h", "8–12h", "12–16h", "16–20h", "20–24h"]
            : filter === "week"
                ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
                : filter === "month"
                    ? ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]
                    : filter === "quarter"
                        ? ["Tháng -2", "Tháng -1", "Tháng này"]
                        : ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];

    labels.forEach(l => (result[l] = 0));

    for (const o of orders) {
        const d = parseDate(o);
        if (!d) continue;
        if (filter === "year" && d.getFullYear() !== now.getFullYear()) continue;

        const label = labels[d.getMonth()] || labels[0];
        result[label] += o.totalPrice || 0;
    }

    return labels.map(l => ({ time: l, revenue: result[l] }));
};


const getEndDate = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
};

// =================== COMPONENT ===================

export default function AdminDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [bookCount, setBookCount] = useState(0);

    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [, setAuthorRevenue] = useState(0);

    const [revenueFilter, setRevenueFilter] = useState<RevenueFilter>("month");
    const [structureFilter, setStructureFilter] = useState<RevenueFilter>("month");

    const [bookStatsMap, setBookStatsMap] = useState<Map<string, BookStats>>(new Map());
    const [loading, setLoading] = useState(true);

    const [authorPaidAmount, setAuthorPaidAmount] = useState(0);
    const [profit, setProfit] = useState(0);

    const HOST_COST_MONTH = 4_000_000;

    // =================== LOAD IO ===================

    useEffect(() => {
    const loadDashboard = async () => {
        try {
            setLoading(true);

            /* ========= LOAD BOOKS ========= */
            const books = await getAllBooks();
            setBookCount(books.length);

            /* ========= LOAD ORDERS ========= */
            const orderRes = await OrderService.getAllOrders();
            const successOrders = orderRes.filter(o => Number(o.status) === 4);

            setOrders(successOrders);
            setTotalOrders(successOrders.length);

            /* ========= LOAD ORDER DETAILS ========= */
            const orderDetails = await OrderDetailService.getAllOrderDetails();
            const successOrderIds = new Set(successOrders.map(o => o.orderId));
            const details = orderDetails.filter(d => successOrderIds.has(d.orderId));

            /* ✅ DOANH THU ĐÚNG (KHÔNG TÍNH SHIPPING) */
            let actualRevenue = 0;
            for (const d of details) {
                actualRevenue += d.quantity * d.price;
            }

            setTotalRevenue(actualRevenue);

            /* ========= SETTLEMENT THEO KỲ ========= */
            let paidAuthorTotal = 0;

            try {
                const res = await TransactionService.search({
                    transType: "SETTLEMENT",
                    status: "PAID"
                });

                const startDate = getStartDateByFilter(structureFilter);
                const endDate = getEndDate();

                const txList = (res.content || []).filter((t) => {
                    if (!t.createdAt) return false;
                    if (t.orderId !== null && t.orderId !== "") return false;

                    const d = new Date(t.createdAt);
                    return d >= startDate && d <= endDate;
                });

                paidAuthorTotal = txList.reduce(
                    (sum, t) => sum + Number(t.totalPrice || 0),
                    0
                );
            } catch { }

            setAuthorPaidAmount(paidAuthorTotal);

            /* ✅ LỢI NHUẬN */
            setProfit(actualRevenue - paidAuthorTotal);

            /* ========= BOOK STATS ========= */
            const bookMap = new Map<string, Book>();
            books.forEach(b => bookMap.set(b.bookId, b));

            const stats = new Map<string, BookStats>();

            for (const d of details) {
                if (!stats.has(d.bookId)) {
                    stats.set(d.bookId, {
                        bookId: d.bookId,
                        totalQty: 0,
                        totalRevenue: 0,
                        feedbackCount: 0,
                        book: bookMap.get(d.bookId),
                    });
                }

                const s = stats.get(d.bookId)!;
                s.totalQty += d.quantity;
                s.totalRevenue += d.quantity * d.price;
            }

            /* ========= FEEDBACK ========= */
            const feedbacks = await FeedbackService.getAll();
            for (const fb of feedbacks) {
                const st = stats.get(fb.bookId);
                if (st) st.feedbackCount += 1;
            }

            setBookStatsMap(stats);

            /* ========= AUTHOR ROYALTY ESTIMATION ========= */
            let authorTotal = 0;
            for (const s of stats.values()) {
                if (!s.book?.authorId) continue;

                let royalty = 0;
                try {
                    const user = await getUserById(s.book.authorId);
                    const raw = Number(user?.royalty ?? 0);
                    royalty = raw > 1 ? raw / 100 : raw;
                } catch { }

                authorTotal += s.totalRevenue * royalty;
            }

            setAuthorRevenue(authorTotal);
        } finally {
            setLoading(false);
        }
    };

    loadDashboard();
}, [structureFilter]);


    // =================== MEMO ===================

    const currentCostStructure = useMemo(
        () =>
            buildCostStructure(
                HOST_COST_MONTH,
                authorPaidAmount,
                structureFilter
            ),
        [HOST_COST_MONTH, authorPaidAmount, structureFilter]
    );

    const currentSalesData = useMemo(
        () => buildSalesSeries(orders, revenueFilter),
        [orders, revenueFilter]
    );

    const allStats = useMemo(() => Array.from(bookStatsMap.values()), [bookStatsMap]);

    const topSellingBooks = useMemo(
        () => [...allStats].sort((a, b) => b.totalQty - a.totalQty).slice(0, 5),
        [allStats]
    );

    const mostFeedbackBooks = useMemo(
        () => [...allStats].sort((a, b) => b.feedbackCount - a.feedbackCount).slice(0, 5),
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
                        {/* Lợi Nhuận */}
                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Cpu className="w-5 h-5" /> Lợi nhuận
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{formatCurrency(profit)}</p>
                                <p className="text-white/70 text-sm">
                                    Lợi nhuận = Doanh thu – Chi phí tác quyền
                                </p>
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

                        
                    </div>

                    {/* CHARTS: PIE + BAR */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Pie */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white">Cơ cấu chi phí</CardTitle>

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
                                            data={currentCostStructure}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={110}
                                            dataKey="value"
                                            label={(d: any) =>
                                                `${d.name} ${(d.percent * 100).toFixed(1)}%`
                                            }


                                        >
                                            {currentCostStructure.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>

                                        <Tooltip
                                            formatter={(v) => formatCurrency(Number(v))}
                                            contentStyle={{ backgroundColor: "#e5e8eeff", border: "none" }}
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
                                    <BarChart data={currentCostStructure}>
                                        <XAxis dataKey="name" stroke="#ccc" />
                                        <YAxis stroke="#ccc" />
                                        <Tooltip
                                            formatter={(v) => formatCurrency(Number(v))}
                                            contentStyle={{ backgroundColor: "#fbfbfbff", border: "none" }}
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

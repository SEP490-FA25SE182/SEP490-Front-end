import { useState, useEffect } from "react";
import { Menu, X, DollarSign, Users, ShoppingBag, Cpu } from "lucide-react";
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
import { getAllBooks } from "@/services/BookService";
import { useGetAllAIGenerations } from "@/services/AIService";
import { OrderService } from "@/services/OrderService";
import { CartItemService } from "@/services/CartItemService";
import { getBookById } from "@/services/BookService";
import { getUserById } from "@/services/UserService";

export default function AdminDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [bookCount, setBookCount] = useState<number>(0);
    const [totalRevenue, setTotalRevenue] = useState<number>(0);
    const [totalOrders, setTotalOrders] = useState<number>(0);
    const [aiCost, setAiCost] = useState<number>(0);
    const [authorRevenue, setAuthorRevenue] = useState<number>(0); // <-- dùng state, không dùng tổng * 0.7 cứng
    const [revenueFilter, setRevenueFilter] = useState<string>("month");
    const [structureFilter, setStructureFilter] = useState<string>("month");
    
    const aiHook = useGetAllAIGenerations();
    const { data: aiResp } = aiHook;

    const USD_TO_VND = 25000; // Tỷ giá USD -> VND

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await getAllBooks();
                const list = Array.isArray(res)
                    ? res
                    : Array.isArray((res as any)?.content)
                        ? (res as any).content
                        : [];
                setBookCount(list.length);
            } catch (error) {
                console.error("Lỗi khi tải danh sách sách:", error);
            }
        };
        fetchBooks();
    }, []);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const orders = await OrderService.getAllOrders();
                setTotalOrders(orders.length);
                const revenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
                setTotalRevenue(revenue);
            } catch (error) {
                console.error("Lỗi khi tải đơn hàng:", error);
            }
        };
        fetchOrders();
    }, []);

    // Tính doanh thu tác giả chính xác: duyệt orders -> cartItems -> book -> author -> royalty
    useEffect(() => {
        const computeAuthorRevenue = async () => {
            try {
                const orders = await OrderService.getAllOrders();
                const bookCache = new Map<string, any>();
                const userCache = new Map<string, any>();
                let sumAuthor = 0;

                for (const order of orders) {
                    if (!order.cartId) continue;
                    const items = await CartItemService.getItemsByCartId(order.cartId);
                    for (const it of items) {
                        const itemTotal = (it.price || 0) * (it.quantity || 1);

                        // lấy book (cache)
                        let book = bookCache.get(it.bookId);
                        if (book === undefined) {
                            try {
                                book = await getBookById(it.bookId);
                            } catch (e) {
                                book = null;
                            }
                            bookCache.set(it.bookId, book);
                        }
                        const authorId = book?.authorId;
                        if (!authorId) continue;

                        // lấy author user (cache)
                        let user = userCache.get(authorId);
                        if (user === undefined) {
                            try {
                                user = await getUserById(authorId);
                            } catch (e) {
                                user = null;
                            }
                            userCache.set(authorId, user);
                        }

                        const royaltyRaw = Number(user?.royalty ?? 0);
                        // nếu royalty là số lớn (>1) coi là phần trăm (vd 70 => 0.7), nếu đã fraction (0.7) giữ nguyên
                        const royalty = royaltyRaw > 1 ? royaltyRaw / 100 : royaltyRaw;
                        sumAuthor += itemTotal * (royalty || 0);
                    }
                }

                setAuthorRevenue(sumAuthor);
            } catch (err) {
                console.error("Lỗi khi tính doanh thu tác giả:", err);
                setAuthorRevenue(0);
            }
        };

        computeAuthorRevenue();
    }, []); // chạy 1 lần, có thể thêm dependency nếu muốn cập nhật khi orders thay đổi

    const totalAIGenerations = Array.isArray(aiResp)
        ? aiResp.length
        : Array.isArray((aiResp as any)?.content)
            ? (aiResp as any).content.length
            : 0;

    // Tính tiền AI: số lượt × 3 credits × 0.03 USD × tỷ giá
    useEffect(() => {
        const totalCredits = totalAIGenerations * 3;
        const totalUSD = totalCredits * 0.03;
        const totalVND = totalUSD * USD_TO_VND;
        setAiCost(totalVND);
    }, [totalAIGenerations]);

    /* ================================ 
       🔹 DỮ LIỆU CƠ CẤU DOANH THU (HARDCODE)
    ================================ */
    const hostCost = 4000000; // Chi phí host cố định

    /* thay authorRevenue cũ (totalRevenue * 0.7) bằng state authorRevenue */
    const revenueStructureData = {
        day: [
            { name: "Đơn hàng", value: totalRevenue * 0.05 },
            { name: "Doanh thu tác giả", value: authorRevenue * 0.05 },
            { name: "Chi phí host", value: hostCost / 30 },
            { name: "Chi phí AI", value: aiCost / 30 },
        ],
        week: [
            { name: "Đơn hàng", value: totalRevenue * 0.2 },
            { name: "Doanh thu tác giả", value: authorRevenue * 0.2 },
            { name: "Chi phí host", value: hostCost / 4 },
            { name: "Chi phí AI", value: aiCost / 4 },
        ],
        month: [
            { name: "Đơn hàng", value: totalRevenue },
            { name: "Doanh thu tác giả", value: authorRevenue },
            { name: "Chi phí host", value: hostCost },
            { name: "Chi phí AI", value: aiCost },
        ],
        quarter: [
            { name: "Đơn hàng", value: totalRevenue * 3 },
            { name: "Doanh thu tác giả", value: authorRevenue * 3 },
            { name: "Chi phí host", value: hostCost * 3 },
            { name: "Chi phí AI", value: aiCost * 3 },
        ],
        year: [
            { name: "Đơn hàng", value: totalRevenue * 12 },
            { name: "Doanh thu tác giả", value: authorRevenue * 12 },
            { name: "Chi phí host", value: hostCost * 12 },
            { name: "Chi phí AI", value: aiCost * 12 },
        ],
    };

    const COLORS = ["#667EEA", "#764BA2", "#FFB830", "#F87171"];

    /* ================================ 
       🔹 DỮ LIỆU DOANH THU THEO THỜI GIAN (HARDCODE)
    ================================ */
    const salesDataByPeriod = {
        day: [
            { time: "00:00", revenue: 500000 },
            { time: "04:00", revenue: 800000 },
            { time: "08:00", revenue: 1500000 },
            { time: "12:00", revenue: 2500000 },
            { time: "16:00", revenue: 3000000 },
            { time: "20:00", revenue: 4000000 },
        ],
        week: [
            { time: "T2", revenue: 8000000 },
            { time: "T3", revenue: 10000000 },
            { time: "T4", revenue: 12000000 },
            { time: "T5", revenue: 15000000 },
            { time: "T6", revenue: 18000000 },
            { time: "T7", revenue: 20000000 },
            { time: "CN", revenue: 22000000 },
        ],
        month: [
            { time: "Tuần 1", revenue: totalRevenue * 0.2 },
            { time: "Tuần 2", revenue: totalRevenue * 0.3 },
            { time: "Tuần 3", revenue: totalRevenue * 0.25 },
            { time: "Tuần 4", revenue: totalRevenue * 0.25 },
        ],
        quarter: [
            { time: "Tháng 1", revenue: totalRevenue },
            { time: "Tháng 2", revenue: totalRevenue * 1.1 },
            { time: "Tháng 3", revenue: totalRevenue * 1.2 },
        ],
        year: [
            { time: "Q1", revenue: totalRevenue * 3 },
            { time: "Q2", revenue: totalRevenue * 3.2 },
            { time: "Q3", revenue: totalRevenue * 3.5 },
            { time: "Q4", revenue: totalRevenue * 3.8 },
        ],
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(value);

    const currentRevenueStructure = revenueStructureData[structureFilter as keyof typeof revenueStructureData];
    const currentSalesData = salesDataByPeriod[revenueFilter as keyof typeof salesDataByPeriod];

    /* ================================ 
       🔹 GIAO DIỆN
    ================================ */
    return (
        <div className="flex h-screen bg-[#1a1a2e] text-white">
            {/* Sidebar */}
            <AdminSidebar isOpen={sidebarOpen} />

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
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
                        <h1 className="text-lg font-semibold">Thống kê tổng quan</h1>
                    </div>
                </header>

                {/* Nội dung chính */}
                <div className="flex-1 p-6 overflow-auto space-y-8">
                    {/* 🧾 Cards tổng quan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" /> Doanh thu
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                                <p className="text-white/70 text-sm">Tổng doanh thu từ đơn hàng</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" /> Tổng đơn hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{totalOrders}</p>
                                <p className="text-white/70 text-sm">Số đơn hàng đã tạo</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Số lượng sách
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{bookCount.toLocaleString()}</p>
                                <p className="text-white/70 text-sm">Tổng số sách</p>
                            </CardContent>
                        </Card>

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

                    {/* 🔵🟢 Merge: Biểu đồ tròn + Biểu đồ cột */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 🟢 Biểu đồ tròn: Cơ cấu doanh thu */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white">Cơ cấu doanh thu</CardTitle>
                                <Select value={structureFilter} onValueChange={setStructureFilter}>
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
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label={(data: any) =>
                                                `${data.name} ${(data.percent * 100).toFixed(1)}%`
                                            }
                                        >
                                            {currentRevenueStructure.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(Number(value))}
                                            contentStyle={{ backgroundColor: "#1a2332", border: "none" }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* 🔵 Biểu đồ cột: Cơ cấu doanh thu theo thời gian */}
                        <Card className="bg-[#1a2332] border border-white/10">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-white">Chi tiết cơ cấu</CardTitle>
                                <Select value={structureFilter} onValueChange={setStructureFilter}>
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
                                            formatter={(value) => formatCurrency(Number(value))}
                                            contentStyle={{ backgroundColor: "#1a2332", border: "none" }}
                                            labelStyle={{ color: "#fff" }}
                                        />
                                        <Legend />
                                        <Bar dataKey="value" fill="#667EEA" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 🔴 Biểu đồ đường: Doanh thu theo thời gian */}
                    <Card className="bg-[#1a2332] border border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-white">Doanh thu theo thời gian</CardTitle>
                            <Select value={revenueFilter} onValueChange={setRevenueFilter}>
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
                                        formatter={(value) => formatCurrency(Number(value))}
                                        contentStyle={{ backgroundColor: "#1a2332", border: "none" }}
                                        labelStyle={{ color: "#fff" }}
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
                </div>
            </div>
        </div>
    );
}
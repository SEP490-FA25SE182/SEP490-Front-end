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
import { getAllBooks } from "@/services/BookService"; // Cập nhật import từ BookService
import { useGetAllAIGenerations } from "@/services/AIService";

export default function AdminDashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [bookCount, setBookCount] = useState<number>(0); // Đổi tên từ userCount thành bookCount
    const aiHook = useGetAllAIGenerations();
    const { data: aiResp, isLoading: loadingAI } = aiHook;

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await getAllBooks(); // Sử dụng getAllBooks thay vì getAllUsers
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

    const totalAIGenerations = Array.isArray(aiResp)
        ? aiResp.length
        : Array.isArray((aiResp as any)?.content)
            ? (aiResp as any).content.length
            : 0;

    /* ================================ 
       🔹 DỮ LIỆU HARD CODE
    ================================ */
    const revenueData = [
        { name: "Sách", value: 54000000 },
        { name: "Blog Premium", value: 12000000 },
        { name: "Dịch vụ AI", value: 8000000 },
    ];
    const COLORS = ["#667EEA", "#764BA2", "#FFB830"];

    const trafficData = [
        { month: "T1", visits: 1500 },
        { month: "T2", visits: 2000 },
        { month: "T3", visits: 3500 },
        { month: "T4", visits: 3000 },
        { month: "T5", visits: 4000 },
        { month: "T6", visits: 4200 },
        { month: "T7", visits: 5200 },
        { month: "T8", visits: 4800 },
        { month: "T9", visits: 5300 },
        { month: "T10", visits: 6000 },
    ];

    const salesData = [
        { month: "T1", revenue: 12000000 },
        { month: "T2", revenue: 18000000 },
        { month: "T3", revenue: 26000000 },
        { month: "T4", revenue: 21000000 },
        { month: "T5", revenue: 30000000 },
        { month: "T6", revenue: 36000000 },
        { month: "T7", revenue: 41000000 },
        { month: "T8", revenue: 39000000 },
        { month: "T9", revenue: 47000000 },
        { month: "T10", revenue: 54000000 },
    ];

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(value);

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
                        <h1 className="text-lg font-semibold">📊 Thống kê tổng quan</h1>
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
                                <p className="text-2xl font-bold">{formatCurrency(54000000)}</p>
                                <p className="text-white/70 text-sm">+12.5% so với tháng trước</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" /> Tổng đơn hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">215</p>
                                <p className="text-white/70 text-sm">+5% so với tháng trước</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Số lượng sách
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">
                                    {bookCount.toLocaleString()} {/* Đổi từ userCount thành bookCount */}
                                </p>
                                <p className="text-white/70 text-sm">
                                    {loadingAI ? "Đang tải..." : "Tổng số sách"}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Cpu className="w-5 h-5" /> Lượt dùng AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">
                                    {loadingAI ? "..." : totalAIGenerations.toLocaleString()}
                                </p>
                                <p className="text-white/70 text-sm">Số lượt gọi AI</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 🟢 Biểu đồ tròn: Cơ cấu doanh thu */}
                    <Card className="bg-[#1a2332] border border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Cơ cấu doanh thu</CardTitle>
                        </CardHeader>
                        <CardContent className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={revenueData}
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
                                        {revenueData.map((_entry, index) => (
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

                    {/* 🔵 Biểu đồ cột: Lượt truy cập */}
                    <Card className="bg-[#1a2332] border border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Lượng truy cập từng tháng</CardTitle>
                        </CardHeader>
                        <CardContent className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trafficData}>
                                    <XAxis dataKey="month" stroke="#ccc" />
                                    <YAxis stroke="#ccc" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1a2332", border: "none" }}
                                        labelStyle={{ color: "#fff" }}
                                    />
                                    <Bar dataKey="visits" fill="#667EEA" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 🔴 Biểu đồ đường: Doanh thu theo tháng */}
                    <Card className="bg-[#1a2332] border border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Doanh thu theo tháng</CardTitle>
                        </CardHeader>
                        <CardContent className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="month" stroke="#ccc" />
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
import { useState } from 'react';
import { Menu, X, DollarSign, TrendingUp, CreditCard, Users, Calendar } from 'lucide-react';
import AuthorSidebar from '@/components/author/AuthorSidebar';
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

// Sample payment data
const paymentData = [
  {
    id: "PAY001",
    book_name: "Book Title 1",
    date: "2025-10-15",
    amount: 150000,
    commission: 105000,
    status: "completed",
    reader: "Nguyễn Văn A"
  },
  {
    id: "PAY002",
    book_name: "Book Title 3",
    date: "2025-10-14",
    amount: 200000,
    commission: 140000,
    status: "completed",
    reader: "Trần Thị B"
  },
  {
    id: "PAY003",
    book_name: "Book Title 5",
    date: "2025-10-12",
    amount: 120000,
    commission: 84000,
    status: "pending",
    reader: "Lê Văn C"
  },
  {
    id: "PAY004",
    book_name: "Book Title 2",
    date: "2025-10-10",
    amount: 180000,
    commission: 126000,
    status: "completed",
    reader: "Phạm Thị D"
  },
  {
    id: "PAY005",
    book_name: "Book Title 1",
    date: "2025-10-08",
    amount: 150000,
    commission: 105000,
    status: "completed",
    reader: "Hoàng Văn E"
  },
  {
    id: "PAY006",
    book_name: "Book Title 7",
    date: "2025-10-07",
    amount: 90000,
    commission: 63000,
    status: "completed",
    reader: "Võ Thị F"
  },
  {
    id: "PAY007",
    book_name: "Book Title 3",
    date: "2025-10-05",
    amount: 200000,
    commission: 140000,
    status: "failed",
    reader: "Đặng Văn G"
  },
  {
    id: "PAY008",
    book_name: "Book Title 9",
    date: "2025-10-03",
    amount: 175000,
    commission: 122500,
    status: "completed",
    reader: "Bùi Thị H"
  }
];

const statusLabels = {
  completed: { text: 'Hoàn thành', color: 'bg-green-100 text-green-600' },
  pending: { text: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-600' },
  failed: { text: 'Thất bại', color: 'bg-red-100 text-red-600' }
};

export default function AuthorIncome() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Calculate statistics
  const totalRevenue = paymentData.reduce((sum, payment) => sum + payment.amount, 0);
  const totalCommission = paymentData.reduce((sum, payment) => sum + payment.commission, 0);
  const completedPayments = paymentData.filter(p => p.status === 'completed').length;
  const pendingPayments = paymentData.filter(p => p.status === 'pending').length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue */}
            <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-300" />
                </div>
                <CardDescription className="text-white/70">Tổng Doanh Thu</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(totalRevenue)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-300 text-xs">+12.5% so với tháng trước</p>
              </CardContent>
            </Card>

            {/* Total Commission */}
            <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-300" />
                </div>
                <CardDescription className="text-white/70">Hoa Hồng Nhận Được</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(totalCommission)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70 text-xs">70% doanh thu</p>
              </CardContent>
            </Card>

            {/* Completed Payments */}
            <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <CardDescription className="text-white/70">Giao Dịch Hoàn Thành</CardDescription>
                <CardTitle className="text-2xl">{completedPayments}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70 text-xs">giao dịch</p>
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card className="bg-gradient-to-l from-[#764BA2] to-[#667EEA] text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
                <CardDescription className="text-white/70">Đang Chờ Xử Lý</CardDescription>
                <CardTitle className="text-2xl">{pendingPayments}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70 text-xs">giao dịch</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1a2332] border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Lịch Sử Thanh Toán</h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                  <TableHead className="text-white font-medium">Mã GD</TableHead>
                  <TableHead className="text-white font-medium">Tên Sách</TableHead>
                  <TableHead className="text-white font-medium">Người Mua</TableHead>
                  <TableHead className="text-white font-medium">Ngày</TableHead>
                  <TableHead className="text-white font-medium">Doanh Thu</TableHead>
                  <TableHead className="text-white font-medium">Hoa Hồng</TableHead>
                  <TableHead className="text-white font-medium">Trạng Thái</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paymentData.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{payment.id}</TableCell>
                    <TableCell>
                      <div className="text-gray-900 font-medium">{payment.book_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-600">{payment.reader}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-900 text-sm">
                        {new Date(payment.date).toLocaleDateString('vi-VN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-900 font-semibold">
                        {formatCurrency(payment.amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-600 font-semibold">
                        {formatCurrency(payment.commission)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusLabels[payment.status as keyof typeof statusLabels].color
                          }`}
                      >
                        {statusLabels[payment.status as keyof typeof statusLabels].text}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Summary Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Tổng cộng: <span className="font-semibold">{paymentData.length} giao dịch</span>
              </div>
              <div className="flex gap-6">
                <div className="text-sm">
                  <span className="text-gray-600">Tổng doanh thu: </span>
                  <span className="font-bold text-purple-600">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Tổng hoa hồng: </span>
                  <span className="font-bold text-green-600">{formatCurrency(totalCommission)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
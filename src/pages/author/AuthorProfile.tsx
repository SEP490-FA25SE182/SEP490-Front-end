import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Menu, X } from "lucide-react";
import axios from "axios";

import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getWalletByUserId, type Wallet } from "@/services/WalletService";
import type { User } from "@/services/UserService";
import { API_BASE_URL } from "@/config";

export default function AuthorProfile() {
  const { userId } = useParams<{ userId: string }>();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) User info
        const userRes = await axios.get<User>(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (mounted) setUser(userRes.data);

        // 2) Wallet info
        try {
          const w = await getWalletByUserId(userId);
          if (mounted) setWallet(w);
        } catch (e) {
          if (mounted) setWallet(null);
        }
      } catch (err: any) {
        console.error(err);
        if (mounted) setError("Không thể tải dữ liệu.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const formatCurrency = (n: number | undefined | null) =>
    n === undefined || n === null
      ? "-"
      : new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(n);

  const formatDate = (d?: string | null) => {
    if (!d) return "-";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("vi-VN");
  };

  const renderGender = (g?: string | null) => {
    if (!g) return "-";
    if (g === "MALE") return "Nam";
    if (g === "FEMALE") return "Nữ";
    return g;
  };

  // royalty tạm tính từ wallet, giữ lại như cũ
  const royaltyFromWallet = wallet
    ? Math.round((Number(wallet.balance) || 0) * 0.7)
    : undefined;

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER giống AuthorIncome */}
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">Hồ sơ tác giả</h1>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-white">Đang tải...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CARD THÔNG TIN AUTHOR */}
              <Card className="col-span-1 bg-[#1f2937] border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin Author</CardTitle>
                </CardHeader>
                <CardContent>
                  {user ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Họ & tên</span>
                        <span className="font-medium">{user.fullName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Email</span>
                        <span className="font-medium break-all">
                          {user.email || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Số điện thoại</span>
                        <span className="font-medium">
                          {user.phoneNumber || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Ngày sinh</span>
                        <span className="font-medium">
                          {formatDate(user.birthDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Giới tính</span>
                        <span className="font-medium">
                          {renderGender(user.gender)}
                        </span>
                      </div>                  
                      <div className="flex justify-between">
                        <span className="text-white/60">Royalty (từ User)</span>
                        <span className="font-medium">
                          {formatCurrency(user.royalty)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Cập nhật lần cuối</span>
                        <span className="font-medium">
                          {formatDate((user as any).updatedAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/70">
                      Không tìm thấy thông tin author.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CARD WALLET */}
              <Card className="col-span-2 bg-[#111827] border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Wallet & Số liệu tài chính</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs uppercase tracking-wide text-white/60">
                        Số dư Wallet
                      </div>
                      <div className="mt-2 text-xl font-semibold">
                        {formatCurrency(wallet?.balance)}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs uppercase tracking-wide text-white/60">
                        Số xu
                      </div>
                      <div className="mt-2 text-xl font-semibold">
                        {wallet?.coin ?? "-"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs uppercase tracking-wide text-white/60">
                        Royalty (ước tính từ Wallet)
                      </div>
                      <div className="mt-2 text-xl font-semibold">
                        {royaltyFromWallet === undefined
                          ? "-"
                          : formatCurrency(royaltyFromWallet)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { getWalletByUserId, createWallet, type Wallet } from "@/services/WalletService";
import { getCurrentUserId } from "@/utils/authStorage";
import { toast } from "sonner";
import { formatVND } from "@/lib/money";

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = getCurrentUserId();

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        let w: Wallet;

        try {
          // 🔍 lấy ví theo user
          w = await getWalletByUserId(userId);
        } catch {
          // ❗ chưa có ví → tạo ví mới
          w = await createWallet({
            userId,
            balance: 0,
            coin: 0,
            isActived: "ACTIVE",
          });

          toast.success("🎉 Ví mới đã được tạo!");
        }

        setWallet(w);
      } catch (err) {
        console.error("❌ Lỗi khi tải ví:", err);
        toast.error("Không thể tải ví!");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  if (loading) return <p className="text-center py-10">Đang tải ví...</p>;

  const balance = wallet?.balance ?? 0;
  const coin = wallet?.coin ?? 0;

  return (
    <>
      <h1 className="text-xl font-bold text-gray-800 mb-8">VÍ CỦA TÔI</h1>

      {/* 💰 Tiền thật */}
      <div className="text-center mb-8">
        <p className="text-gray-500 text-sm">Số dư (VND)</p>
        <h2 className="text-3xl font-extrabold text-emerald-500">
          {formatVND(balance)}
        </h2>
      </div>

      {/* 🪙 Xu */}
      <div className="text-center mb-10">
        <p className="text-gray-500 text-sm">Xu thưởng</p>
        <h2 className="text-3xl font-extrabold text-yellow-500">
          {coin} Xu
        </h2>
      </div>

      <p className="text-center text-gray-400 italic">
        Bạn chưa có giao dịch nào.
      </p>
    </>
  );
}

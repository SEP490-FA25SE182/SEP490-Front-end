import { useEffect, useState } from "react";
import { getWalletByUserId, createWallet, type Wallet } from "@/services/WalletService";
import { getCurrentUserId } from "@/utils/authStorage";
import { toast } from "sonner";
import { formatVND } from "@/lib/money";
import {
  TransactionService,
  type TransactionResponse,
  type TransactionType,
} from "@/services/TransactionService";

const TRANSACTION_LABEL: Record<string, string> = {
  PAYMENT: "Thanh toán đơn hàng",
  REFUND: "Hoàn tiền đơn hàng",
  SETTLEMENT: "Doanh thu tác giả",
  DEPOSIT: "Nạp tiền vào ví",
  WITHDRAW: "Rút tiền từ ví",
  AI_IMAGE: "Tạo ảnh AI",
  AI_MODEL: "Dùng AI Model",
};

const isIncome = (type: TransactionType) =>
  ["REFUND", "SETTLEMENT", "DEPOSIT"].includes(type);



export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [filter, setFilter] = useState<"ALL" | TransactionType>("ALL");
  const [loadingTx, setLoadingTx] = useState(true);


  const userId = getCurrentUserId();

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        let w: Wallet;

        try {
          //  lấy ví theo user
          w = await getWalletByUserId(userId);
        } catch {
          //  chưa có ví → tạo ví mới
          w = await createWallet({
            userId,
            balance: 0,
            coin: 0,
            isActived: "ACTIVE",
          });

          toast.success(" Ví mới đã được tạo!");
        }

        setWallet(w);
        // 🔽 load giao dịch theo wallet
        const txRes = await TransactionService.searchTransactions({
          walletId: w.walletId,
          page: 0,
          status: 3,
          size: 10,
          sort: ["createdAt,desc"], // mới nhất trước
        });

        setTransactions(txRes.content ?? []);

      } catch (err) {
        console.error(" Lỗi khi tải ví:", err);
        toast.error("Không thể tải ví!");
      } finally {
        setLoading(false);
        setLoadingTx(false);

      }
    };

    load();
  }, [userId]);

  const filteredTransactions =
    filter === "ALL"
      ? transactions
      : transactions.filter(tx => tx.transType === filter);


  if (loading) return <p className="text-center py-10">Đang tải ví...</p>;

  const balance = wallet?.balance ?? 0;
  const coin = wallet?.coin ?? 0;

  return (
    <>
      <h1 className="text-xl font-bold text-gray-800 mb-8">VÍ CỦA TÔI</h1>

      {/*  Tiền thật */}
      <div className="text-center mb-8">
        <p className="text-gray-500 text-sm">Số dư (VND)</p>
        <h2 className="text-3xl font-extrabold text-emerald-500">
          {formatVND(balance)}
        </h2>
      </div>

      {/*  Xu */}
      <div className="text-center mb-10">
        <p className="text-gray-500 text-sm">Xu thưởng</p>
        <h2 className="text-3xl font-extrabold text-yellow-500">
          {Number(coin ?? 0).toLocaleString("vi-VN")} xu
        </h2>
      </div>

      {/*  Bộ lọc giao dịch */}
      <div className="flex flex-wrap gap-2 justify-center mb-5">
        {[
          { label: "Tất cả", value: "ALL" },
          { label: "Nạp tiền", value: "DEPOSIT" },
          { label: "Thanh toán", value: "PAYMENT" },
          { label: "Hoàn tiền", value: "REFUND" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={`px-3 py-1 rounded-full text-sm border
        ${filter === f.value
                ? "bg-emerald-500 text-white"
                : "bg-white text-gray-600"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>


      <div className="space-y-3">
        {loadingTx && (
          <p className="text-center text-gray-400">Đang tải giao dịch...</p>
        )}

        {!loadingTx && filteredTransactions.length === 0 && (
          <p className="text-center text-gray-400 italic">
            Chưa có giao dịch
          </p>
        )}

        {filteredTransactions.map(tx => (
          <div
            key={tx.transactionId}
            className="flex justify-between items-center p-3 border rounded-lg"
          >
            <div>
              <p className="font-medium text-sm">
                {TRANSACTION_LABEL[tx.transType] ?? tx.transType}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(tx.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>

            <div className="text-right">
              <p
                className={`font-semibold ${isIncome(tx.transType)
                    ? "text-emerald-500"
                    : "text-red-500"
                  }`}
              >
                {isIncome(tx.transType) ? "+" : "-"}
                {formatVND(Math.abs(tx.totalPrice))}
              </p>
            </div>
          </div>
        ))}
      </div>

    </>
  );
}

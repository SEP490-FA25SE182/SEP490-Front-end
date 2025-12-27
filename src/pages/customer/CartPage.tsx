import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatVND } from "@/lib/money";
import { Link, useNavigate } from "react-router-dom";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { getWalletByUserId } from "@/services/WalletService";
import { getUserByEmail } from "@/services/UserService";
import { useAuth } from "@/context/AuthContext";
import { Switch } from "@/components/ui/switch";

export default function CartPage() {
  const { state, setQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coin, setCoin] = useState<number>(0);

  const [useCoin, setUseCoin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedLines = state.lines.filter((line) =>
    selectedIds.includes(line.book.bookId)
  );

  const selectedSubtotal = selectedLines.reduce(
    (sum, line) => sum + (line.price ?? 0) * line.qty,
    0
  );

  const discount = useCoin ? selectedSubtotal * 0.1 : 0;
  const displaySubtotal = useCoin
    ? selectedSubtotal - discount
    : selectedSubtotal;

  useEffect(() => {
    async function loadCoin() {
      try {
        if (!user?.email) return;

        const userRes = await getUserByEmail(user.email);
        if (!userRes?.userId) return;

        const walletRes = await getWalletByUserId(userRes.userId);
        const wallet = Array.isArray(walletRes) ? walletRes[0] : walletRes;

        if (wallet?.coin != null) {
          setCoin(wallet.coin);
        }
      } catch (err) {
        console.error(" Lỗi load coin:", err);
      }
    }

    loadCoin();
  }, [user?.email]);

  const handleCheckout = async () => {
    try {
      if (!state?.cartId) {
        toast.error("Không tìm thấy giỏ hàng hiện tại.");
        return;
      }

      const invalidQtyItem = selectedLines.find(
        (line) => line.qty <= 0 || !Number.isInteger(line.qty)
      );
      if (invalidQtyItem) {
        toast.error("Sản phẩm hiện tại đã hết hàng hoặc không khả dụng");
        return;
      }

      if (!user?.email) {
        toast.error("Không tìm thấy thông tin người dùng.");
        return;
      }

      const userRes = await getUserByEmail(user.email);
      const userId = userRes?.userId;
      if (!userId) {
        toast.error("Không tìm thấy userId hợp lệ.");
        return;
      }

      const walletRes = await getWalletByUserId(userId);
      const wallet = Array.isArray(walletRes) ? walletRes[0] : walletRes;
      if (!wallet?.walletId) {
        toast.error("Không tìm thấy ví người dùng.");
        return;
      }

      const selectedCartItemIds = state.lines
        .filter((line) => selectedIds.includes(line.book.bookId))
        .map((line) => line.cartItemId)
        .filter(Boolean) as string[];

      if (selectedCartItemIds.length === 0) {
        toast.error("Vui lòng chọn ít nhất 1 sản phẩm");
        return;
      }

      //  CHỈ ĐẨY STATE SANG CHECKOUT
      navigate("/checkout", {
        state: {
          cartId: state.cartId,
          walletId: wallet.walletId,
          usedCoin: useCoin,
          selectedCartItemIds,
        },
      });
    } catch (error: any) {
      console.error(" Lỗi khi chuyển sang checkout:", error);
      toast.error(error?.message || "Không thể chuyển sang checkout.");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="container mx-auto px-6 md:px-20 py-12">
        <h1 className="text-white text-2xl font-bold mb-6 uppercase tracking-wide">
          Giỏ hàng
        </h1>

        {state.lines.length === 0 ? (
          <div className="rounded-xl bg-white/5 p-10 text-center border border-white/10">
            <p className="text-white/80 mb-4">Giỏ hàng của bạn đang trống.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg bg-white text-[#16213E] px-4 py-2 font-medium hover:opacity-90 transition"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Danh sách item */}
            <div className="lg:col-span-2 space-y-4">
              {state.lines.map((line) => {
                const unit = line.price;
                const id = line.book.bookId;

                const isMaxStock = line.qty >= line.book.quantity;
                const isOutOfStock = line.book.quantity === 0;

                return (
                  <div
                    key={line.cartItemId}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 flex gap-4 items-center "
                  >
                    {/*  Checkbox chọn sách */}

                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => {
                          if (selectedIds.includes(id)) {
                            setSelectedIds((prev) =>
                              prev.filter((x) => x !== id)
                            );
                          } else {
                            setSelectedIds((prev) => [...prev, id]);
                          }
                        }}
                        className={`
                          w-6 h-6 rounded-md flex items-center justify-center
                          border transition-all duration-300

                          ${
                            selectedIds.includes(id)
                              ? "bg-linear-to-r from-[#764BA2] to-[#667EEA] border-transparent"
                              : "bg-white/5 border-white/30"
                          }
                        `}
                      >
                        {selectedIds.includes(id) && (
                          <span className="text-white text-sm font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="w-20 h-28 overflow-hidden rounded-lg shrink-0">
                      <img
                        src={line.book.coverUrl}
                        alt={line.book.bookName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="224"%3E%3Crect width="160" height="224" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold line-clamp-2">
                        {line.book.bookName}
                      </h3>
                      {line.book.decription && (
                        <p className="text-white/60 text-sm line-clamp-1 mt-1">
                          {line.book.decription}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="text-white/80">
                          Đơn giá:{" "}
                          <span className="font-semibold">
                            {formatVND(unit)}
                          </span>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            disabled={isOutOfStock || line.qty <= 1}
                            onClick={() =>
                              setQty(
                                line.book.bookId,
                                Math.max(1, line.qty - 1),
                                line.book.price
                              )
                            }
                            className={`
                              w-8 h-8 grid place-items-center rounded-lg transition
                              ${
                                isOutOfStock || line.qty <= 1
                                  ? "bg-gray-500/30 text-gray-400 cursor-not-allowed"
                                  : "bg-white/10 text-white hover:bg-white/20"
                              }
                            `}
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={line.book.quantity}
                            value={isOutOfStock ? 0 : line.qty}
                            disabled={isOutOfStock}
                            className={`
                              w-14 text-center rounded-lg py-1 border
                              ${
                                isOutOfStock
                                  ? "bg-gray-500/20 text-gray-400 cursor-not-allowed border-white/10"
                                  : "bg-black/20 text-white border-white/10"
                              }
                            `}
                            onChange={(e) => {
                              if (isOutOfStock) return;

                              const value = Number(e.target.value);

                              if (value > line.book.quantity) {
                                toast.warning(
                                  `Kho chỉ còn ${line.book.quantity} sản phẩm`
                                );
                                setQty(
                                  line.book.bookId,
                                  line.book.quantity,
                                  line.book.price
                                );
                                return;
                              }

                              setQty(
                                line.book.bookId,
                                Math.max(1, value || 1),
                                line.book.price
                              );
                            }}
                          />

                          <button
                            disabled={isMaxStock || isOutOfStock}
                            onClick={() =>
                              setQty(
                                line.book.bookId,
                                line.qty + 1,
                                line.book.price
                              )
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                            onClick={() =>
                              setQty(
                                line.book.bookId,
                                line.qty + 1,
                                line.book.price
                              )
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          <button
                            className="ml-2 w-8 h-8 grid place-items-center rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30"
                            onClick={() => remove(line.book.bookId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-white">
                        Thành tiền:{" "}
                        <span className="font-bold">
                          {formatVND(unit * line.qty)}
                        </span>
                        {line.book.quantity === 0 ? (
                          <p className="text-red-500 text-sm mt-1 font-semibold">
                            Hết hàng
                          </p>
                        ) : line.qty >= line.book.quantity ? (
                          <p className="text-red-400 text-sm mt-1">
                            Đã đạt số lượng tối đa trong kho
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tóm tắt */}
            <aside className="rounded-xl border border-white/10 bg-white/5 p-5 h-fit">
              <h2 className="text-white font-bold text-lg mb-4">
                Tóm tắt đơn hàng
              </h2>
              <div className="flex items-center justify-between text-white/80 mb-2">
                <span>Tạm tính</span>
                <span className="font-semibold text-white">
                  {formatVND(displaySubtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-white/80 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={useCoin}
                    onCheckedChange={setUseCoin}
                    disabled={coin === 0}
                    className="
                      border border-white/40
                      bg-white/10
                      transition-all duration-300

                      data-[state=checked]:bg-linear-to-r
                      data-[state=checked]:from-[#764BA2]
                      data-[state=checked]:to-[#667EEA]

                      [&>span]:border [&>span]:border-white/40 [&>span]:transition-all

                      [&[data-state=unchecked]>span]:bg-linear-to-r
                      [&[data-state=unchecked]>span]:from-[#764BA2]
                      [&[data-state=unchecked]>span]:to-[#667EEA]

                      [&[data-state=checked]>span]:bg-white
                    "
                  />

                  <span>Sử dụng xu</span>
                  <span className="text-yellow-400 text-sm">
                    ({coin.toLocaleString()} xu)
                  </span>
                </label>

                {useCoin && (
                  <span className="text-green-400 font-semibold">
                    -{formatVND(discount)}
                  </span>
                )}
              </div>

              <div className="h-px bg-white/10 my-3" />
              <div className="flex items-center justify-between text-white mb-4">
                <span className="font-semibold">Thành tiền</span>
                <span className="font-bold">{formatVND(displaySubtotal)}</span>
              </div>

              <button
                disabled={selectedIds.length === 0}
                className={`w-full rounded-lg py-2 font-semibold transition-all
                  ${
                    selectedIds.length === 0
                      ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                      : "bg-linear-to-l from-[#764BA2] to-[#667EEA] text-white hover:opacity-90"
                  }
                `}
                onClick={handleCheckout}
              >
                Thanh toán
              </button>

              <button
                className="w-full mt-2 rounded-lg border border-white/20 text-white py-2 hover:bg-white/10 transition"
                onClick={clear}
              >
                Xoá giỏ hàng
              </button>

              <Link
                to="/"
                className="block text-center mt-3 text-white/70 hover:text-white underline underline-offset-4"
              >
                Tiếp tục mua sắm
              </Link>
            </aside>
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}

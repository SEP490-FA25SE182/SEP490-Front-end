import { useCart } from "@/context/CartContext";
import { formatVND } from "@/lib/money";
import { Link } from "react-router-dom";
import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerFooter from "@/components/customer/CustomerFooter";
import { Trash2, Minus, Plus } from "lucide-react";

export default function CartPage() {
  const { state, subtotal, setQty, remove, clear } = useCart();

  return (
    <div className="min-h-screen bg-gradient-to-l from-[#0F3460] via-[#16213E] to-[#1a1a2e]">
      <CustomerHeader />

      <main className="container mx-auto px-6 md:px-20 py-12">
        <h1 className="text-white text-2xl font-bold mb-6 uppercase tracking-wide">Giỏ hàng</h1>

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
                const unit = line.book.sale_price ?? line.book.price ?? 150000;
                return (
                  <div
                    key={line.book.book_id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 flex gap-4"
                  >
                    <div className="w-20 h-28 overflow-hidden rounded-lg shrink-0">
                      <img
                        src={line.book.cover_url}
                        alt={line.book.book_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="224"%3E%3Crect width="160" height="224" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold line-clamp-2">{line.book.book_name}</h3>
                      {line.book.decription && (
                        <p className="text-white/60 text-sm line-clamp-1 mt-1">{line.book.decription}</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="text-white/80">
                          Đơn giá: <span className="font-semibold">{formatVND(unit)}</span>
                          {line.book.sale_price && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-200">
                              Giảm giá
                            </span>
                          )}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                            onClick={() => setQty(line.book.book_id, Math.max(1, line.qty - 1))}
                            aria-label="decrease"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            className="w-14 text-center rounded-lg bg-black/20 text-white border border-white/10 py-1"
                            type="number"
                            min={1}
                            value={line.qty}
                            onChange={(e) =>
                              setQty(line.book.book_id, Math.max(1, Number(e.target.value) || 1))
                            }
                          />
                          <button
                            className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                            onClick={() => setQty(line.book.book_id, line.qty + 1)}
                            aria-label="increase"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          <button
                            className="ml-2 w-8 h-8 grid place-items-center rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30"
                            onClick={() => remove(line.book.book_id)}
                            aria-label="remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-white">
                        Thành tiền: <span className="font-bold">{formatVND(unit * line.qty)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tóm tắt */}
            <aside className="rounded-xl border border-white/10 bg-white/5 p-5 h-fit">
              <h2 className="text-white font-bold text-lg mb-4">Tóm tắt đơn hàng</h2>
              <div className="flex items-center justify-between text-white/80 mb-2">
                <span>Tạm tính</span>
                <span className="font-semibold text-white">{formatVND(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-white/60 mb-2">
                <span>Phí vận chuyển</span>
                <span>Sẽ tính ở bước sau</span>
              </div>
              <div className="h-px bg-white/10 my-3" />
              <div className="flex items-center justify-between text-white mb-4">
                <span className="font-semibold">Thành tiền</span>
                <span className="font-bold">{formatVND(subtotal)}</span>
              </div>

              <button className="w-full rounded-lg bg-white text-[#16213E] py-2 font-semibold hover:opacity-90 transition">
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

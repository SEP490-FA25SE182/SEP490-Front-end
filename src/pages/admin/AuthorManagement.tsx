import { useEffect, useState } from "react";
import { Menu, X, Loader2, FileText } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
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
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { formatVND } from "@/lib/money";

import { getAllUsers, getRoleById } from "@/services/UserService";
import { getAllBooks, type Book } from "@/services/BookService";
import { OrderService, type OrderResponse } from "@/services/OrderService";
import {
  OrderDetailService,
  type OrderDetailResponse,
} from "@/services/OrderDetailService";
import { TransactionService } from "@/services/TransactionService";
import { getWalletByUserId, updateWallet } from "@/services/WalletService";
import { ContractService } from "@/services/ContractService";

import { resolveFirebaseUrl } from "@/firebase";

import axios from "axios";
import { API_RK } from "@/config";

// ===============================
//  TYPES & HELPERS
// ===============================
type AuthorBookStat = {
  bookId: string;
  bookName: string;
  soldQty: number;
  revenue: number;
};

type AuthorRow = {
  userId: string;
  fullName: string;
  email: string;
  roleId: string;
  royalty?: number;
  totalBooks: number;
  totalSold: number;
  totalRevenue: number;
  breakdown: AuthorBookStat[];
  lastSettlementAt?: string; // thời điểm tất toán gần nhất
  canSettle: boolean; // có được phép tất toán nữa không
};

type FilterStatus = "all" | "hasRevenue" | "noRevenue";

async function getContractByUserId(userId: string) {
  const contracts = await ContractService.search({
    isActived: "ACTIVE",
  });

  return contracts.find((c) => c.userId === userId) ?? null;
}


export default function AuthorManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorRow | null>(null);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settleAuthor, setSettleAuthor] = useState<AuthorRow | null>(null);

  const [, setContract] = useState<any>(null);

  const [contractViewOpen, setContractViewOpen] = useState(false);
  const [contractView, setContractView] = useState<any>(null);
  const [contractViewUrls, setContractViewUrls] = useState<string[]>([]);


  // ===============================
  //  FETCH AUTHORS + STATS
  // ===============================

  //--tạm thời chưa dùng đến
  // function isSameMonth(a: Date, b: Date) {
  //     return (
  //         a.getFullYear() === b.getFullYear() &&
  //         a.getMonth() === b.getMonth()
  //     );
  // }

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      // 1️⃣ Lấy users + books
      const users = await getAllUsers();
      const books = await getAllBooks();

      console.log("✅ users raw:", users);
      console.log("✅ books raw:", books);

      // 2️⃣ Gắn roleName cho từng user (giống login)
      const usersWithRole = await Promise.all(
        users.map(async (u) => {
          try {
            const roleResp = await getRoleById(u.roleId);
            const roleName = (roleResp?.roleName || "").toLowerCase();
            return { user: u, roleName };
          } catch (err) {
            console.warn("Không lấy được role cho user", u.userId, err);
            return { user: u, roleName: "" };
          }
        })
      );

      const authorUsers = usersWithRole
        .filter((x) => {
          const role = x.roleName?.toLowerCase() || "";
          return (
            role === "author" ||
            role.endsWith("_author") ||
            role.includes("author")
          );
        })
        .map((x) => x.user);

      // 4️⃣ Lấy danh sách order (status 5) + orderDetails
      let successOrders: OrderResponse[] = [];
      let detailsByOrderId = new Map<string, OrderDetailResponse[]>();

      try {
        const ordersRes = await OrderService.getAllOrders();
        const orders = Array.isArray(ordersRes)
          ? ordersRes
          : (ordersRes as any)?.content ?? [];

        successOrders = orders.filter(
          (o: OrderResponse) => Number(o.status) === 5
        );

        // Lấy orderDetails theo từng order
        const allDetailsArrays = await Promise.all(
          successOrders.map((o) =>
            OrderDetailService.getOrderDetailsByOrderId(o.orderId)
          )
        );

        successOrders.forEach((o, idx) => {
          detailsByOrderId.set(o.orderId, allDetailsArrays[idx] || []);
        });
      } catch (err) {
        console.warn(
          "⚠️ Không lấy được orders/orderDetails, tạm xem như chưa có doanh thu",
          err
        );
        successOrders = [];
        detailsByOrderId = new Map();
      }

      // 5️⃣ Map bookId -> Book giúp lookup nhanh
      const bookMap = new Map<string, Book>();
      books.forEach((b) => bookMap.set(b.bookId, b));

      // 6️⃣ Lấy thông tin tất toán gần nhất cho từng author (wallet + transaction SETTLEMENT)
      const authorSettlementMap = new Map<
        string,
        { lastSettlementAt?: string }
      >();

      await Promise.all(
        authorUsers.map(async (u) => {
          try {
            const wallet = await getWalletByUserId(u.userId);
            if (!wallet?.walletId) {
              authorSettlementMap.set(u.userId, {
                lastSettlementAt: undefined,
              });
              return;
            }

            const txRes = await TransactionService.search({
              walletId: wallet.walletId,
              transType: "SETTLEMENT",
            });

            const txs = txRes?.content ?? [];
            if (!txs.length) {
              authorSettlementMap.set(u.userId, {
                lastSettlementAt: undefined,
              });
              return;
            }

            // lấy transaction mới nhất theo createdAt
            const latest = txs.reduce((acc, t) =>
              new Date(t.createdAt) > new Date(acc.createdAt) ? t : acc
            );

            authorSettlementMap.set(u.userId, {
              lastSettlementAt: latest.createdAt,
            });
          } catch (err) {
            console.warn(
              "⚠️ Không lấy được settlement cho author",
              u.userId,
              err
            );
            authorSettlementMap.set(u.userId, { lastSettlementAt: undefined });
          }
        })
      );

      // const now = new Date();

      // 7️⃣ Build thống kê cho từng tác giả
      const result: AuthorRow[] = authorUsers.map((u) => {
        const myBooks: Book[] = books.filter((b) => b.authorId === u.userId);
        const settleInfo = authorSettlementMap.get(u.userId);
        const lastSettlementAt = settleInfo?.lastSettlementAt;
        const lastSettleDate = lastSettlementAt
          ? new Date(lastSettlementAt)
          : null;

        let totalSold = 0;
        let totalRevenue = 0;
        const breakdownMap = new Map<string, AuthorBookStat>();

        // duyệt các order đã giao
        for (const order of successOrders) {
          // bỏ qua order cũ hơn hoặc bằng lần tất toán gần nhất
          if (order.createdAt && lastSettleDate) {
            const orderDate = new Date(order.createdAt);
            if (orderDate <= lastSettleDate) continue;
          }

          const details = detailsByOrderId.get(order.orderId) || [];
          for (const d of details) {
            const book = bookMap.get(d.bookId);
            if (!book || book.authorId !== u.userId) continue;

            let stat = breakdownMap.get(book.bookId);
            if (!stat) {
              stat = {
                bookId: book.bookId,
                bookName: book.bookName,
                soldQty: 0,
                revenue: 0,
              };
              breakdownMap.set(book.bookId, stat);
            }

            stat.soldQty += d.quantity;
            stat.revenue += d.quantity * d.price;
            totalSold += d.quantity;
            totalRevenue += d.quantity * d.price;
          }
        }

        // Đã tất toán trong THÁNG HIỆN TẠI → cấm tất toán tiếp
        // const canSettle =
        //     !lastSettleDate || !isSameMonth(now, lastSettleDate);

        // DEMO MODE: chỉ cần có doanh thu mới là cho tất toán tiếp
        const canSettle = totalRevenue > 0;

        return {
          userId: u.userId,
          fullName: u.fullName,
          email: u.email,
          roleId: u.roleId,
          royalty: u.royalty,
          totalBooks: myBooks.length,
          totalSold,
          totalRevenue,
          breakdown: Array.from(breakdownMap.values()),
          lastSettlementAt: lastSettlementAt || undefined,
          canSettle,
        };
      });

      setAuthors(result);
    } catch (error) {
      console.error("❌ Lỗi tải tác giả:", error);
      toast.error("Không thể tải danh sách tác giả");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("✅ useEffect triggered");
    fetchAuthors();
  }, []);

  useEffect(() => {
    if (!contractViewOpen) {
      setContractViewUrls([]);
      setContractView(null);
    }
  }, [contractViewOpen]);


  // ===============================
  //  FILTERED LIST
  // ===============================
  const filteredAuthors = authors.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (a.fullName?.toLowerCase() || "").includes(q) ||
      (a.email?.toLowerCase() || "").includes(q);

    const matchFilter =
      filterStatus === "all" ||
      (filterStatus === "hasRevenue" && a.totalRevenue > 0) ||
      (filterStatus === "noRevenue" && a.totalRevenue === 0);

    return matchSearch && matchFilter;
  });

  // ===============================
  //  VIEW DETAIL
  // ===============================
  const openDetailDialog = async (author: AuthorRow) => {
    setSelectedAuthor(author);
    setDetailOpen(true);

    try {
      const c = await getContractByUserId(author.userId);
      setContract(c);
    } catch {
      setContract(null);
    }
  };


  const openContractView = async (authorId: string) => {
    setContractViewOpen(true);
    setContractView(null);
    setContractViewUrls([]);

    try {
      const c = (await getContractByUserId(authorId)) as {
        documentUrls?: string[];
      } | null;

      setContractView(c);

      if (Array.isArray(c?.documentUrls) && c.documentUrls.length > 0) {
        const urls = await Promise.all(
          c.documentUrls.map((u) => resolveFirebaseUrl(u))
        );
        setContractViewUrls(urls);
      } else {
        setContractViewUrls([]);
      }
    } catch (err) {
      console.error("❌ Load contract failed", err);
      setContractView(null);
      setContractViewUrls([]);
    }

  };



  // ===============================
  //  SETTLEMENT (TẤT TOÁN)
  // ===============================
  const handleSettleConfirm = async () => {
    if (!settleAuthor) return;

    const author = settleAuthor;

    const settlementAmount = calcRoyaltyAmount(
      author.totalRevenue,
      author.royalty
    );

    if (settlementAmount <= 0) {
      toast.error("Tác giả này chưa có doanh thu để tất toán");
      return;
    }

    try {
      toast.loading("Đang tất toán cho tác giả...");

      const wallet = await getWalletByUserId(author.userId);
      if (!wallet?.walletId) {
        toast.error("Không tìm thấy ví của tác giả");
        return;
      }

      // payment method
      const pmRes = await axios.get(`${API_RK}/payment-methods/search`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const paymentMethods = pmRes.data?.content ?? [];
      const rookiesMethod = paymentMethods.find(
        (m: any) => (m.methodName || "").toLowerCase() === "rookies"
      );

      if (!rookiesMethod) {
        toast.error("Không tìm thấy phương thức thanh toán 'Rookies'");
        return;
      }

      await TransactionService.create({
        totalPrice: settlementAmount,
        status: 3,
        paymentMethodId: rookiesMethod.paymentMethodId,
        walletId: wallet.walletId,
        transType: "SETTLEMENT",
        isActived: "ACTIVE",
      });

      await updateWallet(wallet.walletId, {
        balance: wallet.balance + settlementAmount,
      });

      const nowIso = new Date().toISOString();

      setAuthors((prev) =>
        prev.map((a) =>
          a.userId === author.userId
            ? {
              ...a,
              totalRevenue: 0,
              canSettle: false,
              lastSettlementAt: nowIso,
            }
            : a
        )
      );

      toast.success("Tất toán tiền cho tác giả thành công!");
      setSettleOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tất toán cho tác giả");
    } finally {
      toast.dismiss();
    }
  };

  const calcRoyaltyAmount = (total?: any, royalty?: any) => {
    const safeTotal = Number(total ?? 0);
    const safePercent = Number(royalty ?? 0);

    if (isNaN(safeTotal) || isNaN(safePercent)) return 0;

    return safeTotal * (safePercent / 100);
  };

  // ===============================
  //  RENDER UI
  // ===============================
  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      <AdminSidebar isOpen={sidebarOpen} />

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
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </header>

        {/* FILTERS */}
        <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex gap-4 items-center">
          <Input
            placeholder="Tìm kiếm tên / email tác giả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-white/20 text-white placeholder:text-gray-400 flex-1"
          />

          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="w-[220px] border-white/20 text-white bg-transparent">
              <SelectValue placeholder="Lọc theo doanh thu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tác giả</SelectItem>
              <SelectItem value="hasRevenue">Đã có doanh thu</SelectItem>
              <SelectItem value="noRevenue">Chưa có doanh thu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Đang tải dữ liệu...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                    <TableHead className="text-white">Tác giả</TableHead>
                    <TableHead className="text-white">Email</TableHead>
                    <TableHead className="text-white text-center">
                      Số sách
                    </TableHead>
                    <TableHead className="text-white text-center">
                      Số lượng đã bán
                    </TableHead>
                    <TableHead className="text-white text-center">
                      Doanh thu (tạm tính)
                    </TableHead>
                    <TableHead className="text-white text-right">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredAuthors.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-600 py-8"
                      >
                        Không có tác giả nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuthors.map((author) => (
                      <TableRow
                        key={author.userId}
                        className="hover:bg-gray-50 text-gray-800"
                      >
                        <TableCell>{author.fullName}</TableCell>
                        <TableCell>{author.email}</TableCell>

                        <TableCell className="text-center">
                          {author.totalBooks}
                        </TableCell>

                        <TableCell className="text-center">
                          {author.totalSold}
                        </TableCell>

                        <TableCell className="text-center">
                          {formatVND(
                            calcRoyaltyAmount(
                              author.totalRevenue,
                              author.royalty
                            )
                          )}
                        </TableCell>

                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailDialog(author)}
                          >
                            Chi tiết
                          </Button>
                          <Button
                            size="sm"
                            className="bg-purple-600 text-white"
                            disabled={
                              !author.canSettle || author.totalRevenue <= 0
                            }
                            onClick={() => {
                              setSettleAuthor(author);
                              setSettleOpen(true);
                            }}
                          >
                            Tất toán
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* ===============================
          DETAIL DIALOG
      =============================== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>
              Chi tiết tác giả{" "}
              {selectedAuthor ? `- ${selectedAuthor.fullName}` : ""}
            </DialogTitle>
          </DialogHeader>

          {selectedAuthor && (
            <div className="space-y-4">
              <p>
                <b>Email:</b> {selectedAuthor.email}
              </p>
              <p>
                <b>Tổng sách:</b> {selectedAuthor.totalBooks}
              </p>
              <p>
                <b>Tổng số lượng đã bán:</b> {selectedAuthor.totalSold}
              </p>

              <h4 className="font-semibold mt-4">Chi tiết từng đầu sách:</h4>
              <div className="max-h-80 overflow-auto border rounded-md">
                {(selectedAuthor.breakdown?.length ?? 0) === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Tác giả chưa có sách nào được bán.
                  </div>
                ) : (
                  selectedAuthor.breakdown.map((b) => (
                    <div
                      key={b.bookId}
                      className="flex justify-between items-center text-sm border-b last:border-b-0 px-3 py-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{b.bookName}</div>
                        <div className="text-xs text-gray-500">
                          ID: {b.bookId}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>{b.soldQty} quyển</div>
                        <div className="text-xs text-gray-500">
                          {formatVND(b.revenue)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p>
                <b>Doanh thu tạm tính:</b>{" "}
                {formatVND(selectedAuthor.totalRevenue)}
              </p>

              <p className="flex items-center gap-2">
                <b>Phần trăm hoa hồng:</b> {selectedAuthor.royalty ?? 0}%
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => openContractView(selectedAuthor.userId)}
                  title="Xem hợp đồng"
                >
                  {/* dùng icon lucide */}
                  <FileText className="w-4 h-4" />
                </Button>
              </p>

              <p>
                <b>Tiền tác quyền:</b>{" "}
                {formatVND(
                  calcRoyaltyAmount(
                    selectedAuthor.totalRevenue,
                    selectedAuthor.royalty
                  )
                )}
              </p>

              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={contractViewOpen} onOpenChange={setContractViewOpen}>
        <DialogContent className="max-w-2xl bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>Hợp đồng tác giả</DialogTitle>
          </DialogHeader>

          {!contractView ? (
            <div className="text-sm text-gray-500">
              Không tìm thấy hợp đồng.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm">
                <div>
                  <b>Mã HĐ:</b> {contractView.contractNumber || "—"}
                </div>
                <div>
                  <b>Tiêu đề:</b> {contractView.title || "—"}
                </div>
                <div>
                  <b>Trạng thái:</b> {contractView.status || "—"}
                </div>
              </div>

              {contractViewUrls.length > 0 ? (
                <div className="space-y-3">
                  {contractViewUrls.map((url, idx) => {
                    const isImage = url.match(/\.(png|jpg|jpeg|webp)$/i);
                    const isPdf = url.endsWith(".pdf");

                    return (
                      <div key={idx} className="border rounded-md p-2">
                        {isImage && (
                          <img
                            src={url}
                            alt={`contract-${idx}`}
                            className="w-full max-h-[70vh] object-contain bg-gray-50"
                          />
                        )}

                        {isPdf && (
                          <iframe
                            src={url}
                            className="w-full h-[70vh] border"
                            title={`pdf-${idx}`}
                          />
                        )}

                        <a
                          href={url}
                          target="_blank"
                          className="text-blue-600 underline text-sm mt-1 inline-block"
                        >
                          Mở file {idx + 1} trong tab mới
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Hợp đồng chưa có file hoặc không resolve được link.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={settleOpen} onOpenChange={setSettleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận tất toán</AlertDialogTitle>
            <AlertDialogDescription>
              {settleAuthor && (
                <>
                  Bạn có chắc muốn tất toán{" "}
                  <b className="text-purple-600">
                    {formatVND(
                      calcRoyaltyAmount(
                        settleAuthor.totalRevenue,
                        settleAuthor.royalty
                      )
                    )}
                  </b>{" "}
                  cho tác giả <b>{settleAuthor.fullName}</b>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleSettleConfirm}
            >
              Xác nhận tất toán
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

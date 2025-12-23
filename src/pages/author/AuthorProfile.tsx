import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Edit, Save, UploadCloud } from "lucide-react";

import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getWalletByUserId, type Wallet } from "@/services/WalletService";
import { getUserById, updateUser, type User } from "@/services/UserService";
import { UploadService } from "@/services/FirebaseService";
import { TransactionService } from "@/services/TransactionService";
import { getCurrentUserId } from "@/utils/authStorage";
import AuthorTermsOfUse from "@/components/dialog/AuthorTermsOfUse";

export default function AuthorProfile() {
  const { userId } = useParams<{ userId: string }>();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<Partial<User> | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [openTerms, setOpenTerms] = useState(false);

  const TX_PAGE_SIZE = 10;

  const [txPage, setTxPage] = useState(0);       // 0-based
  const [txTotalPages, setTxTotalPages] = useState(0);
  const [txTotalElements, setTxTotalElements] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // xác định userId: lấy từ params trước, fallback localStorage
        const uid = userId ?? getCurrentUserId();
        if (!uid) {
          if (mounted) setError("Không tìm thấy userId.");
          return;
        }

        const userRes = await getUserById(uid);
        if (!mounted) return;
        setUser(userRes);
        setEdited(userRes);

        // Lấy wallet theo userId bằng getWalletByUserId (trả về 1 wallet)
        try {
          const w = await getWalletByUserId(uid);
          if (!mounted) return;
          setWallets(w ? [w] : []);
        } catch (werr) {
          console.warn("Không lấy được wallets:", werr);
          if (!mounted) return;
          setWallets([]);
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
    const norm = String(g).toLowerCase();
    if (norm === "male" || norm === "m") return "Nam";
    if (norm === "female" || norm === "f") return "Nữ";
    // fallback: nếu backend dùng MALE/FEMALE khác, vẫn trả về nguyên g
    if (String(g).toUpperCase() === "MALE") return "Nam";
    if (String(g).toUpperCase() === "FEMALE") return "Nữ";
    return g;
  };

  // ----- Mapping transType (+/- và label tiếng Việt) -----
  const TRANS_TYPE_META: Record<
    string,
    { label: string; sign: "+" | "-" }
  > = {
    PAYMENT: { label: "Thanh toán đơn hàng", sign: "-" },
    AI_IMAGE: { label: "Thanh toán tạo ảnh AI", sign: "-" },
    AI_MODEL: { label: "Thanh toán tạo model 3D AI", sign: "-" },
    DEPOSIT: { label: "Nạp tiền vào ví", sign: "+" },
    WITHDRAW: { label: "Rút tiền khỏi ví", sign: "-" },
    SETTLEMENT: { label: "Phí tác quyền", sign: "+" },
    RETURN: { label: "Hoàn tiền đơn hàng", sign: "+" },
    REFUND: { label: "Hoàn tiền đơn hàng", sign: "+" }, // phòng khi BE dùng REFUND
  };

  const formatTransType = (t?: string) => {
    if (!t) return "-";
    const meta = TRANS_TYPE_META[t];
    if (!meta) return t;
    return meta.label; // không in dấu +/- nữa
  };

  const getTransSign = (t?: string): "" | "+" | "-" => {
    if (!t) return "";
    const meta = TRANS_TYPE_META[t];
    return meta?.sign ?? "";
  };

  // ----- Mapping status number -> label -----
  const STATUS_LABEL: Record<number, string> = {
    0: "Chưa thanh toán",
    1: "Đang xử lý",
    2: "Đã hủy",
    3: "Đã thanh toán", // bạn bảo số 3 là đã trả
  };

  const formatStatus = (s?: number | string) => {
    if (s === undefined || s === null) return "-";
    const num = typeof s === "string" ? Number(s) : s;
    const label = STATUS_LABEL[num];
    return label ?? String(s);
  };

  // actions for editing
  const startEdit = () => {
    setEdited(user ?? null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEdited(user ?? null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const onChangeField = (key: keyof User, value: any) => {
    setEdited((prev) => ({ ...(prev ?? {}), [key]: value }));
  };

  const onSelectAvatar = (f?: File) => {
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    const uid = userId ?? getCurrentUserId();
    if (!uid || !edited) return;
    setLoading(true);
    try {
      // 1) upload avatar if changed
      if (avatarFile) {
        const gsUrl = await UploadService.uploadImageToFirebase(
          avatarFile,
          "avatar"
        );
        edited.avatarUrl = gsUrl;
      }

      // 2) call updateUser
      await updateUser(uid, edited);
      // 3) refetch user and wallets
      const refreshed = await getUserById(uid);
      setUser(refreshed);
      setEdited(refreshed);

      // 🔄 refresh wallets bằng searchWallets
      try {
        const w = await getWalletByUserId(uid);
        setWallets(w ? [w] : []);
      } catch (werr) {
        console.warn("Không lấy được wallets sau khi lưu:", werr);
      }

      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      console.error("Lưu thất bại:", err);
      setError("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedWalletId) return;
    setTxPage(0);
    fetchTransactions(selectedWalletId, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWalletId]);


  const fetchTransactions = async (wid: string, page = 0) => {
    setTxLoading(true);
    setTxError(null);
    try {
      const res: any = await TransactionService.searchTransactions({
        walletId: wid,
        page,
        size: TX_PAGE_SIZE, // ✅ 10 / page
        sort: ["createdAt,desc"], // nếu BE hỗ trợ
      });

      // Spring pageable thường có: content, totalPages, totalElements, number
      const items = res?.content ?? [];
      setTransactions(items);

      setTxTotalPages(res?.totalPages ?? 0);
      setTxTotalElements(res?.totalElements ?? items.length);
      setTxPage(res?.number ?? page);
    } catch (err) {
      console.error("Lỗi khi lấy lịch sử giao dịch:", err);
      setTxError("Không tải được lịch sử giao dịch");
      setTransactions([]);
      setTxTotalPages(0);
      setTxTotalElements(0);
    } finally {
      setTxLoading(false);
    }
  };


  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white hover:bg-white/10"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="w-6 h-6" />
                ) : (
                  <ChevronRight className="w-6 h-6" />
                )}
              </Button>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">
                  Hồ sơ tác giả
                </h1>
              </div>
            </div>
            <div />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-white">Đang tải...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Author Info (editable) */}
              <Card className="col-span-1 bg-[#1f2937] border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin Author</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-28 h-28 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                        <img
                          src={
                            avatarPreview ??
                            (user?.avatarUrl &&
                              String(user.avatarUrl).startsWith("gs://")
                              ? (() => {
                                const parts = String(
                                  user.avatarUrl
                                ).split("/");
                                const bucket = parts[2];
                                const path = parts.slice(3).join("/");
                                return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
                                  path
                                )}?alt=media`;
                              })()
                              : user?.avatarUrl ?? "")
                          }
                          alt="avatar"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23667eea'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='white'%3ENo Avatar%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="text-white/70 text-sm">Avatar</div>
                        <div className="mt-2 flex gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onSelectAvatar(f);
                            }}
                          />
                          <Button
                            onClick={handleFilePick}
                            size="sm"
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                          >
                            <UploadCloud className="w-4 h-4" /> Chọn ảnh
                          </Button>
                          {avatarFile && (
                            <div className="text-sm text-gray-300 self-center">
                              {avatarFile.name}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-white/60 mt-2">
                          Nhấp "Chỉnh sửa" → chọn ảnh → "Lưu" để upload
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <label className="text-white/70 text-xs">Họ & tên</label>
                      {isEditing ? (
                        <Input
                          value={edited?.fullName ?? ""}
                          onChange={(e) =>
                            onChangeField("fullName", e.target.value)
                          }
                        />
                      ) : (
                        <div className="text-white">
                          {user?.fullName ?? "-"}
                        </div>
                      )}

                      <label className="text-white/70 text-xs">Email</label>
                      {isEditing ? (
                        <Input
                          value={edited?.email ?? ""}
                          onChange={(e) =>
                            onChangeField("email", e.target.value)
                          }
                        />
                      ) : (
                        <div className="text-white break-all">
                          {user?.email ?? "-"}
                        </div>
                      )}

                      <label className="text-white/70 text-xs">
                        Số điện thoại
                      </label>
                      {isEditing ? (
                        <Input
                          value={edited?.phoneNumber ?? ""}
                          onChange={(e) =>
                            onChangeField("phoneNumber", e.target.value)
                          }
                        />
                      ) : (
                        <div className="text-white">
                          {user?.phoneNumber ?? "-"}
                        </div>
                      )}

                      <label className="text-white/70 text-xs">
                        Ngày sinh
                      </label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={
                            edited?.birthDate
                              ? new Date(edited.birthDate)
                                .toISOString()
                                .slice(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            onChangeField("birthDate", e.target.value)
                          }
                        />
                      ) : (
                        <div className="text-white">
                          {formatDate(user?.birthDate)}
                        </div>
                      )}

                      <label className="text-white/70 text-xs">Giới tính</label>
                      {isEditing ? (
                        <Select
                          value={edited?.gender ?? ""}
                          onValueChange={(v) => onChangeField("gender", v)}
                        >
                          <SelectTrigger className="w-full bg-transparent text-white border border-white/20">
                            <SelectValue placeholder="-- Chọn giới tính --" />
                          </SelectTrigger>

                          <SelectContent className="bg-[#111827] text-white border border-white/10">
                            <SelectItem value="male">Nam</SelectItem>
                            <SelectItem value="female">Nữ</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-white">{renderGender(user?.gender)}</div>
                      )}

                      <label className="text-white/70 text-xs">
                        Phí tác quyền (%)
                      </label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          placeholder="Phần trăm (ví dụ: 30)"
                          value={
                            edited?.royalty !== undefined &&
                              edited?.royalty !== null
                              ? String(edited.royalty)
                              : ""
                          }
                          disabled
                          onChange={(e) =>
                            onChangeField(
                              "royalty",
                              Number(e.target.value || 0)
                            )
                          }
                          className="bg-transparent border-white/20 text-white"
                        />
                      ) : (
                        <div className="text-white">
                          {(edited?.royalty ?? user?.royalty ?? 0) + "%"}
                        </div>
                      )}
                    </div>

                    {/* Actions: Điều khoản / Chỉnh sửa (canh phải) */}
                    <div className="mt-4 flex justify-end">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setOpenTerms(true)}
                          className="flex items-center gap-2 bg-gray-100/10 hover:bg-gray-100/20 text-white"
                        >
                          Điều khoản sử dụng
                        </Button>

                        {!isEditing ? (
                          <Button
                            onClick={startEdit}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                          >
                            <Edit className="w-4 h-4" /> Chỉnh sửa
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={handleSave}
                              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                            >
                              <Save className="w-4 h-4" /> Lưu
                            </Button>
                            <Button variant="ghost" onClick={cancelEdit}>
                              Huỷ
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet / Transactions table */}
              <Card className="col-span-2 bg-[#111827] border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Thông tin ví</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {/* ❌ Bỏ cột WalletId, chỉ để thông tin ví */}
                          <TableHead className="text-white">Số dư</TableHead>
                          <TableHead className="text-white">Coin</TableHead>
                          <TableHead className="text-white">
                            Trạng thái
                          </TableHead>
                          <TableHead className="text-white">Ngày tạo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wallets.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-white/60"
                            >
                              Không có giao dịch / wallet cho user này
                            </TableCell>
                          </TableRow>
                        ) : (
                          wallets.map((w) => (
                            <TableRow key={w.walletId}>
                              <TableCell className="text-white">
                                {formatCurrency(w.balance)}
                              </TableCell>
                              <TableCell className="text-white">
                                {Number(w.coin ?? 0).toLocaleString("vi-VN")}
                              </TableCell>
                              <TableCell className="text-white">
                                {w.isActived}
                              </TableCell>
                              <TableCell className="text-white">
                                {formatDate(w.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* --- Lịch sử giao dịch (searchWallets by walletId) --- */}
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-white/70">Chọn wallet:</div>
                        <select
                          className="bg-transparent text-white border border-white/10 p-1 rounded"
                          value={selectedWalletId ?? ""}
                          onChange={(e) =>
                            setSelectedWalletId(e.target.value || null)
                          }
                        >
                          <option value="">-- Chọn wallet --</option>
                          {wallets.map((w) => (
                            <option key={w.walletId} value={w.walletId}>
                              {/* Hiện đầy đủ thông tin ví trong option, không show ID */}
                              {formatCurrency(w.balance)} - {w.coin} coin -{" "}
                              {formatDate(w.createdAt)}
                            </option>
                          ))}
                        </select>
                        <button
                          className="ml-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white"
                          onClick={() => {
                            if (selectedWalletId) fetchTransactions(selectedWalletId, txPage);
                          }}
                        >
                          Tải
                        </button>
                      </div>
                      <div className="text-sm text-white/60">
                        Hiển thị lịch sử theo walletId
                      </div>
                    </div>

                    {txLoading ? (
                      <div className="text-white">Đang tải lịch sử...</div>
                    ) : txError ? (
                      <div className="text-red-400">{txError}</div>
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-white">
                                Loại giao dịch
                              </TableHead>
                              <TableHead className="text-white">
                                Số tiền
                              </TableHead>
                              <TableHead className="text-white">
                                Trạng thái
                              </TableHead>
                              <TableHead className="text-white">
                                Thời gian
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center text-white/60"
                                >
                                  Không có giao dịch
                                </TableCell>
                              </TableRow>
                            ) : (
                              transactions.map((tx: any, idx: number) => {
                                // normalize common fields from backend response sample
                                const id =
                                  tx.transactionId ??
                                  tx.id ??
                                  tx.transaction_id ??
                                  `tx-${idx}`;
                                // đảm bảo lấy đúng trường totalPrice từ BE
                                const amount =
                                  tx.totalPrice ??
                                  tx.amount ??
                                  tx.balanceChange ??
                                  tx.delta ??
                                  0;
                                const time =
                                  tx.createdAt ??
                                  tx.createdDate ??
                                  tx.date ??
                                  tx.updatedAt;

                                return (
                                  <TableRow key={id}>
                                    {/* Loại giao dịch + (+/-) */}
                                    <TableCell className="text-white">
                                      {formatTransType(
                                        tx.transType ??
                                        tx.type ??
                                        tx.tranType ??
                                        tx.transactionType
                                      )}
                                    </TableCell>

                                    {/* Số tiền, tô màu theo dấu */}
                                    {(() => {
                                      const rawType =
                                        tx.transType ??
                                        tx.type ??
                                        tx.tranType ??
                                        tx.transactionType;
                                      let sign = getTransSign(rawType);
                                      const amountNumber = Number(amount || 0);

                                      // nếu backend không cung cấp kiểu nhưng amount âm, suy ngược sign từ amount
                                      if (!sign) {
                                        if (amountNumber < 0) sign = "-";
                                        else if (amountNumber > 0) sign = "+";
                                      }

                                      const colorClass =
                                        sign === "+" ? "text-emerald-400" : sign === "-" ? "text-red-400" : "";

                                      return (
                                        <TableCell className={`text-white ${colorClass}`}>
                                          {formatCurrency(Math.abs(amountNumber))}
                                        </TableCell>
                                      );
                                    })()}

                                    {/* Trạng thái */}
                                    <TableCell className="text-white">
                                      {formatStatus(tx.status)}
                                    </TableCell>

                                    {/* Thời gian */}
                                    <TableCell className="text-white">
                                      {formatDate(time)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>

                        {txTotalPages > 1 && (
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-sm text-white/60">
                              Trang {txPage + 1} / {txTotalPages} • Tổng {txTotalElements} giao dịch
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={txPage === 0 || txLoading}
                                onClick={() => selectedWalletId && fetchTransactions(selectedWalletId, txPage - 1)}
                                className="border-white/20 text-white bg-transparent hover:bg-white/10 disabled:opacity-40"
                              >
                                Trước
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={txPage + 1 >= txTotalPages || txLoading}
                                onClick={() => selectedWalletId && fetchTransactions(selectedWalletId, txPage + 1)}
                                className="border-white/20 text-white bg-transparent hover:bg-white/10 disabled:opacity-40"
                              >
                                Sau
                              </Button>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                  {/* --- end lịch sử giao dịch --- */}
                </CardContent>
              </Card>

              <AuthorTermsOfUse
                isOpen={openTerms}
                onClose={() => setOpenTerms(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
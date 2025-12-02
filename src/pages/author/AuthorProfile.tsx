import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Menu, X, Edit, Save, UploadCloud } from "lucide-react";

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
import { getAllWallets, type Wallet } from "@/services/WalletService";
import { getUserById, updateUser, type User } from "@/services/UserService";
import { UploadService } from "@/services/FirebaseService";

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

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const userRes = await getUserById(userId);
        if (!mounted) return;
        setUser(userRes);
        setEdited(userRes);

        // fetch wallets (all) then filter by userId to show user's wallet entries / transactions
        try {
          const all = await getAllWallets();
          if (!mounted) return;
          const my = Array.isArray(all) ? all.filter((w) => String(w.userId) === String(userId)) : [];
          setWallets(my);
        } catch (werr) {
          console.warn("Không lấy được wallets:", werr);
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
    if (g === "MALE") return "Nam";
    if (g === "FEMALE") return "Nữ";
    return g;
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
    if (!userId || !edited) return;
    setLoading(true);
    try {
      // 1) upload avatar if changed
      if (avatarFile) {
        const gsUrl = await UploadService.uploadImageToFirebase(avatarFile, "avatar");
        edited.avatarUrl = gsUrl;
      }

      // 2) call updateUser
      await updateUser(userId, edited);
      // 3) refetch user and wallets
      const refreshed = await getUserById(userId);
      setUser(refreshed);
      setEdited(refreshed);
      // refresh wallets
      try {
        const all = await getAllWallets();
        const my = Array.isArray(all) ? all.filter((w) => String(w.userId) === String(userId)) : [];
        setWallets(my);
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
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">Hồ sơ tác giả</h1>
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
                            (user?.avatarUrl && String(user.avatarUrl).startsWith("gs://")
                              ? (() => {
                                const parts = String(user.avatarUrl).split("/");
                                const bucket = parts[2];
                                const path = parts.slice(3).join("/");
                                return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
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
                          <Button onClick={handleFilePick} size="sm" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                            <UploadCloud className="w-4 h-4" /> Chọn ảnh
                          </Button>
                          {avatarFile && <div className="text-sm text-gray-300 self-center">{avatarFile.name}</div>}
                        </div>
                        <div className="text-xs text-white/60 mt-2">Nhấp "Chỉnh sửa" → chọn ảnh → "Lưu" để upload</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <label className="text-white/70 text-xs">Họ & tên</label>
                      {isEditing ? (
                        <Input value={edited?.fullName ?? ""} onChange={(e) => onChangeField("fullName", e.target.value)} />
                      ) : (
                        <div className="text-white">{user?.fullName ?? "-"}</div>
                      )}

                      <label className="text-white/70 text-xs">Email</label>
                      {isEditing ? (
                        <Input value={edited?.email ?? ""} onChange={(e) => onChangeField("email", e.target.value)} />
                      ) : (
                        <div className="text-white break-all">{user?.email ?? "-"}</div>
                      )}

                      <label className="text-white/70 text-xs">Số điện thoại</label>
                      {isEditing ? (
                        <Input value={edited?.phoneNumber ?? ""} onChange={(e) => onChangeField("phoneNumber", e.target.value)} />
                      ) : (
                        <div className="text-white">{user?.phoneNumber ?? "-"}</div>
                      )}

                      <label className="text-white/70 text-xs">Ngày sinh</label>
                      {isEditing ? (
                        <Input type="date" value={edited?.birthDate ? new Date(edited.birthDate).toISOString().slice(0, 10) : ""} onChange={(e) => onChangeField("birthDate", e.target.value)} />
                      ) : (
                        <div className="text-white">{formatDate(user?.birthDate)}</div>
                      )}

                      <label className="text-white/70 text-xs">Giới tính</label>
                      {isEditing ? (
                        <Input value={edited?.gender ?? ""} onChange={(e) => onChangeField("gender", e.target.value)} />
                      ) : (
                        <div className="text-white">{renderGender(user?.gender)}</div>
                      )}

                      <label className="text-white/70 text-xs">Royalty (%)</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          placeholder="Phần trăm (ví dụ: 30)"
                          value={edited?.royalty !== undefined && edited?.royalty !== null ? String(edited.royalty) : ""}
                          onChange={(e) => onChangeField("royalty", Number(e.target.value || 0))}
                          className="bg-transparent border-white/20 text-white"
                        />
                      ) : (
                        <div className="text-white">{(user?.royalty ?? 0) + "%"}</div>
                      )}

                      <label className="text-white/70 text-xs">Cập nhật lần cuối</label>
                      <div className="text-white">{formatDate((user as any)?.updatedAt)}</div>
                    </div>

                    {/* Edit / Save / Cancel moved into the author info card */}
                    <div className="mt-4 flex gap-2">
                      {!isEditing ? (
                        <Button onClick={startEdit} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                          <Edit className="w-4 h-4" /> Chỉnh sửa
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleSave} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                            <Save className="w-4 h-4" /> Lưu
                          </Button>
                          <Button variant="ghost" onClick={cancelEdit}>Huỷ</Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet / Transactions table */}
              <Card className="col-span-2 bg-[#111827] border border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-lg">Lịch sử Wallet / Giao dịch</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-white">WalletId</TableHead>
                          <TableHead className="text-white">Số dư</TableHead>
                          <TableHead className="text-white">Coin</TableHead>
                          <TableHead className="text-white">Trạng thái</TableHead>
                          <TableHead className="text-white">Ngày tạo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wallets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-white/60">
                              Không có giao dịch / wallet cho user này
                            </TableCell>
                          </TableRow>
                        ) : (
                          wallets.map((w) => (
                            <TableRow key={w.walletId}>
                              <TableCell className="text-white">{w.walletId}</TableCell>
                              <TableCell className="text-white">{formatCurrency(w.balance)}</TableCell>
                              <TableCell className="text-white">{w.coin}</TableCell>
                              <TableCell className="text-white">{w.isActived}</TableCell>
                              <TableCell className="text-white">{formatDate(w.createdAt)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
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

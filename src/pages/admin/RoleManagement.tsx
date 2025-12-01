import { useEffect, useState } from "react";
import { Menu, X, Search, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
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
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

import {
    getAllRoles,
    createRole,
    updateRoleById,
    deleteRoleById,
    type Role,
} from "@/services/RoleService";


import { toast } from "sonner";


export default function RoleManagementPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    // Modal state
    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const [roleName, setRoleName] = useState("");
    const [roleStatus, setRoleStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
    const [saving, setSaving] = useState(false);

    // Fetch roles
    const loadRoles = async () => {
        setLoading(true);
        try {
            const res = await getAllRoles();
            setRoles(res);
        } catch (err) {
            toast.error("Không thể tải danh sách role");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    // Filter
    const filteredRoles = roles.filter((r) => {
        const matchSearch = r.roleName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchStatus =
            filterStatus === "all" || r.isActived === filterStatus;

        return matchSearch && matchStatus;
    });

    // Open ADD modal
    const handleAddRole = () => {
        setModalMode("add");
        setSelectedRole(null);
        setRoleName("");
        setRoleStatus("ACTIVE");
        setOpenModal(true);
    };

    // Open EDIT modal
    const handleEditRole = (role: Role) => {
        setModalMode("edit");
        setSelectedRole(role);
        setRoleName(role.roleName);
        setRoleStatus(role.isActived as "ACTIVE" | "INACTIVE");
        setOpenModal(true);
    };

    // Save role
    const handleSaveRole = async () => {
        if (!roleName.trim()) {
            toast.error("Tên role không được để trống");
            return;
        }

        try {
            setSaving(true);

            if (modalMode === "add") {
                await createRole([
                    {
                        roleName,
                        isActived: roleStatus,
                    }
                ]);

                toast.success("Tạo role thành công");
            } else if (modalMode === "edit" && selectedRole) {
                await updateRoleById(selectedRole.roleId, {
                    roleName,
                    isActived: roleStatus,
                });
                toast.success("Cập nhật role thành công");
            }


            setOpenModal(false);
            loadRoles();
        } catch (err) {
            toast.error("Không thể lưu role");
        } finally {
            setSaving(false);
        }
    };

    // Delete
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa role này?")) return;

        try {
            await deleteRoleById(id);
            toast.success("Xóa role thành công");
            loadRoles();
        } catch {
            toast.error("Không thể xóa role");
        }
    };

    return (
        <div className="flex h-screen bg-[#1a1a2e] text-white">
            <AdminSidebar isOpen={sidebarOpen} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
                    <div className="flex items-center px-6 py-4">
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

                {/* Filters */}
                <div className="bg-[#1a2332] px-6 py-4 border-b border-white/10 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Tìm role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-transparent border-white/20 text-white"
                        />
                    </div>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[160px] border-white/20 text-white bg-transparent">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                            <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={handleAddRole}
                    >
                        <Plus className="w-4 h-4 mr-1" /> Thêm Role
                    </Button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center items-center py-16 text-gray-500">
                                <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang tải...
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#1a2332] hover:bg-[#1a2332]">
                                        <TableHead className="text-white font-medium">Role</TableHead>
                                        <TableHead className="text-white font-medium">Trạng thái</TableHead>
                                        <TableHead className="text-white font-medium">Ngày tạo</TableHead>
                                        <TableHead className="text-white font-medium text-right">
                                            Hành động
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredRoles.map((r) => (
                                        <TableRow key={r.roleId}>
                                            <TableCell className="text-gray-900 font-medium">
                                                {r.roleName}
                                            </TableCell>

                                            <TableCell>
                                                <span
                                                    className={
                                                        r.isActived === "ACTIVE"
                                                            ? "text-green-600 font-semibold"
                                                            : "text-gray-500 font-semibold"
                                                    }
                                                >
                                                    {r.isActived}
                                                </span>
                                            </TableCell>

                                            <TableCell className="text-gray-600">
                                                {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                                            </TableCell>

                                            <TableCell className="flex justify-end gap-2">
                                                <Button
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                    onClick={() => handleEditRole(r)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDelete(r.roleId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {openModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-[420px] p-6 relative">

                        {/* Nút X */}
                        <button
                            className="absolute right-4 top-4 text-gray-600 hover:text-black"
                            onClick={() => setOpenModal(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-semibold mb-4 text-gray-800">
                            {modalMode === "add" ? "Thêm Role" : "Cập nhật Role"}
                        </h2>


                        {/* Input */}
                        <div className="mb-4">
                            <label className="text-gray-600 text-sm">Role Name</label>
                            <Input
                                value={roleName}
                                onChange={(e) => setRoleName(e.target.value)}
                                className="text-black mt-1"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="text-gray-600 text-sm">Trạng thái</label>

                            <Select
                                value={roleStatus}
                                onValueChange={(v) => setRoleStatus(v as any)}
                            >
                                <SelectTrigger className="w-full mt-1 text-black">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setOpenModal(false)}
                                disabled={saving}
                            >
                                Hủy
                            </Button>

                            <Button
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={handleSaveRole}
                                disabled={saving}
                            >
                                {saving ? "Đang lưu..." : "Lưu"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

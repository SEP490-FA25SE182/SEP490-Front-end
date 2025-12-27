import { useEffect, useState } from "react";
import { Menu, X, Search, Trash2, Eye, Loader2 } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveFirebaseUrl } from "@/firebase";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";


import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

import { BlogService, type BlogPost } from "@/services/BlogService";
import { TagService, type Tag as TagType } from "@/services/BlogService";
import { getUserById } from "@/services/UserService";
import { toast } from "sonner";


export default function BlogManagementPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [tags, setTags] = useState<TagType[]>([]);
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterTag, setFilterTag] = useState("all");

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);


    const loadData = async () => {
        try {
            setLoading(true);

            const blogsData = (await BlogService.getAll()).filter(
                (b) => b.isActived === "ACTIVE"
            );
            const tagData = await TagService.getAll();

            //  Gán authorName cho mỗi blog
            const blogsWithAuthor = await Promise.all(
                blogsData.map(async (b) => {
                    const user = await getUserById(b.authorId);
                    return {
                        ...b,
                        authorName: user.fullName,
                    };
                })
            );

            //  SORT PHẢI ĐỂ SAU Promise.all()
            blogsWithAuthor.sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            setBlogs(blogsWithAuthor);
            setTags(tagData);
        } catch (err) {
            toast.error("Không thể tải Blogs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);



    const filteredBlogs = blogs.filter((blog) => {
        const matchesSearch = blog.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        const matchesTag =
            filterTag === "all" ||
            blog.tagIds?.includes(filterTag);

        return matchesSearch && matchesTag;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa bài viết này?")) return;

        try {
            await BlogService.remove(id);
            toast.success("Đã xóa");
            loadData();
        } catch {
            toast.error("Không thể xóa");
        }
    };

    const handleViewBlog = async (blog: BlogPost) => {
        try {
            const updated = { ...blog };

            if (updated.coverUrl?.startsWith("gs://")) {
                updated.coverUrl = await resolveFirebaseUrl(updated.coverUrl);
            }

            const userRes = await getUserById(blog.authorId);
            updated.authorName = userRes.fullName;

            setSelectedBlog(updated);
            setOpenDialog(true);
        } catch {
            toast.error("Không thể tải nội dung");
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

                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Tìm blog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-transparent border-white/20 text-white"
                        />
                    </div>

                    {/* Select Tag Filter - ShadCN UI */}
                    <Select value={filterTag} onValueChange={setFilterTag}>
                        <SelectTrigger className="w-[180px] border-white/20 text-white bg-transparent">
                            <SelectValue placeholder="Lọc theo Tag" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="all">Tất cả tags</SelectItem>
                            {tags.map((t) => (
                                <SelectItem key={t.tagId} value={t.tagId}>
                                    #{t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                                        <TableHead className="text-white font-medium">Tiêu đề</TableHead>
                                        <TableHead className="text-white font-medium">Tác giả</TableHead>
                                        <TableHead className="text-white font-medium">Tags</TableHead>
                                        <TableHead className="text-white font-medium">Ngày tạo</TableHead>
                                        <TableHead className="text-white font-medium text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredBlogs.map((blog) => (
                                        <TableRow key={blog.blogId}>
                                            <TableCell className="text-gray-900 font-medium">
                                                {blog.title}
                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                {blog.authorName}
                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                {blog.tagNames?.map((name, i) => (
                                                    <span key={i} className="text-purple-600 mr-2">#{name}</span>
                                                ))}
                                            </TableCell>

                                            <TableCell className="text-gray-700">
                                                {new Date(blog.updatedAt).toLocaleDateString("vi-VN")}
                                            </TableCell>


                                            <TableCell className="flex justify-end gap-2 text-gray-900">
                                                <Button
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => handleViewBlog(blog)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDelete(blog.blogId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                        )}

                        {openDialog && selectedBlog && (
                            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-bold">
                                            {selectedBlog.title}
                                        </DialogTitle>
                                    </DialogHeader>

                                    {/* Cover image */}
                                    {selectedBlog.coverUrl && (
                                        <img
                                            src={selectedBlog.coverUrl}
                                            alt="cover"
                                            className="w-full max-h-[400px] object-contain rounded-lg mb-4 bg-black"
                                        />
                                    )}

                                    {/* Author + Date */}
                                    <p className="text-gray-600 text-sm mb-4">
                                        Đăng bởi <strong>{selectedBlog.authorName}</strong> •{" "}
                                        {new Date(selectedBlog.updatedAt).toLocaleDateString("vi-VN")}
                                    </p>

                                    {/* Nội dung Blog */}
                                    <div
                                        className="prose max-w-none text-gray-800"
                                        dangerouslySetInnerHTML={{ __html: selectedBlog.content }}
                                    />

                                    {/* Close Button */}
                                    <div className="flex justify-end mt-6">
                                        <Button onClick={() => setOpenDialog(false)}>Đóng</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

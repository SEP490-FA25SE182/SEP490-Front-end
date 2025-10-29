import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useCreatePage } from "@/services/BookManageService";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

export default function TextPageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chapterId } = useParams<{ chapterId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const createPage = useCreatePage();

  const [pageNumber, setPageNumber] = useState<number>(1);
  const [content, setContent] = useState<string>("");

  const handleSubmit = async () => {
    try {
      await createPage.mutateAsync({
        pageNumber,
        content,
        chapterId: chapterId || "",
        isActived: "ACTIVE",
      });
      toast({ title: "Tạo trang thành công", description: "Trang mới đã được thêm vào chương." });
      navigate(`/author/chapters/${chapterId}/pages`);
    } catch {
      toast({
        title: "Tạo thất bại",
        description: "Không thể tạo trang, vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white hover:bg-white/10"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
              <div className="ml-4 text-white">
                <div className="text-sm font-medium">Tạo trang chữ mới</div>              
              </div>
            </div>
          </div>
        </header>

        {/* Form section */}
        <div className="flex-1 overflow-auto p-8 bg-[#1a2332]">
          <div className="mx-auto bg-white rounded-xl shadow-xl p-8">
            <h1 className="text-2xl font-semibold mb-6 text-gray-900">
              Nhập thông tin trang chữ
            </h1>

            <div className="mb-5">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Số trang
              </label>
              <Input
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(Number(e.target.value))}
                className="bg-gray-100 text-black border-gray-300"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Nội dung
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  placeholder="Nhập nội dung trang..."
                  className="bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={createPage.isPending}
              >
                {createPage.isPending ? "Đang tạo..." : "Tạo trang"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

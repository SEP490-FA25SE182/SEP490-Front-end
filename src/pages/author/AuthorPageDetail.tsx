import { useParams, useNavigate } from "react-router-dom";
import { useGetPageById } from "@/services/BookManageService";
import { useState } from "react";
import { Menu, X, ArrowLeft } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const AuthorPageDetail = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: page, isLoading, isError } = useGetPageById(pageId);

  const isFirebaseImageUrl = (url: string) => {
    return (
      (url?.includes("firebasestorage.googleapis.com") && url?.includes("alt=media")) ||
      url?.startsWith("gs://")
    );
  };

  const getDisplayImageUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("gs://")) {
      const bucket = url.split("/")[2];
      const path = url.split("/").slice(3).join("/");
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
    }
    return url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
        Đang tải...
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a] text-red-400">
        Không thể tải trang này.
      </div>
    );
  }

  const isImage = isFirebaseImageUrl(page.content);
  const displayUrl = isImage ? getDisplayImageUrl(page.content) : "";

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

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
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>

            <div className="ml-4 text-white text-lg font-medium">
              Chi tiết trang {page.pageNumber}
            </div>

            <div className="ml-auto flex items-center gap-3">
              {/* Nút quay lại */}
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="bg-white hover:bg-gray-200 text-gray-800 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </Button>

              {page.content?.trim() ===
                "Xin chào, đây là trang trống. Vui lòng thêm nội dung sau." && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                        + Tạo nội dung trang
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/author/pages/${pageId}/edit-text`)}
                      >
                        Tạo nội dung chữ
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/author/pages/${pageId}/create-image`)}
                      >
                        Tạo nội dung ảnh
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 bg-[#0f172a] flex flex-col items-center">
          <div className="bg-white/5 border border-white/10 rounded-lg shadow-md p-6 max-w-3xl w-full">
            <h2 className="text-white text-xl font-semibold mb-4 text-center">
              Trang {page.pageNumber}
            </h2>

            {isImage ? (
              <div className="flex justify-center">
                <img
                  src={displayUrl}
                  alt={`Trang ${page.pageNumber}`}
                  className="rounded-lg shadow-lg max-h-[80vh] object-contain border border-white/20"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML =
                      '<p class="text-gray-400 text-sm text-center">Không thể tải ảnh.</p>';
                  }}
                />
              </div>
            ) : (
              <div
                className="prose prose-invert max-w-none text-gray-200 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html:
                    page.content
                      ?.replace(/\n/g, "<br>")
                      ?.replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>")
                      ?.replace(/<i>(.*?)<\/i>/g, "<em>$1</em>")
                      ?.replace(/<u>(.*?)<\/u>/g, "<u>$1</u>")
                      ?.replace(/<p>/g, "<p class='mb-3'>") || "",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorPageDetail;

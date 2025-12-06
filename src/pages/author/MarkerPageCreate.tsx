import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { useGetPageById } from "@/services/BookManageService";
import {
  useGetAllMarkers,
  useAttachMarkerToPage,
} from "@/services/ARService"; // ⚠️ sửa lại path nếu file service tên khác

// helper convert gs:// -> https preview
function gsToHttp(url: string) {
  if (!url) return "";
  if (!url.startsWith("gs://")) return url;
  const withoutGs = url.replace("gs://", "");
  const parts = withoutGs.split("/");
  const bucket = parts.shift();
  const path = parts.join("/");
  if (!bucket || !path) return url;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

export default function MarkerPageCreate() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { pageId } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // thông tin trang
  const { data: pageData, isPending: pageLoading } = useGetPageById(pageId || "");

  // lấy tất cả marker
  const { data: markers = [], isPending: markersLoading } = useGetAllMarkers();

  // attach marker - page
  const attachMarkerMutation = useAttachMarkerToPage();

  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("");

  // lấy pageNumber để hiển thị
  const [pageNumber, setPageNumber] = useState<number>(1);
  useEffect(() => {
    if (pageData?.pageNumber) {
      setPageNumber(pageData.pageNumber);
    }
  }, [pageData]);

  // lọc marker đang ACTIVE + có imageUrl
  const markerList = useMemo(() => {
    if (!Array.isArray(markers)) return [];
    return markers
      .filter((m: any) => m.isActived === "ACTIVE")
      .map((m: any) => ({
        id: m.markerId as string,
        code: m.markerCode,
        type: m.markerType,
        imageUrl: m.imageUrl,
      }));
  }, [markers]);

  const handleSelectMarker = (id: string) => {
    setSelectedMarkerId(id);
  };

  const handleSubmit = async () => {
    if (!pageId) {
      toast({
        title: "Thiếu thông tin",
        description: "Không tìm thấy pageId.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedMarkerId) {
      toast({
        title: "Chưa chọn marker",
        description: "Vui lòng chọn một marker để gắn vào trang.",
        variant: "destructive",
      });
      return;
    }

    try {
      await attachMarkerMutation.mutateAsync({
        markerId: selectedMarkerId,
        pageId,
      });

      toast({
        title: "Lưu thành công",
        description: "Project AR (marker) đã được gắn vào trang.",
      });

      navigate(-1);
    } catch (err: any) {
      console.error("Error attaching marker to page:", err);
      toast({
        title: "Lỗi khi lưu",
        description:
          err?.response?.data?.message || "Không thể lưu project AR vào trang.",
        variant: "destructive",
      });
    }
  };

  if (pageLoading || markersLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] border-b border-white/10 shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
            </Button>
            <h2 className="text-white text-lg font-medium">
              Gắn project AR (marker) cho trang {pageNumber}
            </h2>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-auto p-8 bg-[#1a2332]">
          <div className="mx-auto bg-white rounded-xl shadow-xl p-6 max-w-5xl">
            {/* Info page */}
            <div className="mb-4 text-sm text-gray-700">
              <div>
                <span className="font-semibold">Page ID:</span> {pageId}
              </div>
              <div>
                <span className="font-semibold">Số trang:</span> {pageNumber}
              </div>
            </div>

            {/* Marker selector */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Chọn marker để gắn vào trang
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {markerList.length === 0 && (
                  <div className="text-sm text-gray-500 col-span-full">
                    Không có marker nào.
                  </div>
                )}

                {markerList.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMarker(m.id)}
                    className={`rounded border p-1 overflow-hidden focus:outline-none ${
                      selectedMarkerId === m.id
                        ? "border-purple-500 ring-2 ring-purple-200"
                        : "border-white/10 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-full aspect-3/4 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {m.imageUrl ? (
                        <img
                          src={gsToHttp(m.imageUrl)}
                          alt={m.code}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget.parentElement as HTMLElement).innerHTML =
                              `<div class="p-2 text-xs text-center text-gray-600">${m.code}</div>`;
                          }}
                        />
                      ) : (
                        <div className="p-2 text-xs text-center text-gray-600">
                          {m.code}
                        </div>
                      )}
                    </div>
                    <div className="text-xs mt-2 text-left text-gray-700 truncate">
                      {m.code} ({m.type})
                    </div>
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="border border-gray-200 rounded p-3 bg-gray-50">
                <div className="text-sm text-gray-600 mb-2">Preview marker</div>
                {selectedMarkerId ? (
                  (() => {
                    const selected = markerList.find((m) => m.id === selectedMarkerId);
                    if (!selected) {
                      return (
                        <div className="text-sm text-gray-500">
                          Không tìm thấy marker đã chọn.
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col items-center gap-2">
                        {selected.imageUrl && (
                          <img
                            src={gsToHttp(selected.imageUrl)}
                            alt={selected.code}
                            className="max-h-[60vh] object-contain rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold">Code:</span> {selected.code}{" "}
                          - <span className="font-semibold">Type:</span> {selected.type}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-sm text-gray-500">
                    Chưa chọn marker. Chọn 1 marker để xem preview và gắn vào trang.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-gray-600"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={attachMarkerMutation.isPending}
              >
                {attachMarkerMutation.isPending
                  ? "Đang lưu..."
                  : "Lưu project AR vào trang"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

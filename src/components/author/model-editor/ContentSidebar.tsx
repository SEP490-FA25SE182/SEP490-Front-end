// src/components/author/model-editor/ContentSidebar.tsx
import { Image, Box, Plus, Gamepad2 } from "lucide-react";

type ContentSidebarProps = {
  activeTab: "marker" | "model" | "quiz";
  onChangeTab: (tab: "marker" | "model" | "quiz") => void;
  leftToolPanel: "image" | "model" | "quiz" | null;
  onChangeLeftToolPanel: (panel: "image" | "model" | "quiz" | null) => void;
  loadingMarker: boolean;
  markerDetail?: any;
};

export default function ContentSidebar({
  activeTab,
  onChangeTab,
  leftToolPanel,
  onChangeLeftToolPanel,
  loadingMarker,
  markerDetail,
}: ContentSidebarProps) {
  return (
    <aside className="w-60 bg-[#0b1220] border-r border-white/6 p-3 flex flex-col gap-3">
      <div className="text-white font-semibold px-1">Content</div>

      <div className="flex flex-col gap-3">
        {/* Image card */}
        <div
          className="bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between border border-white/10 cursor-pointer"
          onClick={() => onChangeTab("marker")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/6 rounded flex items-center justify-center text-white">
              <Image className="w-5 h-5" />
            </div>
            <div className="text-sm text-white">Ảnh Marker</div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeLeftToolPanel(
                leftToolPanel === "image" ? null : "image"
              );
            }}
            className="w-8 h-8 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white"
            title="Add Image"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 3D Model card */}
        <div
          className={`bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between border border-white/10 cursor-pointer ${
            activeTab === "model" ? "ring-2 ring-purple-600/40" : ""
          }`}
          onClick={() => onChangeTab("model")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/6 rounded flex items-center justify-center text-white">
              <Box className="w-5 h-5" />
            </div>
            <div className="text-sm text-white">3D Model</div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeLeftToolPanel(
                leftToolPanel === "model" ? null : "model"
              );
            }}
            className="w-8 h-8 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white"
            title="Add 3D Model"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Quiz card */}
        <div
          className={`bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between border border-white/10 cursor-pointer ${
            activeTab === "quiz" ? "ring-2 ring-purple-600/40" : ""
          }`}
          onClick={() => onChangeTab("quiz")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/6 rounded flex items-center justify-center text-white">
              {/* Tạm dùng icon Box cho quiz, nếu muốn có thể đổi thành icon khác */}
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="text-sm text-white">Quiz</div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeLeftToolPanel(
                leftToolPanel === "quiz" ? null : "quiz"
              );
            }}
            className="w-8 h-8 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white"
            title="Thêm Quiz"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* quick marker info */}
      <div className="p-2 text-sm text-gray-300">
        {loadingMarker ? (
          "Đang tải marker..."
        ) : markerDetail ? (
          <>
            <div className="font-medium text-white truncate">
              {markerDetail.markerCode}
            </div>
            <div className="text-xs text-gray-400">
              {markerDetail.markerType}
            </div>
          </>
        ) : (
          <div className="text-gray-400">Không có marker</div>
        )}
      </div>
    </aside>
  );
}

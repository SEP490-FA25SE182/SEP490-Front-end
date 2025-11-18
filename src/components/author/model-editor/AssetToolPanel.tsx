// src/components/author/model-editor/AssetToolPanel.tsx
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import GLBThumbnail from "./GLBThumbnail";

type AssetToolPanelProps = {
  panelType: "image" | "model";
  onClose: () => void;

  // 3D Assets
  assets: any[];
  assetsLoading: boolean;
  onAddExistingModel: (asset: any, assetUrl: string) => void;

  // actions
  onUploadClick: () => void;
  onOpenCreateAIDialog: () => void;
};

export default function AssetToolPanel({
  panelType,
  onClose,
  assets,
  assetsLoading,
  onAddExistingModel,
  onUploadClick,
  onOpenCreateAIDialog,
}: AssetToolPanelProps) {
  return (
    <div className="w-72 bg-[#0f172a] border-r border-white/6 p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-semibold capitalize">
            {panelType === "model" ? "3D Model" : "Ảnh Marker"}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-gray-300 mb-4">
          {panelType === "model"
            ? "Chọn cách thêm mô hình 3D vào scene."
            : "Chọn cách thêm ảnh marker vào scene."}
        </div>

        {panelType === "model" && (
          <div className="mt-4">
            <div className="text-sm text-gray-300 mb-2">Models của bạn</div>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto">
              {assetsLoading ? (
                <div className="text-sm text-gray-400 col-span-full">
                  Đang tải models...
                </div>
              ) : assets.length === 0 ? (
                <div className="text-sm text-gray-500 col-span-full">
                  Không có model 3D.
                </div>
              ) : (
                assets.map((a: any) => {
                  const rawUrl = a.assetUrl ?? a.url ?? a.fileUrl ?? "";
                  const assetUrl =
                    typeof rawUrl === "string" ? rawUrl : "";
                  const isGlb = assetUrl
                    .toLowerCase()
                    .includes(".glb");

                  return (
                    <button
                      key={a.asset3DId ?? a.id}
                      type="button"
                      onClick={() =>
                        onAddExistingModel(a, assetUrl)
                      }
                      className="rounded border p-1 overflow-hidden focus:outline-none bg-[#081323] hover:border-purple-500"
                    >
                      <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                        {assetUrl && isGlb ? (
                          <div className="w-full h-full">
                            <GLBThumbnail url={assetUrl} />
                          </div>
                        ) : assetUrl && !isGlb ? (
                          <div className="text-[10px] text-gray-500 p-2 text-center">
                            File không phải .glb
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 p-2">
                            No preview
                          </div>
                        )}
                      </div>
                      <div className="text-xs mt-2 text-left text-gray-200 truncate">
                        {a.title ?? a.fileName ?? a.asset3DId ?? a.id}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* BUTTONS bottom */}
      <div className="flex gap-3">
        <Button
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          onClick={onUploadClick}
        >
          {panelType === "model" ? "Upload Model" : "Upload Ảnh"}
        </Button>

        {panelType === "model" ? (
          <Button
            className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
            onClick={onOpenCreateAIDialog}
          >
            Tạo với AI
          </Button>
        ) : null}
      </div>
    </div>
  );
}

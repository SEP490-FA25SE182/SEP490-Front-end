import { useEffect, useState } from "react";
import { Menu, X, Save, UploadCloud, Plus, Image, Box } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Unity, useUnityContext } from "react-unity-webgl";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useGetMarkerById } from "@/services/ARService";
import Asset3DCreateDialog from "@/components/dialog/3DAssetCreatDialog";

export default function AuthorModelView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leftToolPanel, setLeftToolPanel] = useState<null | "image" | "model">(null);
  const [activeTab, setActiveTab] = useState<"marker" | "model">("marker");
  const [assetDialogOpenLocal, setAssetDialogOpenLocal] = useState(false);

  const navigate = useNavigate();
  const params = useParams<{ markerId?: string }>();
  const location = useLocation();
  const markerId = params.markerId || (location.state as any)?.marker?.markerId;

  const { toast } = useToast();

  // fetch marker detail (will run if markerId exists)
  const { data: markerDetail, isLoading: loadingMarker } = useGetMarkerById(markerId);

  // Giả sử bạn có model URL (lấy từ DB, hoặc tạm thời hardcode)
  const modelUrl =
    "https://firebasestorage.googleapis.com/v0/b/YOUR_BUCKET/o/models%2Fcharacter1.glb?alt=media";

  // Cấu hình Unity build
  const { unityProvider, sendMessage, isLoaded } = useUnityContext({
    loaderUrl: "/build/webgl/RookieAr.loader.js",
    dataUrl: "/build/webgl/RookieAr.data.unityweb",
    frameworkUrl: "/build/webgl/RookieAr.framework.js.unityweb",
    codeUrl: "/build/webgl/RookieAr.wasm.unityweb",
  });

  // Khi Unity đã load xong thì gửi URL model vào Unity
  useEffect(() => {
    if (isLoaded && modelUrl) {
      try {
        sendMessage("SceneManager", "LoadModelFromUrl", modelUrl);
      } catch (e) {
        // ignore if message target not present
      }
    }
  }, [isLoaded, modelUrl, sendMessage]);

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Save / Publish */}
        <header className="bg-[#1a2332] border-b border-white/10 shadow-lg">
          <div className="flex items-center px-6 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>

            <h2 className="ml-4 text-white text-lg font-medium">Xem nhân vật 3D (Unity)</h2>

            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/10"
              >
                Quay lại
              </Button>
              <Button
                onClick={() => toast({ title: "Lưu", description: "Đã lưu thay đổi (demo)." })}
                className="bg-white hover:bg-gray-200 text-gray-800 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Lưu
              </Button>
              <Button
                onClick={() => toast({ title: "Publish", description: "Đã publish (demo)." })}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" /> Publish
              </Button>
            </div>
          </div>
        </header>

        {/* Main area: left small tool column, center Unity, right properties */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Image / 3D Model (card style with plus) */}
          <aside className="w-72 bg-[#0b1220] border-r border-white/6 p-3 flex flex-col gap-3">
            <div className="text-white font-semibold px-1">Content</div>

            <div className="flex flex-col gap-3">
              {/* Image card */}
              <div
                className={`bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between border border-white/10`}
                onClick={() => setActiveTab("marker")}
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
                    setLeftToolPanel(leftToolPanel === "image" ? null : "image");
                  }}
                  className="w-8 h-8 rounded-md bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white"
                  title="Add Image"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* 3D Model card */}
              <div
                className={`bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between border border-white/10 ${activeTab === "model" ? "ring-2 ring-purple-600/40" : ""}`}
                onClick={() => setActiveTab("model")}
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
                    setLeftToolPanel(leftToolPanel === "model" ? null : "model");
                  }}
                  className="w-8 h-8 rounded-md bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white"
                  title="Add 3D Model"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* quick marker info */}
            <div className="p-2 text-sm text-gray-300">
              {loadingMarker ? "Đang tải marker..." : markerDetail ? (
                <>
                  <div className="font-medium text-white truncate">{markerDetail.markerCode}</div>
                  <div className="text-xs text-gray-400">{markerDetail.markerType}</div>
                </>
              ) : (
                <div className="text-gray-400">Không có marker</div>
              )}
            </div>

            {/* Tab-specific action area: 3D model tab shows create-with-AI button, Image tab has no bottom button */}
            <div className="mt-2">
              {activeTab === "model" && (
                <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white" onClick={() => setAssetDialogOpenLocal(true)}>
                  Tạo với AI
                </Button>
              )}
            </div>
          </aside>

          {/* slide panel (unchanged) */}
          {leftToolPanel && (
            <div className="w-72 bg-[#0f172a] border-r border-white/6 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white font-semibold capitalize">{leftToolPanel}</div>
                  <button
                    onClick={() => setLeftToolPanel(null)}
                    className="text-gray-400 hover:text-white"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-sm text-gray-300 mb-4">
                  Chọn cách thêm {leftToolPanel === "image" ? "ảnh" : "mô hình 3D"} vào scene.
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                  Upload
                </Button>
                <Button className="flex-1 bg-pink-500 hover:bg-pink-600 text-white">
                  Tạo với AI
                </Button>
              </div>
            </div>
          )}

          {/* Center: Unity View */}
          <main className="flex-1 bg-[#0e1621] relative">
            <div className="absolute inset-0 flex items-center justify-center">
              {!isLoaded && (
                <div className="text-white bg-black/50 px-6 py-3 rounded-lg">
                  Đang tải Unity WebGL...
                </div>
              )}
              <Unity
                unityProvider={unityProvider}
                style={{
                  width: "100%",
                  height: "100%",
                  visibility: isLoaded ? "visible" : "hidden",
                }}
              />
            </div>
          </main>

          {/* RIGHT: Properties panel (kept empty as requested) */}
          <aside className="w-80 bg-[#0f172a] border-l border-white/6 p-4 text-white">
            <h3 className="text-sm font-semibold mb-3">Properties</h3>
            <div className="text-gray-400">Chưa có thuộc tính — để trống tạm thời</div>
          </aside>
        </div>

        {assetDialogOpenLocal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            {/* backdrop (bấm ra ngoài để đóng) */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
              onClick={() => setAssetDialogOpenLocal(false)}
            />
            {/* container để đặt dialog lên trên cùng */}
            <div className="relative z-10 w-full max-w-3xl pointer-events-auto">
              <Asset3DCreateDialog
                isOpen={assetDialogOpenLocal}
                onClose={() => setAssetDialogOpenLocal(false)}
                markerId={markerId}
                onCreated={() => {
                  toast({ title: "Yêu cầu tạo 3D model đã gửi" });
                  setAssetDialogOpenLocal(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

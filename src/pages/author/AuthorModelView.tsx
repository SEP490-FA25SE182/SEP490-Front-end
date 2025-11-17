import { useEffect, useState, useRef } from "react";
import { Menu, X, Save, UploadCloud, Plus, Image, Box } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Unity, useUnityContext } from "react-unity-webgl";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  useGetMarkerById,
  useUploadAsset3D,
  useCreateARScene,
  useCreateARSceneItems,
  useSearchAsset3D,  
} from "@/services/ARService";
import Asset3DCreateDialog from "@/components/dialog/3DAssetCreatDialog";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";


export default function AuthorModelView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leftToolPanel, setLeftToolPanel] = useState<null | "image" | "model">(
    null
  );
  const [activeTab, setActiveTab] = useState<"marker" | "model">("marker");
  const [assetDialogOpenLocal, setAssetDialogOpenLocal] = useState(false);

  // NEW: scene / selection state
  const [sceneObjects, setSceneObjects] = useState<
    {
      localId: string; // client id
      asset3DId?: string;
      assetUrl?: string;
      orderIndex?: number;
      posX?: number;
      posY?: number;
      posZ?: number;
      rotX?: number;
      rotY?: number;
      rotZ?: number;
      scaleX?: number;
      scaleY?: number;
      scaleZ?: number;
    }[]
  >([]);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);

  const navigate = useNavigate();
  const params = useParams<{ markerId?: string }>();
  const location = useLocation();
  const markerId = params.markerId || (location.state as any)?.marker?.markerId;

  const { toast } = useToast();

    // current userId
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.userId;

  // fetch user's 3D assets
  const { data: asset3DResp, isLoading: assetsLoading } = useSearchAsset3D({
    userId,
  });

  const assets: any[] = asset3DResp?.content ?? [];


  // fetch marker detail (will run if markerId exists)
  const { data: markerDetail, isLoading: loadingMarker } =
    useGetMarkerById(markerId);

  // upload + scene hooks
  const uploadMut = useUploadAsset3D();
  const createSceneMut = useCreateARScene();
  const createSceneItemsMut = useCreateARSceneItems();


  // Cấu hình Unity build
  const {
    unityProvider,
    sendMessage,
    isLoaded,
    addEventListener,
    removeEventListener,
  } = useUnityContext({
    loaderUrl: "/build/webgl/Build.loader.js",
    dataUrl: "/build/webgl/Build.data.br",
    frameworkUrl: "/build/webgl/Build.framework.js.br",
    codeUrl: "/build/webgl/Build.wasm.br",
  });

  // Register Unity events: selection and scene sync
  useEffect(() => {
    const onSelect = (payload: any) => {
      // payload expected: { localId, asset3DId, pos:{x,y,z}, rot:{x,y,z}, scale:{x,y,z} }
      try {
        const data =
          typeof payload === "string" ? JSON.parse(payload) : payload;
        if (!data || !data.localId) return;
        // upsert into sceneObjects
        setSceneObjects((prev) => {
          const idx = prev.findIndex((p) => p.localId === data.localId);
          const item = {
            localId: data.localId,
            asset3DId: data.asset3DId,
            assetUrl: data.assetUrl,
            orderIndex: data.orderIndex ?? (prev.length ? prev.length : 0),
            posX: data.pos?.x ?? 0,
            posY: data.pos?.y ?? 0,
            posZ: data.pos?.z ?? 0,
            rotX: data.rot?.x ?? 0,
            rotY: data.rot?.y ?? 0,
            rotZ: data.rot?.z ?? 0,
            scaleX: data.scale?.x ?? 1,
            scaleY: data.scale?.y ?? 1,
            scaleZ: data.scale?.z ?? 1,
          };
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = item;
            return copy;
          }
          return [...prev, item];
        });
        setSelectedLocalId(data.localId);
      } catch (err) {
        // ignore
      }
    };

    const onSync = (payload: any) => {
      // payload expected: array of objects like above
      try {
        const data =
          typeof payload === "string" ? JSON.parse(payload) : payload;
        if (!Array.isArray(data)) return;
        const mapped = data.map((d: any, i: number) => ({
          localId: d.localId ?? `u-${i}`,
          asset3DId: d.asset3DId,
          assetUrl: d.assetUrl,
          orderIndex: d.orderIndex ?? i,
          posX: d.pos?.x ?? 0,
          posY: d.pos?.y ?? 0,
          posZ: d.pos?.z ?? 0,
          rotX: d.rot?.x ?? 0,
          rotY: d.rot?.y ?? 0,
          rotZ: d.rot?.z ?? 0,
          scaleX: d.scale?.x ?? 1,
          scaleY: d.scale?.y ?? 1,
          scaleZ: d.scale?.z ?? 1,
        }));
        setSceneObjects(mapped);
      } catch (err) {
        // ignore
      }
    };

    // add listeners if API available
    try {
      addEventListener?.("OnSelectObject", onSelect);
      addEventListener?.("OnSyncSceneObjects", onSync);
    } catch (e) {
      // some unity adapters don't expose addEventListener; skip
    }

    return () => {
      try {
        removeEventListener?.("OnSelectObject", onSelect);
        removeEventListener?.("OnSyncSceneObjects", onSync);
      } catch (e) {
        // ignore
      }
    };
  }, [addEventListener, removeEventListener]);

  // helper: currently-selected object
  const selectedObject =
    sceneObjects.find((s) => s.localId === selectedLocalId) ?? null;

  // Apply transform changes: send to Unity and update local state
  const applyTransformToObject = (
    localId: string,
    transform: Partial<(typeof sceneObjects)[number]>
  ) => {
    setSceneObjects((prev) => {
      const next = prev.map((it) =>
        it.localId === localId ? { ...it, ...transform } : it
      );
      const obj = next.find((x) => x.localId === localId)!;

      try {
        const payload = JSON.stringify({
          localId,
          pos: { x: obj.posX ?? 0, y: obj.posY ?? 0, z: obj.posZ ?? 0 },
          rot: { x: obj.rotX ?? 0, y: obj.rotY ?? 0, z: obj.rotZ ?? 0 },
          scale: { x: obj.scaleX ?? 1, y: obj.scaleY ?? 1, z: obj.scaleZ ?? 1 },
        });
        sendMessage("SceneManager", "UpdateObjectTransform", payload);
      } catch (e) {
        /* empty */
      }

      return next;
    });
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload .glb file and add to scene
  const handleUploadGlb = async (file?: File) => {
    if (!file || !markerId) return;
    try {
      const meta = { markerId };
      const res = await uploadMut.mutateAsync({ file, meta });
      // backend should return asset3DId and assetUrl
      const asset3DId = (res as any).asset3DId ?? (res as any).id ?? undefined;
      const assetUrl = (res as any).assetUrl ?? (res as any).assetUrl;
      // inform Unity to add asset (Unity should return a localId via OnSelectObject or OnSyncSceneObjects)
      try {
        const payload = JSON.stringify({ asset3DId, assetUrl });
        sendMessage("SceneManager", "AddAssetFromUrl", payload);
      } catch (e) {
        // ignore
      }
      toast({ title: "Upload thành công", description: `Asset được upload` });
    } catch (err: any) {
      toast({ title: "Upload thất bại", description: err?.message ?? "Lỗi" });
    }
  };

  // Scene creation (save/publish)
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false);
  const [sceneDialogMode, setSceneDialogMode] = useState<"DRAFT" | "PUBLISHED">(
    "DRAFT"
  );

  /**
   * Hàm thực sự gọi backend để lưu scene.
   * exportDto là JSON Unity gửi qua event OnSceneExport.
   */
  const saveSceneToBackend = async (
    exportDto: any,
    status: "DRAFT" | "PUBLISHED"
  ) => {
    const effectiveMarkerId = exportDto?.markerId || markerId;
    if (!effectiveMarkerId) {
      toast({
        title: "Lỗi",
        description: "Marker chưa chọn/không tồn tại.",
      });
      return;
    }

    try {
      const sceneReq = {
        markerId: effectiveMarkerId,
        name: exportDto?.name || "Untitled Scene",
        description: exportDto?.description || "",
        version: 1,
        status,
      };

      const scene = await createSceneMut.mutateAsync(sceneReq);
      const sceneId =
        (scene as any).arSceneId ||
        (scene as any).sceneId ||
        (scene as any).id;

      const items = (exportDto?.items || []).map((it: any, idx: number) => ({
        sceneId,
        asset3DId: it.asset3DId,
        orderIndex: it.orderIndex ?? idx,
        posX: it.posX ?? 0,
        posY: it.posY ?? 0,
        posZ: it.posZ ?? 0,
        rotX: it.rotX ?? 0,
        rotY: it.rotY ?? 0,
        rotZ: it.rotZ ?? 0,
        scaleX: it.scaleX ?? 1,
        scaleY: it.scaleY ?? 1,
        scaleZ: it.scaleZ ?? 1,
        // nếu backend hỗ trợ:
        behaviorJson: it.behaviorJson ?? null,
      }));

      if (items.length) {
        await createSceneItemsMut.mutateAsync(items);
        toast({
          title: "Scene saved",
          description: `Scene ${sceneId} và ${items.length} item(s) đã lưu`,
        });
      } else {
        toast({
          title: "Scene saved",
          description: `Scene ${sceneId} đã lưu (không có item)`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi khi lưu scene",
        description: err?.message || "Unknown error",
      });
    }
  };

  /**
   * Lắng nghe event OnSceneExport từ Unity.
   * Unity gọi Application.ExternalCall("OnSceneExport", json)
   */
  useEffect(() => {
    const onSceneExport = (payload: any) => {
      try {
        const data =
          typeof payload === "string" ? JSON.parse(payload) : payload;
        const status = sceneDialogMode || "DRAFT";
        saveSceneToBackend(data, status);
      } catch (err) {
        console.error("OnSceneExport parse error", err);
        toast({
          title: "Lỗi",
          description: "Không đọc được dữ liệu scene từ Unity",
        });
      }
    };

    try {
      addEventListener?.("OnSceneExport", onSceneExport);
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        removeEventListener?.("OnSceneExport", onSceneExport);
      } catch (e) {
        // ignore
      }
    };
  }, [addEventListener, removeEventListener, sceneDialogMode]);

  /**
   * Khi user bấm Lưu / Publish và confirm trong dialog:
   * -> gửi meta (markerId, name, description) sang Unity
   * -> Unity build JSON scene, bắn lại qua OnSceneExport
   * -> useEffect ở trên nhận và gọi saveSceneToBackend()
   */
  const handleCreateScene = async (payload: {
    name?: string;
    description?: string;
    status?: "DRAFT" | "PUBLISHED";
  }) => {
    if (!markerId) {
      toast({ title: "Lỗi", description: "Marker chưa chọn/không tồn tại." });
      return;
    }

    const status = payload.status ?? "DRAFT";
    setSceneDialogMode(status);

    const metaForUnity = {
      sceneId: null, // hoặc id hiện có nếu là cập nhật
      markerId,
      name: payload.name || "Untitled Scene",
      description: payload.description || "",
    };

    try {
      const json = JSON.stringify(metaForUnity);
      sendMessage("SceneManager", "ExportScene", json);
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description:
          err?.message || "Không gửi được yêu cầu ExportScene sang Unity",
      });
    } finally {
      setSceneDialogOpen(false);
    }
  };

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
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>

            <h2 className="ml-4 text-white text-lg font-medium">
              Xem nhân vật 3D (Unity)
            </h2>

            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-white/10"
              >
                Quay lại
              </Button>
              <Button
                onClick={() => {
                  setSceneDialogMode("DRAFT");
                  setSceneDialogOpen(true);
                }}
                className="bg-white hover:bg-gray-200 text-gray-800 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Lưu
              </Button>
              <Button
                onClick={() => {
                  setSceneDialogMode("PUBLISHED");
                  setSceneDialogOpen(true);
                }}
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
                    setLeftToolPanel(
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
                className={`bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between border border-white/10 ${
                  activeTab === "model" ? "ring-2 ring-purple-600/40" : ""
                }`}
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
                    setLeftToolPanel(
                      leftToolPanel === "model" ? null : "model"
                    );
                  }}
                  className="w-8 h-8 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white"
                  title="Add 3D Model"
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

          {/* slide panel (unchanged but + upload input) */}
          {leftToolPanel && (
            <div className="w-72 bg-[#0f172a] border-r border-white/6 p-4 flex flex-col justify-between">
              {/* HEADER */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white font-semibold capitalize">
                    {leftToolPanel === "model" ? "3D Model" : "Ảnh Marker"}
                  </div>
                  <button
                    onClick={() => setLeftToolPanel(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-sm text-gray-300 mb-4">
                  {leftToolPanel === "model"
                    ? "Chọn cách thêm mô hình 3D vào scene."
                    : "Chọn cách thêm ảnh marker vào scene."}
                </div>

                {/* hidden file input - opened by the Upload Model button */}
                {leftToolPanel === "model" && (
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
                          const assetUrl = typeof rawUrl === "string" ? rawUrl : "";
                          const isGlb = assetUrl.toLowerCase().includes(".glb");

                          return (
                            <button
                              key={a.asset3DId ?? a.id}
                              type="button"
                              onClick={() => {
                                try {
                                  const payload = JSON.stringify({
                                    asset3DId: a.asset3DId ?? a.id,
                                    assetUrl,
                                  });
                                  sendMessage(
                                    "SceneManager",
                                    "AddAssetFromUrl",
                                    payload
                                  );
                                  toast({
                                    title: "Đã thêm model vào scene",
                                    description: a.title || a.fileName || "",
                                  });
                                } catch (e) {
                                  console.error("AddAssetFromUrl error", e);
                                }
                              }}
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

              {/* BUTTONS */}
              <div className="flex gap-3">
                {/* Upload (opens hidden file input when in model tab) */}
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => {
                    if (leftToolPanel === "model") {
                      fileInputRef.current?.click();
                    } else {
                      // optionally handle image upload flow if needed
                    }
                  }}
                >
                  {leftToolPanel === "model" ? "Upload Model" : "Upload Ảnh"}
                </Button>

                {/* Tạo với AI */}
                {leftToolPanel === "model" ? (
                  <Button
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                    onClick={() => {
                      setAssetDialogOpenLocal(true);
                    }}
                  >
                    Tạo với AI
                  </Button>
                ) : null}
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

          {/* RIGHT: Properties panel (shows when object selected) */}
          <aside className="w-80 bg-[#0f172a] border-l border-white/6 p-4 text-white">
            <h3 className="text-sm font-semibold mb-3">Properties</h3>
            {!selectedObject ? (
              <div className="text-gray-400">
                Chọn một object trong scene để chỉnh sửa (Position / Rotation /
                Scale)
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-gray-300">Asset ID</div>
                <div className="text-sm text-white truncate">
                  {selectedObject.asset3DId ??
                    "local:" + selectedObject.localId}
                </div>

                <div className="border-t border-white/6 pt-3">
                  <div className="text-xs text-gray-300 mb-1">Position</div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="0.01"
                      value={selectedObject.posX ?? 0}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          posX: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="0.01"
                      value={selectedObject.posY ?? 0}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          posY: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="0.01"
                      value={selectedObject.posZ ?? 0}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          posZ: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="border-t border-white/6 pt-3">
                  <div className="text-xs text-gray-300 mb-1">
                    Rotation (deg)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="1"
                      value={selectedObject.rotX ?? 0}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          rotX: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="1"
                      value={selectedObject.rotY ?? 0}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          rotY: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="1"
                      value={selectedObject.rotZ ?? 0}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          rotZ: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="border-t border-white/6 pt-3">
                  <div className="text-xs text-gray-300 mb-1">Scale</div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="0.01"
                      value={selectedObject.scaleX ?? 1}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          scaleX: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="0.01"
                      value={selectedObject.scaleY ?? 1}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          scaleY: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                      type="number"
                      step="0.01"
                      value={selectedObject.scaleZ ?? 1}
                      onChange={(e) =>
                        applyTransformToObject(selectedObject.localId, {
                          scaleZ: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedLocalId(null)}
                    className="text-white"
                  >
                    Unselect
                  </Button>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Render Dialog directly — let Dialog handle portal & overlay */}
        <Asset3DCreateDialog
          isOpen={assetDialogOpenLocal}
          onClose={() => setAssetDialogOpenLocal(false)}
          markerId={markerId}
          onCreated={() => {
            toast({ title: "Yêu cầu tạo 3D model đã gửi" });
            setAssetDialogOpenLocal(false);
          }}
        />

        {/* Scene create dialog */}
        {sceneDialogOpen && (
          <SceneCreateModal
            isOpen={sceneDialogOpen}
            initialStatus={sceneDialogMode}
            onClose={() => setSceneDialogOpen(false)}
            onSave={(name, description, status) =>
              handleCreateScene({ name, description, status })
            }
          />
        )}
      </div>
    </div>
  );
}

/* Inline scene create modal */
function SceneCreateModal({
  isOpen,
  initialStatus,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initialStatus: "DRAFT" | "PUBLISHED";
  onClose: () => void;
  onSave: (
    name?: string,
    description?: string,
    status?: "DRAFT" | "PUBLISHED"
  ) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const status = initialStatus;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#0f172a] border border-white/10 rounded p-4 text-white">
        <h3 className="text-lg font-semibold mb-2">
          Tạo Scene ({status === "DRAFT" ? "Lưu nháp" : "Xuất bản"})
        </h3>
        <label className="text-sm text-gray-300">Tên</label>
        <input
          className="w-full mt-1 mb-3 p-2 bg-[#061026] border border-white/10 rounded text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên scene"
        />
        <label className="text-sm text-gray-300">Mô tả</label>
        <textarea
          className="w-full mt-1 mb-3 p-2 bg-[#061026] border border-white/10 rounded text-white"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả ngắn"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-white">
            Huỷ
          </Button>
          <Button
            onClick={() => onSave(name, description, status)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Lưu
          </Button>
        </div>
      </div>
    </div>
  );
}

/* GLBThumbnail component (preview .glb bằng three.js) */
function GLBThumbnail({ url, size = 160 }: { url?: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;

    const canvas = canvasRef.current;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const w = size;
    const h = Math.round(size * 0.75);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(DPR);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0); // nền trong suốt

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 1000);
    camera.position.set(0, 1.2, 2.4);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    const loader = new GLTFLoader();
    loader.setCrossOrigin("anonymous");

    let model: THREE.Object3D | null = null;
    let frameId: number;

    loader.load(
      url,
      (gltf: any) => {
        model = gltf.scene || (gltf as any);

        const box = new THREE.Box3().setFromObject(model);
        const sizeBox = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeBox.x, sizeBox.y, sizeBox.z) || 1;
        const scale = (1.0 / maxDim) * 1.2;
        model.scale.setScalar(scale);
        box.getCenter(model.position).multiplyScalar(-1);

        scene.add(model);
      },
      undefined,
      (error: any) => {
        console.error("Lỗi load GLB thumbnail:", error, "URL:", url);
      }
    );

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (model) {
        model.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      (gl as any)?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={Math.round(size * 0.75)}
      className="w-full h-full block"
    />
  );
}

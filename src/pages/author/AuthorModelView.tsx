import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Save, UploadCloud } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useUnityContext } from "react-unity-webgl";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  useGetMarkerById,
  useUploadAsset3D,
  useCreateARScene,
  useCreateARSceneItems,
  useSearchAsset3D,
  type Marker,
} from "@/services/ARService";
import Asset3DCreateDialog from "@/components/dialog/3DAssetCreatDialog";

import ContentSidebar from "@/components/author/model-editor/ContentSidebar";
import AssetToolPanel from "@/components/author/model-editor/AssetToolPanel";
import UnityStage from "@/components/author/model-editor/UnityStage";
import PropertiesPanel from "@/components/author/model-editor/PropertiesPanel";
import type { SceneObject } from "@/components/author/model-editor/PropertiesPanel";
import SceneCreateModal from "@/components/author/model-editor/SceneCreateModal";
import { getQuizPlayById } from "@/services/QuizService";

// Khai báo global cho TypeScript (để window.OnSelectObject không báo lỗi)
declare global {
  interface Window {
    OnSelectObject?: (json: any) => void;
    OnSyncSceneObjects?: (json: any) => void;
    OnSceneExport?: (json: any) => void;
  }
}

export default function AuthorModelView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"marker" | "model" | "quiz">(
    "marker"
  );
  const [leftToolPanel, setLeftToolPanel] =
    useState<null | "image" | "model" | "quiz">(null);
  const [assetDialogOpenLocal, setAssetDialogOpenLocal] = useState(false);

  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { markerId: paramMarkerId } = useParams<{ markerId?: string }>();
  const location = useLocation();
  const { toast } = useToast();

  // Lấy markerId từ URL hoặc location.state
  const markerIdFromState = (location.state as any)?.marker?.markerId;
  const markerId = paramMarkerId || markerIdFromState;

  // Dữ liệu marker được truyền từ AuthorPageList (state)
  const initialMarker = location.state?.marker as Marker | undefined;

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user.userId;

  // Tải danh sách asset 3D của user
  const {
    data: asset3DResp,
    isLoading: assetsLoading,
    refetch: refetchAssets,
  } = useSearchAsset3D({ userId });
  const assets: any[] = asset3DResp?.content ?? [];

  // Tải marker detail (có initialData để hiển thị ngay)
  const { data: markerDetail, isLoading: loadingMarker } = useGetMarkerById(
    markerId,
    {
      initialData: initialMarker, // Dữ liệu có ngay, không flash loading
    }
  );

  // Hàm lấy chapterId hiện tại (ưu tiên state > param > fallback)
  const getCurrentChapterId = (): string | undefined => {
    if (location.state && (location.state as any).chapterId) {
      return (location.state as any).chapterId;
    }
    return undefined;
  };

  const uploadMut = useUploadAsset3D();
  const createSceneMut = useCreateARScene();
  const createSceneItemsMut = useCreateARSceneItems();

  const {
    unityProvider,
    sendMessage,
    isLoaded,
    addEventListener,
    removeEventListener,
  } = useUnityContext({
    loaderUrl: "/build/webgl/ar_rookie_build.loader.js",
    dataUrl: "/build/webgl/ar_rookie_build.data.unityweb",
    frameworkUrl: "/build/webgl/ar_rookie_build.framework.js.unityweb",
    codeUrl: "/build/webgl/ar_rookie_build.wasm.unityweb",
  });

  const previewQuizInUnity = async (quizId: string) => {
    if (!isLoaded) {
      toast({
        title: "Unity chưa sẵn sàng",
        description: "Vui lòng chờ Unity WebGL load xong rồi thử lại.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1) Gọi backend lấy dữ liệu quiz để play
      const quizPlay = await getQuizPlayById(quizId);

      // 2) Convert sang JSON string
      const json = JSON.stringify(quizPlay);

      // 3) Gửi sang Unity
      //  - GameObject: "QuizGameManager"
      //  - Method: LoadQuizFromJson(string json)
      sendMessage("QuizGameManager", "LoadQuizFromJson", json);

      toast({
        title: "Đã gửi quiz sang Unity",
        description: `QuizId: ${quizId}`,
      });
    } catch (err: any) {
      console.error("previewQuizInUnity error", err);
      toast({
        title: "Lỗi",
        description:
          err?.response?.data?.message || "Không load được quiz để preview.",
        variant: "destructive",
      });
    }
  };

  // =====================
  // Unity events: select + sync
  // =====================
  useEffect(() => {
    const onSelect = (payload: any) => {
      try {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;
        if (!data || !data.localId) return;

        setSceneObjects((prev) => {
          const idx = prev.findIndex((p) => p.localId === data.localId);
          const item: SceneObject = {
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
        console.error("OnSelectObject handler error", err);
      }
    };

    const onSync = (payload: any) => {
      try {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;
        if (!Array.isArray(data)) return;
        const mapped: SceneObject[] = data.map((d: any, i: number) => ({
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
        console.error("OnSyncSceneObjects handler error", err);
      }
    };

    // react-unity-webgl event (giữ nguyên)
    try {
      addEventListener?.("OnSelectObject", onSelect);
      addEventListener?.("OnSyncSceneObjects", onSync);
    } catch (e) { }

    // BRIDGE cho Application.ExternalCall("OnSelectObject"/"OnSyncSceneObjects")
    window.OnSelectObject = (json: any) => {
      onSelect(json);
    };
    window.OnSyncSceneObjects = (json: any) => {
      onSync(json);
    };

    return () => {
      try {
        removeEventListener?.("OnSelectObject", onSelect);
        removeEventListener?.("OnSyncSceneObjects", onSync);
      } catch (e) { }

      delete window.OnSelectObject;
      delete window.OnSyncSceneObjects;
    };
  }, [addEventListener, removeEventListener]);

  // =====================
  // Load initial scene for marker
  // =====================
  useEffect(() => {
    const loadInitialScene = async () => {
      if (!markerId || !isLoaded) return;

      setSceneObjects([]);
      setSelectedLocalId(null);

      try {
        sendMessage("SceneManager", "ClearAll", "");
      } catch (e) { }

      try {
        const res = await fetch(`/api/markers/${markerId}/active-scene`);
        if (!res.ok) {
          setCurrentSceneId(null);
          return;
        }

        const scene = await res.json();
        if (!scene) {
          setCurrentSceneId(null);
          return;
        }

        setCurrentSceneId(scene.sceneId);

        const importDto = {
          sceneId: scene.sceneId,
          markerId: scene.markerId,
          name: scene.name,
          description: scene.description,
          items: (scene.items || []).map((it: any) => ({
            asset3DId: it.asset3DId,
            assetUrl: it.assetUrl,
            orderIndex: it.orderIndex,
            posX: it.posX,
            posY: it.posY,
            posZ: it.posZ,
            rotX: it.rotX,
            rotY: it.rotY,
            rotZ: it.rotZ,
            scaleX: it.scaleX,
            scaleY: it.scaleY,
            scaleZ: it.scaleZ,
            behaviorJson: it.behaviorJson,
          })),
        };

        try {
          sendMessage(
            "SceneManager",
            "LoadSceneFromJson",
            JSON.stringify(importDto)
          );
        } catch (e) { }
      } catch (error) {
        console.error("Load initial scene error", error);
      }
    };

    loadInitialScene();
  }, [markerId, isLoaded, sendMessage]);

  const selectedObject =
    sceneObjects.find((s) => s.localId === selectedLocalId) ?? null;

  const applyTransformToObject = (
    localId: string,
    transform: Partial<SceneObject>
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
          scale: {
            x: obj.scaleX ?? 1,
            y: obj.scaleY ?? 1,
            z: obj.scaleZ ?? 1,
          },
        });
        sendMessage("SceneManager", "UpdateObjectTransform", payload);
      } catch (e) { }

      return next;
    });
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadGlb = async (file?: File) => {
    if (!file || !markerId) return;
    try {
      const meta = {
        markerId,
        userId,               // 👈 thêm dòng này
        fileName: file.name,  // optional: cho backend biết tên file
        format: "GLB",        // optional: clear format
      };

      const res = await uploadMut.mutateAsync({ file, meta });

      const asset3DId =
        (res as any).asset3DId ?? (res as any).id ?? undefined;
      const assetUrl = (res as any).assetUrl ?? ""; // bớt lặp

      try {
        const payload = JSON.stringify({ asset3DId, assetUrl });
        sendMessage("SceneManager", "AddAssetFromUrl", payload);
      } catch (e) { }

      // ⬇️ sẽ refetch list (bước 2 ở dưới)
      await refetchAssets?.();

      toast({
        title: "Upload thành công",
        description: `Asset được upload`,
      });
    } catch (err: any) {
      toast({
        title: "Upload thất bại",
        description: err?.message ?? "Lỗi",
      });
    }
  };


  // Scene save/publish
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false);
  const [sceneDialogMode, setSceneDialogMode] =
    useState<"DRAFT" | "PUBLISHED">("DRAFT");

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
        // hidden on UI, always set ACTIVE when saving/publishing
        isActived: "ACTIVE",
      };

      const scene = await createSceneMut.mutateAsync(sceneReq);
      const sceneId =
        (scene as any).arSceneId ||
        (scene as any).sceneId ||
        (scene as any).id;

      setCurrentSceneId(sceneId);

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

  // =====================
  // Unity event: OnSceneExport
  // =====================
  useEffect(() => {
    const onSceneExport = (payload: any) => {
      try {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;
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
    } catch (e) { }

    // Bridge cho Application.ExternalCall("OnSceneExport", json)
    window.OnSceneExport = (json: any) => {
      onSceneExport(json);
    };

    return () => {
      try {
        removeEventListener?.("OnSceneExport", onSceneExport);
      } catch (e) { }

      delete window.OnSceneExport;
    };
  }, [addEventListener, removeEventListener, sceneDialogMode]);

  const handleCreateScene = (payload: {
    name?: string;
    description?: string;
    status?: "DRAFT" | "PUBLISHED";
  }) => {
    if (!markerId) {
      toast({
        title: "Lỗi",
        description: "Marker chưa chọn/không tồn tại.",
      });
      return;
    }

    const status = payload.status ?? "DRAFT";
    setSceneDialogMode(status);

    const metaForUnity = {
      sceneId: currentSceneId,
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Nếu focus đang ở input / textarea / contenteditable
      if (
        target.closest("input, textarea, [contenteditable='true']") ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA"
      ) {
        // Chặn Unity bắt phím
        e.stopImmediatePropagation();
        // KHÔNG preventDefault, để browser vẫn nhập vào input
      }
    };

    // capture = true để chạy trước listener của Unity
    document.addEventListener("keydown", handler, true);

    return () => {
      document.removeEventListener("keydown", handler, true);
    };
  }, []);


  const projectTitle = loadingMarker
    ? "Project (đang tải marker...)"
    : markerDetail?.markerCode
      ? `Project ${markerDetail.markerCode}`
      : "Project";

  // Handler thêm model vào scene
  const handleAddExistingModel = (asset: any, assetUrl: string) => {
    try {
      const payload = JSON.stringify({
        asset3DId: asset.asset3DId ?? asset.id,
        assetUrl,
      });
      sendMessage("SceneManager", "AddAssetFromUrl", payload);
      toast({
        title: "Đã thêm model vào scene",
        description: asset.title || asset.fileName || "",
      });
    } catch (e) {
      console.error("AddAssetFromUrl error", e);
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] border-b border-white/10 shadow-lg">
          <div className="flex items-center px-6 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-6 h-6" />
              ) : (
                <ChevronRight className="w-6 h-6" />
              )}
            </Button>

            <h2 className="ml-4 text-white text-lg font-medium">
              {projectTitle}
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

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT Content sidebar */}
          <ContentSidebar
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            leftToolPanel={leftToolPanel}
            onChangeLeftToolPanel={setLeftToolPanel}
            loadingMarker={loadingMarker}
            markerDetail={markerDetail}
          />

          {/* Slide panel - AssetToolPanel */}
          {leftToolPanel && (
            <AssetToolPanel
              panelType={leftToolPanel}
              onClose={() => setLeftToolPanel(null)}
              markerId={markerDetail?.markerId || initialMarker?.markerId}
              markerImageUrl={markerDetail?.imageUrl || initialMarker?.imageUrl}
              assets={assets}
              assetsLoading={assetsLoading}
              onAddExistingModel={handleAddExistingModel}
              onUploadClick={() => {
                if (leftToolPanel === "model") {
                  fileInputRef.current?.click();
                }
              }}
              onOpenCreateAIDialog={() => setAssetDialogOpenLocal(true)}
              currentChapterId={getCurrentChapterId()}
              onQuizFullyCreated={(quizId) => {
                // khi tạo quiz mới xong thì preview luôn
                previewQuizInUnity(quizId);
              }}
              onPreviewQuiz={(quizId) => {
                // khi chọn quiz có sẵn trong dialog
                previewQuizInUnity(quizId);
              }}
            />
          )}

          {/* Center Unity */}
          <UnityStage unityProvider={unityProvider} isLoaded={isLoaded} />

          {/* Right Properties */}
          <PropertiesPanel
            selectedObject={selectedObject}
            onChangeTransform={applyTransformToObject}
            onUnselect={() => setSelectedLocalId(null)}
          />
        </div>

        {/* Hidden input upload glb */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb"
          style={{ display: "none" }}
          onChange={(e) => handleUploadGlb(e.target.files?.[0] ?? undefined)}
        />

        {/* Dialog tạo 3D bằng AI */}
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
        <SceneCreateModal
          isOpen={sceneDialogOpen}
          initialStatus={sceneDialogMode}
          onClose={() => setSceneDialogOpen(false)}
          onSave={(name, description, status) =>
            handleCreateScene({ name, description, status })
          }
        />
      </div>
    </div>
  );
}

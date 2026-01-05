import { useEffect, useState, useRef } from "react";
import { UploadCloud, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  useGetLatestARSceneByMarkerId,
  useUpdateARScene, //  ADDED
  useUpdateARSceneItem, //  ADDED
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

  const { data: latestScene } = useGetLatestARSceneByMarkerId(markerId);

  const hasScene = !!currentSceneId;

  //  ADDED: giữ name/description để dùng khi "Lưu chỉnh sửa" (không modal)
  const [sceneMeta, setSceneMeta] = useState<{
    name: string;
    description: string;
    status?: "DRAFT" | "PUBLISHED";
  }>({
    name: "",
    description: "",
  });

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

  //  ADDED: update mutations
  const updateSceneMut = useUpdateARScene();
  const updateSceneItemMut = useUpdateARSceneItem();

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
      const quizPlay = await getQuizPlayById(quizId);
      const json = JSON.stringify(quizPlay);
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

  //  ADDED: khi đã có scene, bấm "Lưu chỉnh sửa / Publish chỉnh sửa" -> ExportScene luôn, không modal
  const requestExportAndUpdate = (_status: "DRAFT" | "PUBLISHED") => {
    if (!markerId) return;

    const metaForUnity = {
      sceneId: currentSceneId,
      markerId,
      name: sceneMeta.name || "Untitled Scene",
      description: sceneMeta.description || "",
    };

    try {
      sendMessage("SceneManager", "ExportScene", JSON.stringify(metaForUnity));
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description:
          err?.message || "Không gửi được yêu cầu ExportScene sang Unity",
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
            itemId: data.itemId, //  ADDED
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
          itemId: d.itemId, //  ADDED
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

    try {
      addEventListener?.("OnSelectObject", onSelect);
      addEventListener?.("OnSyncSceneObjects", onSync);
    } catch (e) { }

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
    if (!markerId || !isLoaded) return;

    setSceneObjects([]);
    setSelectedLocalId(null);

    try {
      sendMessage("SceneManager", "ClearAll", "");
    } catch (e) { }
  }, [markerId, isLoaded, sendMessage]);

  // B) Load latest scene (DRAFT/PUBLISHED đều được) khi có data
  useEffect(() => {
    if (!markerId || !isLoaded) return;
    if (typeof latestScene === "undefined") return;

    if (!latestScene) {
      setCurrentSceneId(null);
      //  ADDED: reset meta
      setSceneMeta({ name: "", description: "" });
      return;
    }

    // latestScene backend trả dạng { scene, marker, assets, items }
    const sceneMetaFromApi = (latestScene as any).scene ?? latestScene; // fallback nếu API cũ trả flat
    const markerMeta = (latestScene as any).marker ?? null;

    const sceneId =
      sceneMetaFromApi?.sceneId ||
      sceneMetaFromApi?.arSceneId ||
      sceneMetaFromApi?.id ||
      null;

    setCurrentSceneId(sceneId);

    //  ADDED: sync name/description xuống state để dùng "Lưu chỉnh sửa"
    setSceneMeta({
      name: sceneMetaFromApi?.name ?? "",
      description: sceneMetaFromApi?.description ?? "",
      status: sceneMetaFromApi?.status,
    });

    // build map asset3DId -> assetUrl từ latestScene.assets
    const apiAssets: any[] = (latestScene as any).assets ?? [];
    const urlMap = new Map<string, string>();
    for (const a of apiAssets) {
      const id = a?.asset3DId ?? a?.id;
      if (id && a?.assetUrl) urlMap.set(id, a.assetUrl);
    }

    //  items không có assetUrl => join bằng asset3DId
    const apiItems: any[] = (latestScene as any).items ?? [];

    const items = apiItems
      .map((it: any, i: number) => {
        const asset3DId = it.asset3DId ?? it.asset3dId;
        const assetUrl = asset3DId ? urlMap.get(asset3DId) : undefined;

        return {
          itemId: it.id ?? it.itemId, //  ADDED (để Unity giữ mapping itemId)
          asset3DId,
          assetUrl, //  đã join đúng
          orderIndex: it.orderIndex ?? i,
          posX: it.posX ?? 0,
          posY: it.posY ?? 0,
          posZ: it.posZ ?? 0,
          rotX: it.rotX ?? 0,
          rotY: it.rotY ?? 0,
          rotZ: it.rotZ ?? 0,
          scaleX: it.scaleX ?? 1,
          scaleY: it.scaleY ?? 1,
          scaleZ: it.scaleZ ?? 1,
          behaviorJson: it.behaviorJson ?? "",
        };
      })
      //  thiếu url thì bỏ (tránh Unity fallback ra cube)
      .filter((x: any) => !!x.asset3DId && !!x.assetUrl);

    //  meta lấy từ scene/marker đúng
    const importDto = {
      sceneId,
      markerId: markerMeta?.markerId || sceneMetaFromApi?.markerId || markerId,
      name: sceneMetaFromApi?.name ?? "",
      description: sceneMetaFromApi?.description ?? "",
      items,
    };

    try {
      sendMessage("SceneManager", "LoadSceneFromJson", JSON.stringify(importDto));
    } catch (e) { }
  }, [markerId, isLoaded, latestScene, sendMessage]);

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
        userId,
        fileName: file.name,
        format: "GLB",
      };

      const res = await uploadMut.mutateAsync({ file, meta });

      const asset3DId = (res as any).asset3DId ?? (res as any).id ?? undefined;
      const assetUrl = (res as any).assetUrl ?? "";

      try {
        const payload = JSON.stringify({ asset3DId, assetUrl });
        sendMessage("SceneManager", "AddAssetFromUrl", payload);
      } catch (e) { }

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

  //  ADDED: update flow
  const updateSceneToBackend = async (
    exportDto: any,
    status: "DRAFT" | "PUBLISHED"
  ) => {
    const sceneId = currentSceneId;
    if (!sceneId) {
      toast({
        title: "Lỗi",
        description: "Chưa có sceneId để cập nhật.",
        variant: "destructive",
      });
      return;
    }

    const effectiveMarkerId = exportDto?.markerId || markerId;
    if (!effectiveMarkerId) {
      toast({ title: "Lỗi", description: "Marker chưa chọn/không tồn tại." });
      return;
    }

    const exportedItems = exportDto?.items || [];
    console.log("[UPDATE] exportDto items:", exportedItems.length, exportedItems);

    try {
      // 1) update scene meta
      await updateSceneMut.mutateAsync({
        id: sceneId,
        data: {
          markerId: effectiveMarkerId,
          name: exportDto?.name || sceneMeta.name || "Untitled Scene",
          description:
            exportDto?.description || sceneMeta.description || "",
          version: 1,
          status,
          isActived: "ACTIVE",
        } as any,
      });

      // 2) update items (itemId có sẵn) + create items mới (không có itemId)
      const toUpdate = exportedItems.filter((it: any) => !!it.itemId);
      const toCreate = exportedItems.filter((it: any) => !it.itemId);

      await Promise.all(
        toUpdate.map((it: any, idx: number) =>
          updateSceneItemMut.mutateAsync({
            id: it.itemId,
            data: {
              id: it.itemId,
              sceneId,
              asset3DId: it.asset3DId ?? it.asset3dId,
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
              behaviorJson: it.behaviorJson ?? "",
            } as any,
          })
        )
      );

      if (toCreate.length > 0) {
        const createReq = toCreate
          .map((it: any, idx: number) => {
            const asset3DId = it.asset3DId ?? it.asset3dId;
            if (!asset3DId) return null;
            return {
              sceneId,
              asset3DId,
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
              behaviorJson: it.behaviorJson ?? "",
            };
          })
          .filter(Boolean);

        if (createReq.length > 0) {
          await createSceneItemsMut.mutateAsync(createReq as any);
        }
      }

      toast({
        title: "Đã lưu chỉnh sửa",
        description: `Scene ${sceneId} đã được cập nhật`,
      });
    } catch (err: any) {
      console.error("[UPDATE] error", err);
      toast({
        title: "Lỗi khi cập nhật scene",
        description:
          err?.response?.data?.message || err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const saveSceneToBackend = async (
    exportDto: any,
    status: "DRAFT" | "PUBLISHED"
  ) => {
    const effectiveMarkerId = exportDto?.markerId || markerId;
    if (!effectiveMarkerId) {
      toast({ title: "Lỗi", description: "Marker chưa chọn/không tồn tại." });
      return;
    }

    const exportedItems = exportDto?.items || [];
    console.log("[SAVE] exportDto items:", exportedItems.length, exportedItems);

    try {
      const sceneReq = {
        markerId: effectiveMarkerId,
        name: exportDto?.name || "Untitled Scene",
        description: exportDto?.description || "",
        version: 1,
        status,
        isActived: "ACTIVE",
      };

      const scene = await createSceneMut.mutateAsync(sceneReq);

      const sceneId =
        (scene as any).arSceneId ||
        (scene as any).sceneId ||
        (scene as any).id ||
        (scene as any).scene_id;

      if (!sceneId) {
        console.error("[SAVE] Scene created but sceneId missing. scene=", scene);
        toast({
          title: "Lỗi khi lưu scene",
          description:
            "Tạo scene thành công nhưng không lấy được sceneId từ response.",
          variant: "destructive",
        });
        return;
      }

      setCurrentSceneId(sceneId);

      //  ADDED: sync meta when created
      setSceneMeta({
        name: exportDto?.name || "Untitled Scene",
        description: exportDto?.description || "",
        status,
      });

      const itemsReq = exportedItems
        .map((it: any, idx: number) => {
          const asset3DId = it.asset3DId ?? it.asset3dId;
          if (!asset3DId) return null;

          return {
            sceneId,
            asset3DId,
            assetUrl: it.assetUrl ?? null,
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
            behaviorJson: it.behaviorJson ?? "",
          };
        })
        .filter(Boolean);

      console.log("[SAVE] itemsReq:", itemsReq.length, itemsReq);

      if (itemsReq.length > 0) {
        const created = await createSceneItemsMut.mutateAsync(itemsReq as any);

        console.log("[SAVE] created items resp:", created);

        if (!created || (Array.isArray(created) && created.length === 0)) {
          toast({
            title: "Cảnh báo",
            description:
              "API tạo scene-items trả về rỗng. Kiểm tra payload / backend mapping.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Scene saved",
            description: `Scene ${sceneId} + ${itemsReq.length} item(s) đã lưu`,
          });
        }
      } else {
        toast({
          title: "Scene saved",
          description: `Scene ${sceneId} đã lưu (export không có item nào có asset3DId)`,
        });
      }
    } catch (err: any) {
      console.error("[SAVE] error", err);
      toast({
        title: "Lỗi khi lưu scene",
        description:
          err?.response?.data?.message || err?.message || "Unknown error",
        variant: "destructive",
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

        //  CHANGED: nếu đã có scene => update, chưa có => create
        if (currentSceneId) {
          updateSceneToBackend(data, status);
        } else {
          saveSceneToBackend(data, status);
        }
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

    window.OnSceneExport = (json: any) => {
      onSceneExport(json);
    };

    return () => {
      try {
        removeEventListener?.("OnSceneExport", onSceneExport);
      } catch (e) { }

      delete window.OnSceneExport;
    };
  }, [
    addEventListener,
    removeEventListener,
    sceneDialogMode,
    currentSceneId, //  ADDED
  ]);

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

      //  ADDED: lưu meta để lần sau bấm "Lưu chỉnh sửa" không bị rỗng
      setSceneMeta({
        name: metaForUnity.name,
        description: metaForUnity.description,
        status,
      });
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

      if (
        target.closest("input, textarea, [contenteditable='true']") ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA"
      ) {
        e.stopImmediatePropagation();
      }
    };

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
    const newAssetId = asset.asset3DId ?? asset.id;
    const newAssetUrl = assetUrl;

    try {
      if (selectedLocalId) {
        sendMessage(
          "SceneManager",
          "ReplaceObjectAsset",
          JSON.stringify({
            localId: selectedLocalId,
            asset3DId: newAssetId,
            assetUrl: newAssetUrl,
          })
        );

        setSceneObjects((prev) =>
          prev.map((o) =>
            o.localId === selectedLocalId
              ? { ...o, asset3DId: newAssetId, assetUrl: newAssetUrl }
              : o
          )
        );

        toast({ title: "Đã thay model", description: asset.title || asset.fileName || "" });
        return;
      }

      sendMessage(
        "SceneManager",
        "AddAssetFromUrl",
        JSON.stringify({ asset3DId: newAssetId, assetUrl: newAssetUrl })
      );

      toast({ title: "Đã thêm model vào scene", description: asset.title || asset.fileName || "" });
    } catch (e) {
      console.error("handleAddExistingModel error", e);
    }
  };

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] border-b border-white/10 shadow-lg">
          <div className="flex items-center px-6 py-3">
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

              {/*  CHANGED: nếu có scene thì "Lưu chỉnh sửa" và không mở modal */}
              <Button
                onClick={() => {
                  if (!hasScene) {
                    setSceneDialogMode("DRAFT");
                    setSceneDialogOpen(true);
                    return;
                  }
                  setSceneDialogMode("DRAFT");
                  requestExportAndUpdate("DRAFT");
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white flex items-center gap-2"
              >
                {hasScene ? "Lưu chỉnh sửa" : "Lưu"}
              </Button>

              {/*  CHANGED: nếu có scene thì "Publish chỉnh sửa" và không mở modal */}
              <Button
                onClick={() => {
                  if (!hasScene) {
                    setSceneDialogMode("PUBLISHED");
                    setSceneDialogOpen(true);
                    return;
                  }
                  setSceneDialogMode("PUBLISHED");
                  requestExportAndUpdate("PUBLISHED");
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />{" "}
                {hasScene ? "Publish chỉnh sửa" : "Publish"}
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
                previewQuizInUnity(quizId);
              }}
              onPreviewQuiz={(quizId) => {
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
            onUnselect={() => {
              if (!selectedObject) return;
              try {
                // Xóa object khỏi Unity theo localId
                sendMessage("SceneManager", "RemoveObject", selectedObject.localId);
              } catch (e) { }

              // Xóa luôn khỏi state React (tránh UI lag)
              setSceneObjects((prev) =>
                prev.filter((x) => x.localId !== selectedObject.localId)
              );
              setSelectedLocalId(null);
            }}
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

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`absolute z-50 top-4 h-9 w-9 rounded-full bg-[#0b1220]/70 backdrop-blur border border-white/10 text-white hover:bg-white/10 transition-all ${sidebarOpen ? "left-64 -translate-x-1/2" : "left-2 translate-x-0"
          }`}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
}

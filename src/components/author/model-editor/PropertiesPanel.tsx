// src/components/author/model-editor/PropertiesPanel.tsx
import { Button } from "@/components/ui/button";

export type SceneObject = {
  localId: string;
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
};

type PropertiesPanelProps = {
  selectedObject: SceneObject | null;
  onChangeTransform: (
    localId: string,
    transform: Partial<SceneObject>
  ) => void;
  onUnselect: () => void;
};

export default function PropertiesPanel({
  selectedObject,
  onChangeTransform,
  onUnselect,
}: PropertiesPanelProps) {
  if (!selectedObject) {
    return (
      <aside className="w-80 bg-[#0f172a] border-l border-white/6 p-4 text-white">
        <h3 className="text-sm font-semibold mb-3">Properties</h3>
        <div className="text-gray-400">
          Chọn một object trong scene để chỉnh sửa (Position / Rotation / Scale)
        </div>
      </aside>
    );
  }

  const { localId } = selectedObject;

  return (
    <aside className="w-80 bg-[#0f172a] border-l border-white/6 p-4 text-white">
      <h3 className="text-sm font-semibold mb-3">Properties</h3>

      <div className="space-y-3">
        <div className="text-xs text-gray-300">Asset ID</div>
        <div className="text-sm text-white truncate">
          {selectedObject.asset3DId ?? "local:" + selectedObject.localId}
        </div>

        <div className="border-t border-white/6 pt-3">
          <div className="text-xs text-gray-300 mb-1">Position</div>
          <div className="grid grid-cols-3 gap-2">
            {(["posX", "posY", "posZ"] as const).map((key) => (
              <input
                key={key}
                className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                type="number"
                step="0.01"
                value={selectedObject[key] ?? 0}
                onChange={(e) =>
                  onChangeTransform(localId, {
                    [key]: Number(e.target.value),
                  } as any)
                }
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/6 pt-3">
          <div className="text-xs text-gray-300 mb-1">
            Rotation (deg)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["rotX", "rotY", "rotZ"] as const).map((key) => (
              <input
                key={key}
                className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                type="number"
                step="1"
                value={selectedObject[key] ?? 0}
                onChange={(e) =>
                  onChangeTransform(localId, {
                    [key]: Number(e.target.value),
                  } as any)
                }
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/6 pt-3">
          <div className="text-xs text-gray-300 mb-1">Scale</div>
          <div className="grid grid-cols-3 gap-2">
            {(["scaleX", "scaleY", "scaleZ"] as const).map((key) => (
              <input
                key={key}
                className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                type="number"
                step="0.01"
                value={selectedObject[key] ?? 1}
                onChange={(e) =>
                  onChangeTransform(localId, {
                    [key]: Number(e.target.value),
                  } as any)
                }
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onUnselect}
            className="text-white"
          >
            Unselect
          </Button>
        </div>
      </div>
    </aside>
  );
}

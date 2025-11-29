// src/components/author/model-editor/PropertiesPanel.tsx
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

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

  // temp string values to allow free typing (partial numbers) before committing
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedObject) {
      setTempValues({});
      return;
    }
    const init: Record<string, string> = {};
    ([
      "posX",
      "posY",
      "posZ",
      "rotX",
      "rotY",
      "rotZ",
      "scaleX",
      "scaleY",
      "scaleZ",
    ] as const).forEach((k) => {
      const val = (selectedObject as any)[k];
      init[k] =
        val === undefined || val === null
          ? k.startsWith("scale")
            ? "1"
            : "0"
          : String(val);
    });
    setTempValues(init);
  }, [selectedObject]);

  const handleTempChange = (key: string, v: string) => {
    setTempValues((prev) => ({ ...prev, [key]: v }));
  };

  const commitValue = (key: string) => {
    const raw = tempValues[key] ?? "";
    const defaultVal = key.startsWith("scale") ? 1 : 0;
    const parsed = raw.trim() === "" ? defaultVal : Number(raw);
    const final = Number.isFinite(parsed) ? parsed : defaultVal;
    // normalize displayed value
    setTempValues((prev) => ({ ...prev, [key]: String(final) }));
    onChangeTransform(localId, { [key]: final } as any);
  };

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
                value={tempValues[key] ?? String(selectedObject[key] ?? 0)}
                onChange={(e) => handleTempChange(key, e.target.value)}
                onBlur={() => commitValue(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    (e.target as HTMLInputElement).blur();
                }}
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
                value={tempValues[key] ?? String(selectedObject[key] ?? 0)}
                onChange={(e) => handleTempChange(key, e.target.value)}
                onBlur={() => commitValue(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    (e.target as HTMLInputElement).blur();
                }}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/6 pt-3">
          <div className="text-xs text-gray-300 mb-1">Scale</div>
          {/* Recommendation line */}
          <div className="text-xs text-gray-400 mb-2">
            Khuyến nghị: nên đặt Scale xuống dưới 1 để tránh đối tượng quá lớn.
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["scaleX", "scaleY", "scaleZ"] as const).map((key) => (
              <input
                key={key}
                className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                type="number"
                step="0.01"
                value={tempValues[key] ?? String(selectedObject[key] ?? 1)}
                onChange={(e) => handleTempChange(key, e.target.value)}
                onBlur={() => commitValue(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    (e.target as HTMLInputElement).blur();
                }}
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

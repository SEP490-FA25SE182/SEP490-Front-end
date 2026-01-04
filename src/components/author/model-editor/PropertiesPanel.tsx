// src/components/author/model-editor/PropertiesPanel.tsx
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

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
  onChangeTransform: (localId: string, transform: Partial<SceneObject>) => void;
  onUnselect: () => void;

  /** Optional (newer UX) */
  selectedLocalId?: string | null;
  sceneObjects?: SceneObject[];
  onSelectLocalId?: (id: string) => void;

  markerWidthM?: number; // physical width of marker (meters)
  estimatedMaxDim?: number | null; // max dimension of model in its unit (from bbox cache)

  onFitToMarker?: (localId: string) => void;
  onCenterToMarker?: (localId: string) => void;
  onResetTransform?: (localId: string) => void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function numOr(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function PropertiesPanel({
  selectedObject,
  onChangeTransform,
  onUnselect,

  selectedLocalId,
  sceneObjects,
  onSelectLocalId,

  markerWidthM,
  estimatedMaxDim,

  onFitToMarker,
  onCenterToMarker,
  onResetTransform,
}: PropertiesPanelProps) {
  const [showAdvancedScale, setShowAdvancedScale] = useState(false);

  // temp string values to allow free typing before committing
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
            ? "0.3"
            : "0"
          : String(val);
    });

    // uniform scale = max of xyz
    const sx = numOr(selectedObject.scaleX, 0.3);
    const sy = numOr(selectedObject.scaleY, 0.3);
    const sz = numOr(selectedObject.scaleZ, 0.3);
    init["scaleU"] = String(Math.max(sx, sy, sz));

    setTempValues(init);
  }, [selectedObject]);

  const localId = selectedObject?.localId ?? "";

  const targetMaxM = useMemo(() => {
    const w = Number(markerWidthM);
    const safeW = Number.isFinite(w) && w > 0 ? w : 0.08; // fallback 8cm
    return Math.max(0.03, safeW * 0.8); // 80% width, min 3cm
  }, [markerWidthM]);

  const approxRealMaxM = useMemo(() => {
    if (!selectedObject) return null;
    if (!estimatedMaxDim || !Number.isFinite(estimatedMaxDim)) return null;

    const sx = numOr(selectedObject.scaleX, 0.3);
    const sy = numOr(selectedObject.scaleY, 0.3);
    const sz = numOr(selectedObject.scaleZ, 0.3);
    const s = Math.max(sx, sy, sz);

    return estimatedMaxDim * s; // (unit of bbox) * scale -> meters (assumption: bbox unit already meters)
  }, [selectedObject, estimatedMaxDim]);

  const sizeStatus = useMemo(() => {
    if (approxRealMaxM == null) return null;
    if (approxRealMaxM <= targetMaxM * 1.05) return "ok";
    if (approxRealMaxM <= targetMaxM * 1.4) return "warn";
    return "bad";
  }, [approxRealMaxM, targetMaxM]);

  const handleTempChange = (key: string, v: string) => {
    setTempValues((prev) => ({ ...prev, [key]: v }));
  };

  const commitNumber = (key: string, raw: string, fallback: number) => {
    const parsed = raw.trim() === "" ? fallback : Number(raw);
    const final = Number.isFinite(parsed) ? parsed : fallback;
    return final;
  };

  const commitValue = (key: string) => {
    if (!selectedObject) return;

    const raw = tempValues[key] ?? "";
    const fallback =
      key.startsWith("scale") || key === "scaleU" ? 0.3 : 0;

    let final = commitNumber(key, raw, fallback);

    // clamp scale (AR safe)
    if (key.startsWith("scale") || key === "scaleU") {
      final = clamp(final, 0.001, 2.0);
    }

    setTempValues((prev) => ({ ...prev, [key]: String(final) }));

    if (key === "scaleU") {
      // uniform scale -> apply to XYZ
      onChangeTransform(localId, { scaleX: final, scaleY: final, scaleZ: final });
      setTempValues((prev) => ({
        ...prev,
        scaleX: String(final),
        scaleY: String(final),
        scaleZ: String(final),
      }));
      return;
    }

    onChangeTransform(localId, { [key]: final } as any);

    // if user edits any scale axis, keep scaleU updated (best-effort)
    if (key === "scaleX" || key === "scaleY" || key === "scaleZ") {
      const sx = commitNumber("scaleX", tempValues["scaleX"] ?? "0.3", 0.3);
      const sy = commitNumber("scaleY", tempValues["scaleY"] ?? "0.3", 0.3);
      const sz = commitNumber("scaleZ", tempValues["scaleZ"] ?? "0.3", 0.3);
      const u = clamp(Math.max(sx, sy, sz), 0.001, 2.0);
      setTempValues((prev) => ({ ...prev, scaleU: String(u) }));
    }
  };

  // =========================
  // Empty state (no selection)
  // =========================
  if (!selectedObject) {
    return (
      <aside className="w-80 bg-[#0f172a] border-l border-white/6 p-4 text-white">
        <h3 className="text-sm font-semibold mb-3">Properties</h3>

        {sceneObjects?.length ? (
          <>
            <div className="text-xs text-gray-300 mb-2">Scene Objects</div>
            <div className="space-y-1 max-h-[40vh] overflow-auto pr-1">
              {sceneObjects
                .slice()
                .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                .map((o) => {
                  const label = o.asset3DId
                    ? `Asset ${String(o.asset3DId).slice(0, 8)}`
                    : `Local ${o.localId.slice(0, 8)}`;

                  return (
                    <button
                      key={o.localId}
                      className={`w-full text-left px-3 py-2 rounded border text-sm transition ${
                        selectedLocalId === o.localId
                          ? "bg-white/10 border-white/20"
                          : "bg-[#061026] border-white/10 hover:bg-white/5"
                      }`}
                      onClick={() => onSelectLocalId?.(o.localId)}
                    >
                      <div className="text-white">{label}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {o.assetUrl ? o.assetUrl : `localId: ${o.localId}`}
                      </div>
                    </button>
                  );
                })}
            </div>
            <div className="text-gray-400 text-xs mt-3">
              Chọn một object để chỉnh Position / Rotation / Scale.
            </div>
          </>
        ) : (
          <div className="text-gray-400">
            Chọn một object trong scene để chỉnh sửa (Position / Rotation / Scale)
          </div>
        )}
      </aside>
    );
  }

  // =========================
  // Selected state
  // =========================
  return (
    <aside className="w-80 bg-[#0f172a] border-l border-white/6 p-4 text-white">
      <h3 className="text-sm font-semibold mb-3">Properties</h3>

      {/* Quick actions */}
      {(onFitToMarker || onCenterToMarker || onResetTransform) && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onFitToMarker?.(localId)}
            disabled={!onFitToMarker}
          >
            Fit
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onCenterToMarker?.(localId)}
            disabled={!onCenterToMarker}
          >
            Center
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onResetTransform?.(localId)}
            disabled={!onResetTransform}
          >
            Reset
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-300">Asset</div>
          <div className="text-sm text-white truncate">
            {selectedObject.asset3DId ?? `local:${selectedObject.localId}`}
          </div>
        </div>

        {/* AR size hint */}
        <div className="rounded border border-white/10 bg-[#061026] p-3">
          <div className="text-xs text-gray-300 mb-1">AR Safety</div>
          <div className="text-xs text-gray-400">
            Target max ≈{" "}
            <span className="text-gray-200">
              {(targetMaxM * 100).toFixed(1)} cm
            </span>{" "}
            (≈ 80% marker width)
          </div>

          {approxRealMaxM != null ? (
            <div className="text-xs mt-1">
              Model max (ước tính) ≈{" "}
              <span
                className={
                  sizeStatus === "ok"
                    ? "text-emerald-300"
                    : sizeStatus === "warn"
                    ? "text-yellow-300"
                    : "text-red-300"
                }
              >
                {(approxRealMaxM * 100).toFixed(1)} cm
              </span>
            </div>
          ) : (
            <div className="text-xs mt-1 text-gray-500">
              (Chưa đo được kích thước model — CORS hoặc chưa cache bbox)
            </div>
          )}
        </div>

        <div className="border-t border-white/6 pt-3">
          <div className="text-xs text-gray-300 mb-1">Position</div>
          <div className="grid grid-cols-3 gap-2">
            {(["posX", "posY", "posZ"] as const).map((key) => (
              <input
                key={key}
                className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                type="text"
                inputMode="decimal"
                value={tempValues[key] ?? String((selectedObject as any)[key] ?? 0)}
                onChange={(e) => handleTempChange(key, e.target.value)}
                onBlur={() => commitValue(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/6 pt-3">
          <div className="text-xs text-gray-300 mb-1">Rotation (deg)</div>
          <div className="grid grid-cols-3 gap-2">
            {(["rotX", "rotY", "rotZ"] as const).map((key) => (
              <input
                key={key}
                className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                type="text"
                inputMode="decimal"
                value={tempValues[key] ?? String((selectedObject as any)[key] ?? 0)}
                onChange={(e) => handleTempChange(key, e.target.value)}
                onBlur={() => commitValue(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/6 pt-3">
          <div className="text-xs text-gray-300 mb-1">Scale (Uniform)</div>

          <div className="text-xs text-gray-400 mb-2">
            Gợi ý: scale &lt; 1 để tránh model che kín marker khi quét AR.
          </div>

          {/* Uniform scale */}
          <input
            className="w-full p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
            type="text"
            inputMode="decimal"
            value={tempValues["scaleU"] ?? "0.3"}
            onChange={(e) => handleTempChange("scaleU", e.target.value)}
            onBlur={() => commitValue("scaleU")}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />

          <button
            type="button"
            className="mt-2 text-xs text-gray-300 hover:text-white underline underline-offset-2"
            onClick={() => setShowAdvancedScale((v) => !v)}
          >
            {showAdvancedScale ? "Ẩn scale nâng cao (X/Y/Z)" : "Hiện scale nâng cao (X/Y/Z)"}
          </button>

          {showAdvancedScale && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(["scaleX", "scaleY", "scaleZ"] as const).map((key) => (
                <input
                  key={key}
                  className="p-2 bg-[#061026] border border-white/10 rounded text-white text-sm"
                  type="text"
                  inputMode="decimal"
                  value={tempValues[key] ?? String((selectedObject as any)[key] ?? 0.3)}
                  onChange={(e) => handleTempChange(key, e.target.value)}
                  onBlur={() => commitValue(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onUnselect} className="text-white">
            Bỏ chọn
          </Button>
        </div>
      </div>
    </aside>
  );
}

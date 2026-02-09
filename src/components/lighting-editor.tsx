"use client";

import { useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type { Stage as KonvaStage } from "konva/lib/Stage";

type LightingObjectType = "subject" | "camera" | "light";

type LightingObject = {
  id: string;
  type: LightingObjectType;
  x: number;
  y: number;
  rotation: number;
  label: string;
  modifier?: string;
  power?: string;
};

type DiagramJson = {
  version: number;
  canvas: {
    width: number;
    height: number;
    grid: number;
    unit: string;
  };
  objects: LightingObject[];
  notes: string;
};

const CANVAS = {
  width: 980,
  height: 560,
  grid: 40,
} as const;

function defaultDiagram(): DiagramJson {
  return {
    version: 1,
    canvas: {
      width: CANVAS.width,
      height: CANVAS.height,
      grid: CANVAS.grid,
      unit: "px",
    },
    objects: [
      {
        id: "subject_1",
        type: "subject",
        x: 560,
        y: 300,
        rotation: 0,
        label: "Model",
      },
      {
        id: "camera_1",
        type: "camera",
        x: 220,
        y: 320,
        rotation: 10,
        label: "Camera",
      },
      {
        id: "light_1",
        type: "light",
        x: 360,
        y: 220,
        rotation: 25,
        label: "Key",
        modifier: "softbox",
        power: "1/16",
      },
    ],
    notes: "",
  };
}

function parseInitial(input: Record<string, unknown> | null): DiagramJson {
  const fallback = defaultDiagram();
  if (!input) {
    return fallback;
  }
  if (
    typeof input.version !== "number" ||
    typeof input.canvas !== "object" ||
    input.canvas === null ||
    !Array.isArray(input.objects)
  ) {
    return fallback;
  }
  const objects = input.objects.filter((obj): obj is LightingObject => {
    if (!obj || typeof obj !== "object") return false;
    const candidate = obj as Partial<LightingObject>;
    return (
      typeof candidate.id === "string" &&
      (candidate.type === "subject" ||
        candidate.type === "camera" ||
        candidate.type === "light") &&
      typeof candidate.x === "number" &&
      typeof candidate.y === "number" &&
      typeof candidate.rotation === "number" &&
      typeof candidate.label === "string"
    );
  });

  return {
    version: 1,
    canvas: {
      width:
        typeof (input.canvas as { width?: unknown }).width === "number"
          ? ((input.canvas as { width: number }).width ?? fallback.canvas.width)
          : fallback.canvas.width,
      height:
        typeof (input.canvas as { height?: unknown }).height === "number"
          ? ((input.canvas as { height: number }).height ?? fallback.canvas.height)
          : fallback.canvas.height,
      grid: CANVAS.grid,
      unit: "px",
    },
    objects,
    notes: typeof input.notes === "string" ? input.notes : "",
  };
}

function makeId(type: LightingObjectType): string {
  return `${type}_${Math.random().toString(36).slice(2, 8)}`;
}

export function LightingEditor(props: {
  initialDiagram: Record<string, unknown> | null;
  onSave: (diagram: DiagramJson) => Promise<void>;
  onExportPng: (dataUrl: string) => Promise<void>;
}) {
  const initial = useMemo(() => parseInitial(props.initialDiagram), [props.initialDiagram]);
  const [objects, setObjects] = useState<LightingObject[]>(initial.objects);
  const [notes, setNotes] = useState<string>(initial.notes);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.objects[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<KonvaStage | null>(null);

  const selected = useMemo(
    () => objects.find((item) => item.id === selectedId) ?? null,
    [objects, selectedId],
  );

  function updateObject(
    id: string,
    updater: (current: LightingObject) => LightingObject,
  ) {
    setObjects((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return updater(item);
      }),
    );
  }

  function addObject(type: LightingObjectType) {
    const next: LightingObject = {
      id: makeId(type),
      type,
      x: 500,
      y: 280,
      rotation: 0,
      label:
        type === "subject" ? "Model" : type === "camera" ? "Camera" : "Light",
      modifier: type === "light" ? "softbox" : undefined,
      power: type === "light" ? "1/16" : undefined,
    };
    setObjects((prev) => [...prev, next]);
    setSelectedId(next.id);
  }

  async function saveDiagram() {
    setSaving(true);
    setError(null);
    try {
      await props.onSave({
        version: 1,
        canvas: {
          width: CANVAS.width,
          height: CANVAS.height,
          grid: CANVAS.grid,
          unit: "px",
        },
        objects,
        notes,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function exportPng() {
    setExporting(true);
    setError(null);
    try {
      const stage = stageRef.current;
      if (!stage) {
        throw new Error("キャンバスを取得できませんでした。");
      }
      const dataUrl = stage.toDataURL({
        mimeType: "image/png",
        pixelRatio: 2,
      });
      await props.onExportPng(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PNG書き出しに失敗しました。");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="split">
      <div className="panel overflow-x-auto p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <button className="btn-outline text-sm" type="button" onClick={() => addObject("subject")}>
            被写体を追加
          </button>
          <button className="btn-outline text-sm" type="button" onClick={() => addObject("camera")}>
            カメラを追加
          </button>
          <button className="btn-outline text-sm" type="button" onClick={() => addObject("light")}>
            ライトを追加
          </button>
        </div>
        <Stage
          width={CANVAS.width}
          height={CANVAS.height}
          ref={(instance) => {
            stageRef.current = instance;
          }}
          onMouseDown={(event) => {
            if (event.target === event.target.getStage()) {
              setSelectedId(null);
            }
          }}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <Layer>
            {Array.from({ length: CANVAS.width / CANVAS.grid }).map((_, idx) => (
              <Line
                key={`vx-${idx}`}
                points={[idx * CANVAS.grid, 0, idx * CANVAS.grid, CANVAS.height]}
                stroke="#eee5d9"
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: CANVAS.height / CANVAS.grid }).map((_, idx) => (
              <Line
                key={`hz-${idx}`}
                points={[0, idx * CANVAS.grid, CANVAS.width, idx * CANVAS.grid]}
                stroke="#eee5d9"
                strokeWidth={1}
              />
            ))}

            {objects.map((obj) => (
              <Group
                key={obj.id}
                x={obj.x}
                y={obj.y}
                rotation={obj.rotation}
                draggable
                onClick={() => setSelectedId(obj.id)}
                onTap={() => setSelectedId(obj.id)}
                onDragEnd={(event) => {
                  updateObject(obj.id, (current) => ({
                    ...current,
                    x: event.target.x(),
                    y: event.target.y(),
                  }));
                }}
              >
                {obj.type === "subject" ? (
                  <>
                    <Circle
                      radius={30}
                      fill={selectedId === obj.id ? "#ffd7bf" : "#fce6d8"}
                      stroke="#d27b4f"
                      strokeWidth={2}
                    />
                    <Text text="被写体" x={-20} y={-7} fontSize={12} fill="#6d3218" />
                  </>
                ) : null}

                {obj.type === "camera" ? (
                  <>
                    <Rect
                      x={-22}
                      y={-15}
                      width={44}
                      height={30}
                      cornerRadius={8}
                      fill={selectedId === obj.id ? "#dbeaf8" : "#e8f1fa"}
                      stroke="#4074a8"
                      strokeWidth={2}
                    />
                    <Circle x={0} y={0} radius={7} fill="#4e84ba" />
                  </>
                ) : null}

                {obj.type === "light" ? (
                  <>
                    <Rect
                      x={-18}
                      y={-18}
                      width={36}
                      height={36}
                      fill={selectedId === obj.id ? "#fff0b8" : "#fff5cf"}
                      stroke="#b08500"
                      strokeWidth={2}
                    />
                    <Line points={[-18, 18, 0, 36, 18, 18]} stroke="#b08500" strokeWidth={2} />
                  </>
                ) : null}

                <Text text={obj.label} y={30} x={-35} width={70} align="center" fontSize={12} fill="#293747" />
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>

      <aside className="space-y-3">
        <div className="panel space-y-3 p-4">
          <h3 className="text-base font-bold">オブジェクト設定</h3>
          {!selected ? (
            <p className="muted text-sm">キャンバス上のオブジェクトを選択してください。</p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold">ラベル</label>
                <input
                  className="input"
                  value={selected.label}
                  onChange={(event) =>
                    updateObject(selected.id, (current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">回転</label>
                <input
                  className="input"
                  type="number"
                  value={selected.rotation}
                  onChange={(event) =>
                    updateObject(selected.id, (current) => ({
                      ...current,
                      rotation: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              {selected.type === "light" ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">モディファイア</label>
                    <input
                      className="input"
                      value={selected.modifier ?? ""}
                      onChange={(event) =>
                        updateObject(selected.id, (current) => ({
                          ...current,
                          modifier: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">出力</label>
                    <input
                      className="input"
                      value={selected.power ?? ""}
                      onChange={(event) =>
                        updateObject(selected.id, (current) => ({
                          ...current,
                          power: event.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>

        <div className="panel space-y-2 p-4">
          <label className="block text-xs font-semibold">メモ</label>
          <textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} />
          {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary text-sm" type="button" onClick={saveDiagram} disabled={saving}>
              {saving ? "保存中..." : "図面を保存"}
            </button>
            <button className="btn-outline text-sm" type="button" onClick={exportPng} disabled={exporting}>
              {exporting ? "書き出し中..." : "PNGを書き出し"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

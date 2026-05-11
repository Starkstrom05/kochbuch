"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Point = { x: number; y: number; pressure: number };
type Stroke = Point[];

type Tool = "pen" | "eraser";

type Props = {
  width?: number;
  height?: number;
  onSave?: (blob: Blob) => void;
  className?: string;
};

// ── Catmull-Rom smoothing ─────────────────────────────────────────────────────

function catmullRomPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): { x: number; y: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function drawSmoothedStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  tool: Tool,
  inkColor: string,
) {
  if (stroke.length < 2) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = inkColor;
  }

  if (stroke.length === 2) {
    const minW = tool === "eraser" ? 16 : 1.2;
    const maxW = tool === "eraser" ? 32 : 6;
    ctx.lineWidth = minW + (maxW - minW) * ((stroke[0].pressure + stroke[1].pressure) / 2);
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    ctx.lineTo(stroke[1].x, stroke[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Catmull-Rom with pressure-based width
  const pts = stroke;
  const steps = 8;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      const pos0 = catmullRomPoint(p0, p1, p2, p3, t0);
      const pos1 = catmullRomPoint(p0, p1, p2, p3, t1);

      const pressure = p1.pressure + (p2.pressure - p1.pressure) * t0;
      const minW = tool === "eraser" ? 16 : 1.2;
      const maxW = tool === "eraser" ? 32 : 6;
      const lineWidth = minW + (maxW - minW) * pressure;

      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(pos0.x, pos0.y);
      ctx.lineTo(pos1.x, pos1.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HandwritingCanvas({ width, height, onSave, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [tool, setTool] = useState<Tool>("pen");
  const [inkColor, setInkColor] = useState("#1A1008");
  const [canUndo, setCanUndo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mutable refs (avoid re-renders during draw)
  const currentStroke = useRef<Stroke>([]);
  const isDrawing = useRef(false);
  const undoStack = useRef<ImageData[]>([]);

  // ── Canvas sizing ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = width ?? container.clientWidth;
    const h = height ?? Math.min(container.clientHeight, window.innerHeight * 0.6);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Warm paper background
    ctx.fillStyle = "#FBF6E9";
    ctx.fillRect(0, 0, w, h);
  }, [width, height]);

  // ── Pointer helpers ───────────────────────────────────────────────────────

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = (canvas.width / dpr) / rect.width;
    const scaleY = (canvas.height / dpr) / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      // Apple Pencil: pressure 0–1; mouse: always 0.5
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }

  function saveUndo() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    undoStack.current.push(
      ctx.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr),
    );
    if (undoStack.current.length > 30) undoStack.current.shift();
    setCanUndo(true);
  }

  // ── Draw handlers ─────────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.pointerType === "touch" && e.isPrimary === false) return; // pinch-zoom
    saveUndo();
    isDrawing.current = true;
    currentStroke.current = [getCanvasPoint(e)];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const pt = getCanvasPoint(e);
    currentStroke.current.push(pt);

    // Redraw only the last segment for performance (not the full stroke)
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const stroke = currentStroke.current;

    // Draw from the last saved point to the new point
    drawSmoothedStroke(
      ctx,
      stroke.slice(Math.max(0, stroke.length - 4)),
      tool,
      inkColor,
    );
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Final pass: redraw entire stroke cleanly
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    if (undoStack.current.length > 0) {
      const saved = undoStack.current[undoStack.current.length - 1];
      ctx.putImageData(saved, 0, 0);
    }
    drawSmoothedStroke(ctx, currentStroke.current, tool, inkColor);
    currentStroke.current = [];
  }

  // ── Undo ─────────────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const prev = undoStack.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    setCanUndo(undoStack.current.length > 0);
  }, []);

  // ── Clear ────────────────────────────────────────────────────────────────

  const clear = useCallback(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    saveUndo();
    ctx.fillStyle = "#FBF6E9";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────

  const save = useCallback(() => {
    const canvas = canvasRef.current!;
    setIsSaving(true);
    canvas.toBlob(
      (blob) => {
        setIsSaving(false);
        if (blob) onSave?.(blob);
      },
      "image/png",
    );
  }, [onSave]);

  // Keyboard shortcut: Ctrl+Z
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // ── Color presets ─────────────────────────────────────────────────────────

  const INK_COLORS = [
    { label: "Tinte", value: "#1A1008" },
    { label: "Blau", value: "#1A3A6E" },
    { label: "Rot", value: "#A23E2E" },
    { label: "Grün", value: "#2E6E3A" },
  ];

  return (
    <div ref={containerRef} className={`flex h-full flex-col gap-3 ${className ?? ""}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-sm bg-paper-100 px-4 py-2 ring-1 ring-paper-300">
        {/* Tool */}
        <div className="flex gap-1">
          {(["pen", "eraser"] as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              title={t === "pen" ? "Stift" : "Radierer"}
              className={`rounded-sm px-3 py-1.5 font-written text-sm transition-colors ${
                tool === t
                  ? "bg-ribbon text-paper-50"
                  : "text-ink-faded hover:bg-paper-200"
              }`}
            >
              {t === "pen" ? "✒️ Stift" : "⬜ Radierer"}
            </button>
          ))}
        </div>

        {/* Ink color */}
        {tool === "pen" && (
          <div className="flex items-center gap-2">
            {INK_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setInkColor(c.value)}
                title={c.label}
                className="h-6 w-6 rounded-full ring-2 ring-offset-1 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.value,
                  outlineOffset: "2px",
                  outline: inkColor === c.value ? "2px solid #A23E2E" : "2px solid transparent",
                }}
              />
            ))}
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="rounded-sm px-3 py-1.5 font-written text-sm text-ink-faded hover:bg-paper-200 disabled:opacity-30"
          >
            ↩ Zurück
          </button>
          <button
            onClick={clear}
            className="rounded-sm px-3 py-1.5 font-written text-sm text-ink-faded hover:bg-paper-200"
          >
            Leeren
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden rounded-sm ring-1 ring-paper-300">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          // Prevent scroll/zoom on iPad while drawing
          style={{ touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
          className="block"
        />
      </div>

      {/* Save */}
      {onSave && (
        <button
          onClick={save}
          disabled={isSaving}
          className="self-end rounded-sm bg-ribbon px-6 py-2 font-hand text-xl text-paper-50 shadow-sm disabled:opacity-60 hover:rotate-[-0.5deg]"
        >
          {isSaving ? "Speichert…" : "Notiz speichern"}
        </button>
      )}
    </div>
  );
}

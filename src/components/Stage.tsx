import type { RefObject } from "react";

interface Props {
  filterRef: RefObject<HTMLCanvasElement>;
  simRef: RefObject<HTMLCanvasElement>;
  kind: "filter" | "sim";
  aspect: number;
  error: string | null;
  fps: number;
  name: string;
  handlers: {
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
  };
}

// Two canvases share the stage; only the active engine's canvas is shown, so the
// filter Renderer and the sim SimRenderer each keep their own GL context without
// conflict. Pointer events feed the shared Pointer used by both.
export function Stage({ filterRef, simRef, kind, aspect, error, fps, name, handlers }: Props) {
  const ar = String(aspect);
  return (
    <div className="stage" {...handlers}>
      <canvas ref={filterRef} style={{ aspectRatio: ar, display: kind === "filter" ? "block" : "none" }} />
      <canvas ref={simRef} style={{ aspectRatio: ar, display: kind === "sim" ? "block" : "none" }} />
      <div className="hud">
        {name.toUpperCase()} — {fps} FPS{kind === "sim" ? " · DRAG TO DISTURB" : ""}
      </div>
      {error && <pre className="err">SHADER COMPILE ERROR{"\n\n"}{error}</pre>}
    </div>
  );
}

import type { RefObject } from "react";

interface Props {
  canvasRef: RefObject<HTMLCanvasElement>;
  aspect: number;
  error: string | null;
  fps: number;
  name: string;
  onPointerMove: (e: React.PointerEvent) => void;
}

export function Stage({ canvasRef, aspect, error, fps, name, onPointerMove }: Props) {
  return (
    <div className="stage" onPointerMove={onPointerMove}>
      <canvas ref={canvasRef} style={{ aspectRatio: String(aspect) }} />
      <div className="hud">{name.toUpperCase()} — {fps} FPS</div>
      {error && <pre className="err">SHADER COMPILE ERROR{"\n\n"}{error}</pre>}
    </div>
  );
}

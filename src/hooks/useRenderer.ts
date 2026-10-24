import { useEffect, useRef, useState, type RefObject } from "react";
import { Renderer } from "../gl/renderer";
import type { ParamDef, ParamState } from "../filters/types";
import type { Pointer } from "../lib/pointer";

// Drives the single-pass filter Renderer. Reads param state + pointer through
// refs so the rAF loop never closes over stale values. `active` gates drawing so
// the off-screen canvas costs nothing while a sim is showing.
export function useRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  core: string | undefined,
  params: ParamDef[] | undefined,
  stateRef: RefObject<ParamState>,
  pointerRef: RefObject<Pointer>,
  source: TexImageSource | null,
  active: boolean,
) {
  const ref = useRef<Renderer | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let r: Renderer;
    try {
      r = new Renderer(cv);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    ref.current = r;
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const t0 = performance.now();
    const loop = () => {
      if (activeRef.current) {
        const now = performance.now();
        r.render((now - t0) / 1000, stateRef.current ?? {}, pointerRef.current!.pos);
        frames++;
        if (now - last > 500) {
          setFps(Math.round((frames * 1000) / (now - last)));
          frames = 0;
          last = now;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      r.dispose();
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ref.current && core) setError(ref.current.setCore(core, params ?? []));
  }, [core, params]);

  useEffect(() => {
    if (ref.current && source) ref.current.setImage(source);
  }, [source]);

  return { error, fps };
}

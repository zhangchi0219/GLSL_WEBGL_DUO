import { useEffect, useRef, useState, type RefObject } from "react";
import { SimRenderer } from "../gl/simRenderer";
import type { ParamState } from "../filters/types";
import type { SimModule } from "../sims/types";
import type { Pointer } from "../lib/pointer";

// Drives the stateful multi-pass SimRenderer. Same gating contract as
// useRenderer: refs for live values, `active` to pause when off-screen.
export function useSimRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  mod: SimModule | null,
  stateRef: RefObject<ParamState>,
  pointerRef: RefObject<Pointer>,
  source: TexImageSource | null,
  active: boolean,
) {
  const ref = useRef<SimRenderer | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let r: SimRenderer;
    try {
      r = new SimRenderer(cv);
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
        r.render((now - t0) / 1000, stateRef.current ?? {}, pointerRef.current!);
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
    if (ref.current && mod) setError(ref.current.setModule(mod));
  }, [mod]);

  useEffect(() => {
    if (ref.current && source) ref.current.setImage(source);
  }, [source]);

  return { error, fps };
}

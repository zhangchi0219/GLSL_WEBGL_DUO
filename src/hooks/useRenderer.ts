import { useEffect, useRef, useState, type RefObject } from "react";
import { Renderer } from "../gl/renderer";
import { makeTestCard } from "../lib/testCard";
import type { ParamDef, ParamState } from "../filters/types";

// Owns the Renderer lifecycle + the rAF loop. Reads param state through a ref so
// the loop never closes over stale React state. Recompiles when the core changes.
export function useRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  core: string | undefined,
  params: ParamDef[] | undefined,
  stateRef: RefObject<ParamState>,
) {
  const rendererRef = useRef<Renderer | null>(null);
  const mouse = useRef<[number, number]>([0.5, 0.5]);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [aspect, setAspect] = useState(16 / 9);

  // init once: create renderer, load the default test card, start the loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    rendererRef.current = renderer;
    renderer.setImage(makeTestCard());
    setAspect(renderer.imgAspect);

    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const t0 = performance.now();
    const loop = () => {
      const now = performance.now();
      renderer.render((now - t0) / 1000, stateRef.current ?? {}, mouse.current);
      frames++;
      if (now - last > 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recompile when the active core changes
  useEffect(() => {
    if (!rendererRef.current || !core) return;
    setError(rendererRef.current.setCore(core, params ?? []));
  }, [core, params]);

  const setImage = (img: TexImageSource) => {
    rendererRef.current?.setImage(img);
    if (rendererRef.current) setAspect(rendererRef.current.imgAspect);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    mouse.current = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  };

  return { error, fps, aspect, setImage, onPointerMove };
}

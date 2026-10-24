import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Renderer } from "../gl/renderer";
import { SimRenderer } from "../gl/simRenderer";
import { ShaderBuildError, type PreviewQuality, type ShaderDiagnostic } from "../gl/program";
import type { Pointer } from "../lib/pointer";
import { isFilter, signature, validateParams, type ShaderModule, type WorkspaceProject } from "../workspace/model";

interface Options {
  project: WorkspaceProject | null;
  filterCanvas: RefObject<HTMLCanvasElement>;
  simCanvas: RefObject<HTMLCanvasElement>;
  source: TexImageSource | null;
  pointer: RefObject<Pointer>;
  paused: boolean;
  quality: PreviewQuality;
  onCommit: (id: string, module: ShaderModule) => void;
}
export function useWorkspaceRenderer(options: Options) {
  const live = useRef(options); live.current = options;
  const engine = useRef<Renderer | SimRenderer | null>(null);
  const moduleRef = useRef<ShaderModule | null>(null);
  const redraw = useRef<() => void>(() => {});
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState("—");
  const [ready, setReady] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const report = useCallback((error: unknown) => {
    setDiagnostics(error instanceof ShaderBuildError ? error.diagnostics : [{ message: error instanceof Error ? error.message : String(error) }]);
  }, []);
  const compile = useCallback((module: ShaderModule): boolean => {
    const current = engine.current;
    if (!current) { report(new Error("渲染器尚未就绪。 ")); return false; }
    try {
      const problem = validateParams(module.params);
      if (problem) throw new Error(problem);
      if (signature(moduleRef.current) !== signature(module)) {
        if (current instanceof Renderer && isFilter(module)) current.compileCore(module.core, module.params);
        else if (current instanceof SimRenderer && !isFilter(module)) current.compileModule(module);
        else throw new Error("模块与渲染器类型不匹配。 ");
        moduleRef.current = module;
      }
      setAnimated(current instanceof SimRenderer || !!module.meta.animated || (current instanceof Renderer && current.animated));
      setDiagnostics([]);
      redraw.current();
      return true;
    } catch (error) { report(error); return false; }
  }, [report]);

  useEffect(() => {
    const project = live.current.project;
    if (!project) return;
    const canvas = project.kind === "filter" ? live.current.filterCanvas.current : live.current.simCanvas.current;
    if (!canvas) return;
    let disposed = false, lost = false, raf = 0, last = performance.now(), time = 0, samples = 0, sampleStart = last;
    let dirty = true;
    setReady(false); setRuntimeError(null); setDiagnostics([]); setFps(0);
    const paint = () => { dirty = true; schedule(); };
    const create = () => {
      try {
        engine.current = project.kind === "filter" ? new Renderer(canvas) : new SimRenderer(canvas);
        moduleRef.current = null;
        const builtin = live.current.project?.source.kind === "builtin";
        engine.current.setGradient(builtin);
        if (!builtin && live.current.source) engine.current.setImage(live.current.source);
        const module = live.current.project!.compiled ?? live.current.project!.draft;
        if (compile(module) && !live.current.project!.compiled) live.current.onCommit(project.id, module);
        setReady(true); setRuntimeError(null);
        dirty = true; last = performance.now(); sampleStart = last; samples = 0;
      } catch (error) { setRuntimeError(error instanceof Error ? error.message : String(error)); }
    };
    const frame = (now: number) => {
      raf = 0;
      if (disposed || lost || document.hidden || !engine.current) return;
      if (!canvas.getClientRects().length || !canvas.clientWidth || !canvas.clientHeight) { last = NaN; setFps(0); return; }
      const current = live.current;
      const delta = Number.isFinite(last) ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      if (!current.paused) time += delta;
      const continuous = !current.paused && (project.kind === "sim" || (!!moduleRef.current?.meta.animated || (engine.current instanceof Renderer && engine.current.animated)));
      if (dirty || continuous) {
        try {
          engine.current.quality = current.quality;
          if (engine.current instanceof Renderer) engine.current.render(time, current.project!.values, current.pointer.current!.pos);
          else engine.current.render(time, current.project!.values, current.pointer.current!, current.paused);
          samples++;
          if (now - sampleStart >= 500) {
            setFps(continuous ? Math.round(samples * 1000 / (now - sampleStart)) : 0);
            setResolution(`${canvas.width} × ${canvas.height}`);
            samples = 0; sampleStart = now;
          }
          if (dirty) setResolution(`${canvas.width} × ${canvas.height}`);
          dirty = false;
        } catch (error) { setRuntimeError(error instanceof Error ? error.message : String(error)); return; }
      }
      if (continuous) schedule();
    };
    function schedule() { if (!raf && !disposed && !lost && !document.hidden) raf = requestAnimationFrame(frame); }
    redraw.current = paint;
    const visibility = () => {
      cancelAnimationFrame(raf); raf = 0; last = performance.now(); sampleStart = last; samples = 0;
      if (document.hidden) { setFps(0); currentPointerReset(); } else paint();
    };
    const currentPointerReset = () => { if (live.current.pointer.current) { live.current.pointer.current.down = false; live.current.pointer.current.vel = [0, 0]; } };
    const contextLost = (event: Event) => {
      event.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; setReady(false); setFps(0);
      setRuntimeError("WebGL 上下文丢失，等待浏览器恢复…");
    };
    const contextRestored = () => { lost = false; engine.current?.dispose(); engine.current = null; create(); paint(); };
    const observer = new ResizeObserver(paint); observer.observe(canvas);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    canvas.addEventListener("pointermove", paint);
    document.addEventListener("visibilitychange", visibility);
    create(); schedule();
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); currentPointerReset();
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      canvas.removeEventListener("pointermove", paint);
      document.removeEventListener("visibilitychange", visibility);
      engine.current?.dispose(); engine.current = null; moduleRef.current = null;
      redraw.current = () => {};
    };
  }, [options.project?.id, options.project?.kind, compile, retryCount]);

  useEffect(() => {
    if (!options.source || !engine.current) return;
    try {
      const builtin = options.project?.source.kind === "builtin";
      engine.current.setGradient(builtin);
      if (!builtin) engine.current.setImage(options.source);
      setAnimated(engine.current instanceof SimRenderer || !!moduleRef.current?.meta.animated || (engine.current instanceof Renderer && engine.current.animated));
      setRuntimeError(null); redraw.current();
    }
    catch (error) { setRuntimeError(error instanceof Error ? error.message : String(error)); }
  }, [options.source]);
  useEffect(() => { setFps(0); redraw.current(); }, [options.paused, options.quality, options.project?.values]);
  const resetSimulation = useCallback(() => { if (engine.current instanceof SimRenderer) { engine.current.reset(); redraw.current(); } }, []);
  const retry = useCallback(() => { setRetryCount((count) => count + 1); }, []);
  return { compile, diagnostics, runtimeError, fps, resolution, ready, animated, resetSimulation, retry };
}

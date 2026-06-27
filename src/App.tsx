import { useEffect, useMemo, useRef, useState } from "react";
import { registry } from "./filters/registry";
import { defaultState, type FilterModule, type ParamState } from "./filters/types";
import { REGION_PARAMS } from "./gl/regionMask";
import type { SimModule } from "./sims/types";
import { wrapTD, simBundle } from "./td/wrapper";
import { useRenderer } from "./hooks/useRenderer";
import { useSimRenderer } from "./hooks/useSimRenderer";
import { Sidebar } from "./components/Sidebar";
import { Stage } from "./components/Stage";
import { ParamPanel } from "./components/ParamPanel";
import { makeTestCard, downloadText } from "./lib/testCard";
import { makePointer, pointerHandlers, type Pointer } from "./lib/pointer";

export default function App() {
  const [activeId, setActiveId] = useState(registry[0].id);
  const entry = registry.find((r) => r.id === activeId)!;
  const kind = entry.kind;

  const [filterMod, setFilterMod] = useState<FilterModule | null>(null);
  const [simMod, setSimMod] = useState<SimModule | null>(null);
  const [state, setState] = useState<ParamState>({});
  const stateRef = useRef<ParamState>(state);
  stateRef.current = state;

  const pointerRef = useRef<Pointer>(makePointer());
  const handlers = useMemo(() => pointerHandlers(pointerRef.current), []);

  const [source, setSource] = useState<TexImageSource>(() => makeTestCard());
  const [aspect, setAspect] = useState(16 / 9);
  useEffect(() => {
    const a = source as { width?: number; height?: number; videoWidth?: number; videoHeight?: number };
    const w = a.width || a.videoWidth;
    const h = a.height || a.videoHeight;
    if (w && h) setAspect(w / h);
  }, [source]);

  // every filter gets the shared two-box effect mask appended to its own params
  const filterParams = filterMod ? [...filterMod.params, ...REGION_PARAMS] : undefined;

  const filterCanvas = useRef<HTMLCanvasElement>(null);
  const simCanvas = useRef<HTMLCanvasElement>(null);
  const fr = useRenderer(filterCanvas, filterMod?.core, filterParams, stateRef, pointerRef, source, kind === "filter");
  const sr = useSimRenderer(simCanvas, simMod, stateRef, pointerRef, source, kind === "sim");

  // load the active module, reset params to defaults
  useEffect(() => {
    let alive = true;
    const e = registry.find((r) => r.id === activeId)!;
    e.load().then((m) => {
      if (!alive) return;
      if (e.kind === "filter") setFilterMod(m as FilterModule);
      else setSimMod(m as SimModule);
      const loaded = (m as FilterModule | SimModule).params;
      setState(defaultState(e.kind === "filter" ? [...loaded, ...REGION_PARAMS] : loaded));
    });
    return () => {
      alive = false;
    };
  }, [activeId]);

  const meta = kind === "filter" ? filterMod?.meta : simMod?.meta;
  const params = (kind === "filter" ? filterParams : simMod?.params) ?? [];
  const error = (kind === "filter" ? fr.error : sr.error) ?? null;
  const fps = kind === "filter" ? fr.fps : sr.fps;

  const onParam = (name: string, value: number | number[] | boolean) =>
    setState((s) => ({ ...s, [name]: value }));
  const onReset = () => setState(defaultState(params));
  const onDownload = () => {
    if (kind === "filter" && filterMod) downloadText(`${filterMod.meta.id}_td.glsl`, wrapTD(filterMod));
    else if (kind === "sim" && simMod) downloadText(`${simMod.meta.id}_td_kernels.txt`, simBundle(simMod));
  };

  return (
    <div className="shell">
      <Sidebar activeId={activeId} onSelect={setActiveId} onImage={setSource} fps={fps} />

      <main className="content">
        <header className="content-head">
          <span className="title">{meta?.name ?? "…"}</span>
          <div className="head-actions">
            <button className="btn btn-ghost" onClick={onReset}>Reset</button>
            <button className="btn btn-ink" onClick={onDownload}>
              {kind === "sim" ? "Download TD kernels ↓" : "Download .glsl for TD ↓"}
            </button>
          </div>
        </header>

        <Stage
          filterRef={filterCanvas}
          simRef={simCanvas}
          kind={kind}
          aspect={aspect}
          error={error}
          fps={fps}
          name={meta?.name ?? "filter"}
          handlers={handlers}
        />
      </main>

      <ParamPanel params={params} state={state} desc={meta?.desc} onChange={onParam} />
    </div>
  );
}

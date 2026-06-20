import { useEffect, useRef, useState } from "react";
import { registry } from "./filters/registry";
import { defaultState, type FilterModule, type ParamState } from "./filters/types";
import { wrapTD } from "./td/wrapper";
import { useRenderer } from "./hooks/useRenderer";
import { Sidebar } from "./components/Sidebar";
import { Stage } from "./components/Stage";
import { ParamPanel } from "./components/ParamPanel";
import { downloadText } from "./lib/testCard";

export default function App() {
  const [activeId, setActiveId] = useState(registry[0].id);
  const [mod, setMod] = useState<FilterModule | null>(null);
  const [state, setState] = useState<ParamState>({});

  // mirror state into a ref so the rAF render loop reads fresh values
  const stateRef = useRef<ParamState>(state);
  stateRef.current = state;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { error, fps, aspect, setImage, onPointerMove } = useRenderer(
    canvasRef,
    mod?.core,
    mod?.params,
    stateRef,
  );

  // load the active filter module, reset params to its defaults
  useEffect(() => {
    let alive = true;
    const entry = registry.find((r) => r.id === activeId)!;
    entry.load().then((m) => {
      if (!alive) return;
      setMod(m);
      setState(defaultState(m.params));
    });
    return () => {
      alive = false;
    };
  }, [activeId]);

  const onParam = (name: string, value: number | number[] | boolean) =>
    setState((s) => ({ ...s, [name]: value }));

  const onReset = () => {
    if (mod) setState(defaultState(mod.params));
  };

  const onDownloadTD = () => {
    if (mod) downloadText(`${mod.meta.id}_td.glsl`, wrapTD(mod));
  };

  return (
    <div className="shell">
      <Sidebar activeId={activeId} onSelect={setActiveId} onImage={setImage} fps={fps} />

      <main className="content">
        <header className="content-head">
          <span className="title">{mod?.meta.name ?? "…"}</span>
          <div className="head-actions">
            <button className="btn btn-ghost" onClick={onReset}>Reset</button>
            <button className="btn btn-ink" onClick={onDownloadTD}>Download .glsl for TD ↓</button>
          </div>
        </header>

        <Stage
          canvasRef={canvasRef}
          aspect={aspect}
          error={error}
          fps={fps}
          name={mod?.meta.name ?? "filter"}
          onPointerMove={onPointerMove}
        />
      </main>

      <ParamPanel
        params={mod?.params ?? []}
        state={state}
        desc={mod?.meta.desc}
        onChange={onParam}
      />
    </div>
  );
}

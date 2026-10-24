import type { RefObject } from "react";
import { Icon } from "./Icon";
import type { pointerHandlers } from "../lib/pointer";
interface Props {
  filterRef: RefObject<HTMLCanvasElement>; simRef: RefObject<HTMLCanvasElement>; kind: "filter" | "sim";
  handlers: ReturnType<typeof pointerHandlers>; loading: boolean; error: string | null; onRetry: () => void;
}
export function Stage({ filterRef, simRef, kind, handlers, loading, error, onRetry }: Props) {
  return <div className="stage" data-kind={kind}>
    <div className="canvas-frame">
      <canvas ref={filterRef} {...handlers} style={{ display: kind === "filter" ? "block" : "none" }} aria-label="滤镜画布" />
      <canvas ref={simRef} {...handlers} style={{ display: kind === "sim" ? "block" : "none" }} aria-label="模拟画布" />
    </div>
    {loading && <div className="stage-overlay"><span className="loading-line" /><span>正在加载工作区…</span></div>}
    {error && <div className="stage-overlay stage-error" role="alert"><Icon name="code" size={24} /><p>{error}</p><button className="btn" onClick={onRetry}>重试渲染</button></div>}
  </div>;
}

import type { ParamDef, ParamState } from "../filters/types";
import { Control } from "./Controls";
import { Icon } from "./Icon";
interface Props {
  params: ParamDef[]; draftCount: number; state: ParamState; desc?: string;
  onChange: (name: string, value: number | number[] | boolean) => void;
  onReset: () => void; onEdit: () => void; onClose: () => void; disabled: boolean;
}
export function ParamPanel({ params, draftCount, state, desc, onChange, onReset, onEdit, onClose, disabled }: Props) {
  return <aside className="inspector parameter-drawer" aria-label="参数面板">
    <div className="panel-heading"><span>参数</span><span className="panel-count">{String(params.length).padStart(2, "0")}</span><button className="icon-btn" onClick={onReset} disabled={disabled} aria-label="重置参数" title="重置参数"><Icon name="reset" /></button><button className="icon-btn drawer-close" aria-label="关闭参数面板" onClick={onClose}><Icon name="close" /></button></div>
    <div className="inspector-scroll"><div className="inspector-intro"><span className="eyebrow">UNIFORMS</span><p>实时调节，精确控制。</p></div>
      {params.length ? params.map((p) => <Control key={p.name} param={p} state={state} onChange={onChange} />) : <div className="empty">此 Shader 暂无自定义参数。<br />可在参数定义中添加 uniform。</div>}
      {desc && <details className="effect-description"><summary>关于效果</summary><p>{desc}</p></details>}
    </div>
    <div className="inspector-bottom"><button className="btn" disabled={disabled} onClick={onEdit}><Icon name="sliders" />参数定义<span className="panel-count">{draftCount}</span></button><p>定义与源码一起提交；数值实时生效。</p></div>
  </aside>;
}

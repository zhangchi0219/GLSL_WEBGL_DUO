import { useState } from "react";
import type { ParamDef, ParamType } from "../filters/types";
import { validateParams } from "../workspace/model";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
type Row = { name: string; label: string; type: ParamType; value: string; min: string; max: string; step: string };
const row = (p: ParamDef): Row => ({ name: p.name, label: p.label, type: p.type, value: Array.isArray(p.value) ? p.value.join(", ") : String(p.value), min: String(p.min ?? 0), max: String(p.max ?? 1), step: String(p.step ?? 0.01) });
export function ParamEditor({ params, onSave, onClose }: { params: ParamDef[]; onSave: (params: ParamDef[]) => void; onClose: () => void }) {
  const [rows, setRows] = useState(params.map(row));
  const [error, setError] = useState("");
  const patch = (i: number, change: Partial<Row>) => setRows((current) => current.map((r, j) => j === i ? { ...r, ...change } : r));
  const save = () => {
    const next: ParamDef[] = rows.map((r) => ({ name: r.name.trim(), label: r.label.trim(), type: r.type,
      value: r.type === "bool" ? r.value === "true" : r.type === "float" ? (r.value.trim() ? Number(r.value) : NaN) : r.value.split(",").map((n) => n.trim() ? Number(n) : NaN),
      ...(r.type === "float" || r.type === "vec2" ? { min: Number(r.min), max: Number(r.max), step: Number(r.step) } : {}),
    }));
    const problem = validateParams(next);
    if (problem) setError(problem); else { onSave(next); onClose(); }
  };
  return <Modal title="参数定义" onClose={onClose} wide>
    <p className="muted">这里定义控制面板；在 GLSL 中手动声明同名 uniform。修改定义后点击运行。</p>
    <div className="param-definitions">{rows.map((r, i) => <fieldset className="param-definition" key={i}>
      <legend>参数 {String(i + 1).padStart(2, "0")}</legend>
      <div className="definition-row"><label>Uniform 名称<input value={r.name} onChange={(e) => patch(i, { name: e.target.value })} /></label><label>显示名称<input value={r.label} onChange={(e) => patch(i, { label: e.target.value })} /></label><label>类型<select value={r.type} onChange={(e) => { const type = e.target.value as ParamType; patch(i, { type, value: type === "bool" ? "false" : type === "vec2" ? "0.5, 0.5" : type === "color" ? "1, 1, 1" : "0.5" }); }}><option>float</option><option>vec2</option><option>color</option><option>bool</option></select></label></div>
      <div className="definition-row"><label>默认值{r.type === "bool" ? <select value={r.value} onChange={(e) => patch(i, { value: e.target.value })}><option value="false">关闭 / 0</option><option value="true">开启 / 1</option></select> : <input value={r.value} onChange={(e) => patch(i, { value: e.target.value })} />}</label>{(r.type === "float" || r.type === "vec2") && <>{(["min", "max", "step"] as const).map((key) => <label key={key}>{key === "min" ? "最小值" : key === "max" ? "最大值" : "步长"}<input type="number" step="any" value={r[key]} onChange={(e) => patch(i, { [key]: e.target.value })} /></label>)}</>}<button className="icon-btn" aria-label={`删除参数 ${i + 1}`} onClick={() => setRows((current) => current.filter((_, j) => i !== j))}><Icon name="close" /></button></div>
      <code className="uniform-hint">uniform {r.type === "color" ? "vec3" : r.type === "vec2" ? "vec2" : "float"} {r.name};{r.type === "bool" ? " // 0.0 / 1.0" : ""}</code>
    </fieldset>)}</div>
    <button className="btn" onClick={() => setRows((current) => [...current, row({ name: `uParam${current.length + 1}`, label: "新参数", type: "float", value: 0.5 })])}><Icon name="plus" />添加参数</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button className="btn" onClick={onClose}>取消</button><button className="btn btn-primary" onClick={save}>应用定义</button></div>
  </Modal>;
}

import { useEffect, useRef, useState } from "react";
import type { ParamDef, ParamState } from "../filters/types";
export function stepPrecision(step = 0.01): number {
  const [base, exponent = "0"] = step.toString().toLowerCase().split("e");
  return Math.min(8, Math.max(0, (base.split(".")[1]?.length ?? 0) - Number(exponent)));
}
const rgb2hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
function Numeric({ value, param, label, onChange }: { value: number; param: ParamDef; label: string; onChange: (value: number) => void }) {
  const digits = stepPrecision(param.step);
  const [text, setText] = useState(value.toFixed(digits));
  const focused = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!focused.current) setText(value.toFixed(digits)); }, [value, digits]);
  const normalize = (number: number) => {
    const min = param.min ?? 0, max = param.max ?? 1, step = param.step ?? 0.01;
    return Number(Math.max(min, Math.min(max, min + Math.round((number - min) / step) * step)).toFixed(digits));
  };
  return <input ref={input} className="number-input" aria-label={label} type="number" min={param.min ?? 0} max={param.max ?? 1} step={param.step ?? 0.01} value={text}
    onFocus={() => { focused.current = true; }}
    onChange={(e) => { setText(e.target.value); const number = e.target.valueAsNumber; if (Number.isFinite(number) && number >= (param.min ?? 0) && number <= (param.max ?? 1)) onChange(normalize(number)); }}
    onBlur={(e) => { focused.current = false; const raw = e.currentTarget.value; const number = raw.trim() ? Number(raw) : NaN; const next = Number.isFinite(number) ? normalize(number) : value; setText(next.toFixed(digits)); onChange(next); }}
    onKeyDown={(e) => { if (e.key === "Enter") input.current?.blur(); if (e.key === "Escape") { e.currentTarget.value = value.toFixed(digits); setText(value.toFixed(digits)); input.current?.blur(); } }} />;
}
interface Props { param: ParamDef; state: ParamState; onChange: (name: string, value: number | number[] | boolean) => void }
export function Control({ param: p, state, onChange }: Props) {
  const value = state[p.name] ?? p.value;
  const min = p.min ?? 0, max = p.max ?? 1;
  const slider = (v: number, label: string, change: (n: number) => void) => <input id={label === p.label ? `control-${p.name}` : undefined} aria-label={label} type="range" min={min} max={max} step={p.step ?? 0.01} value={v} style={{ "--fill": `${(v - min) / (max - min) * 100}%` } as React.CSSProperties} onChange={(e) => change(Number(e.target.value))} />;
  return <div className="ctl">
    <div className="control-heading"><label htmlFor={`control-${p.name}`}>{p.label}</label>{p.type === "float" && <Numeric value={value as number} param={p} label={`${p.label} 数值`} onChange={(n) => onChange(p.name, n)} />}{p.type === "bool" && <input id={`control-${p.name}`} className="switch" type="checkbox" role="switch" aria-label={p.label} checked={value as boolean} onChange={(e) => onChange(p.name, e.target.checked)} />}</div>
    <span className="uniform-name">{p.name}</span>
    {p.type === "float" && slider(value as number, p.label, (n) => onChange(p.name, n))}
    {p.type === "vec2" && [0, 1].map((i) => <div className="vector-row" key={i}><span>{i ? "Y" : "X"}</span>{slider((value as number[])[i], `${p.label} ${i ? "Y" : "X"}`, (n) => { const next = [...value as number[]]; next[i] = n; onChange(p.name, next); })}<Numeric value={(value as number[])[i]} param={p} label={`${p.label} ${i ? "Y" : "X"} 数值`} onChange={(n) => { const next = [...value as number[]]; next[i] = n; onChange(p.name, next); }} /></div>)}
    {p.type === "color" && <div className="color-row"><input id={`control-${p.name}`} type="color" aria-label={p.label} value={rgb2hex(value as number[])} onChange={(e) => onChange(p.name, hex2rgb(e.target.value))} /><span className="mono">{rgb2hex(value as number[]).toUpperCase()}</span><span className="muted">RGB</span></div>}
  </div>;
}

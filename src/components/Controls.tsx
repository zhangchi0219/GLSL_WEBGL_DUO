import type { ParamDef, ParamState } from "../filters/types";

const rgb2hex = (c: number[]) =>
  "#" + c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

interface Props {
  param: ParamDef;
  state: ParamState;
  onChange: (name: string, value: number | number[] | boolean) => void;
}

export function Control({ param: p, state, onChange }: Props) {
  const v = state[p.name];

  const display =
    p.type === "float"
      ? (v as number).toFixed(2)
      : p.type === "vec2"
      ? (v as number[]).map((n) => n.toFixed(2)).join(", ")
      : p.type === "color"
      ? rgb2hex(v as number[])
      : (v as boolean)
      ? "ON"
      : "OFF";

  return (
    <div className="ctl">
      <div className="row">
        <span className="label">{p.label}</span>
        <span className="val">{display}</span>
      </div>

      {p.type === "float" && (
        <input
          type="range"
          min={p.min ?? 0}
          max={p.max ?? 1}
          step={p.step ?? 0.01}
          value={v as number}
          onChange={(e) => onChange(p.name, +e.target.value)}
        />
      )}

      {p.type === "vec2" &&
        [0, 1].map((i) => (
          <input
            key={i}
            type="range"
            min={p.min ?? 0}
            max={p.max ?? 1}
            step={p.step ?? 0.01}
            value={(v as number[])[i]}
            onChange={(e) => {
              const next = [...(v as number[])];
              next[i] = +e.target.value;
              onChange(p.name, next);
            }}
          />
        ))}

      {p.type === "color" && (
        <input
          type="color"
          value={rgb2hex(v as number[])}
          onChange={(e) => onChange(p.name, hex2rgb(e.target.value))}
        />
      )}

      {p.type === "bool" && (
        <input
          type="checkbox"
          checked={v as boolean}
          onChange={(e) => onChange(p.name, e.target.checked)}
        />
      )}
    </div>
  );
}

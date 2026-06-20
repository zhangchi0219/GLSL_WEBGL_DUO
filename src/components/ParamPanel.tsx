import type { ParamDef, ParamState } from "../filters/types";
import { Control } from "./Controls";

interface Props {
  params: ParamDef[];
  state: ParamState;
  desc?: string;
  onChange: (name: string, value: number | number[] | boolean) => void;
}

export function ParamPanel({ params, state, desc, onChange }: Props) {
  return (
    <aside className="panel inspector">
      <div>
        <div className="label">Parameters</div>
        {desc && <p className="desc" style={{ marginTop: "var(--s2)" }}>{desc}</p>}
      </div>
      {params.length === 0 ? (
        <div className="empty">LOADING…</div>
      ) : (
        params.map((p) => <Control key={p.name} param={p} state={state} onChange={onChange} />)
      )}
    </aside>
  );
}

import { registry, GROUP_ORDER, type RegistryEntry } from "../filters/registry";
import type { FilterGroup } from "../filters/types";

interface Props {
  activeId: string;
  onSelect: (id: string) => void;
  onImage: (img: TexImageSource) => void;
  fps: number;
}

export function Sidebar({ activeId, onSelect, onImage, fps }: Props) {
  const byGroup = (g: FilterGroup): RegistryEntry[] => registry.filter((r) => r.group === g);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      onImage(img);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  return (
    <nav className="panel sidebar">
      <div className="side-id">
        <span className="label kicker">GLSL Dual-Target · WebGL2 → TD</span>
        <h1>GLSL<br />Filter Lab</h1>
      </div>

      <label className="filebtn">
        Upload Image →
        <input type="file" accept="image/*" onChange={onFile} />
      </label>

      {GROUP_ORDER.map((group) => (
        <div className="nav-group" key={group}>
          <span className="label">{group}</span>
          {byGroup(group).map((r) => (
            <button
              key={r.id}
              className={"nav-item" + (r.id === activeId ? " active" : "")}
              onClick={() => onSelect(r.id)}
            >
              <span>{r.name}</span>
              <span className="go" aria-hidden="true">↘</span>
            </button>
          ))}
        </div>
      ))}

      <div className="side-meta">
        <span className="label">{registry.length} filters · {fps} fps</span>
        <span className="label">core ports 1:1 to GLSL TOP</span>
      </div>
    </nav>
  );
}

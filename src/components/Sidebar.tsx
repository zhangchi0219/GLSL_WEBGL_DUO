import { useEffect, useRef, useState } from "react";
import { registry, GROUP_ORDER } from "../filters/registry";
import { hasChanges, type WorkspaceProject } from "../workspace/model";
import { Icon } from "./Icon";
interface Props { activeId: string; projects: WorkspaceProject[]; onSelect: (id: string) => void; onNew: () => void; onClose: () => void }
export function Sidebar({ activeId, projects, onSelect, onNew, onClose }: Props) {
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !target.closest("input, textarea, select, [contenteditable], dialog") && searchInput.current?.getClientRects().length) {
        event.preventDefault(); searchInput.current.focus();
      }
    };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const search = query.trim().toLowerCase();
  const custom = projects.filter((p) => !registry.some((entry) => entry.id === p.id));
  const matches = (name: string, id: string) => !search || `${name} ${id}`.toLowerCase().includes(search);
  const total = registry.filter((r) => matches(r.name, r.id)).length + custom.filter((p) => matches(p.draft.meta.name, p.id)).length;
  const item = (id: string, name: string, index: string, kind: string) => {
    const project = projects.find((p) => p.id === id);
    return <button className={`nav-item ${id === activeId ? "active" : ""}`} key={id} onClick={() => onSelect(id)} aria-current={id === activeId ? "true" : undefined} data-module-id={id} title={name}>
      <span className="nav-number">{index}</span><span className="nav-name">{name}</span>{project && hasChanges(project) ? <span className="dirty-indicator" aria-label="有未运行修改" /> : <span className="nav-kind">{kind === "sim" ? "M" : ""}</span>}
    </button>;
  };
  return <nav className="sidebar" aria-label="效果库">
    <div className="panel-heading"><span>效果库</span><span className="panel-count">{registry.length}</span><button className="icon-btn drawer-close" aria-label="关闭效果库" onClick={onClose}><Icon name="close" /></button></div>
    <div className="search-field"><Icon name="search" size={14} /><input ref={searchInput} aria-label="搜索效果" placeholder="搜索效果…" value={query} onChange={(e) => setQuery(e.target.value)} /><kbd aria-hidden="true">/</kbd></div>
    <div className="library-scroll">
      {GROUP_ORDER.map((group) => {
        const entries = registry.filter((r) => r.group === group && matches(r.name, r.id));
        return entries.length ? <section className="nav-group" key={group}><div className="group-label"><span>{group}</span><span>{String(entries.length).padStart(2, "0")}</span></div>{entries.map((r) => item(r.id, r.name, String(registry.indexOf(r) + 1).padStart(2, "0"), r.kind))}</section> : null;
      })}
      {!!custom.length && <section className="nav-group"><div className="group-label"><span>自定义 / 导入</span><span>{custom.length}</span></div>{custom.filter((p) => matches(p.draft.meta.name, p.id)).map((p, i) => item(p.id, p.draft.meta.name, `C${i + 1}`, p.kind))}</section>}
      {!total && <p className="empty">没有匹配的效果</p>}
    </div>
    <div className="library-bottom"><button className="btn new-shader" onClick={onNew}><Icon name="plus" />新建 Shader</button><div className="library-note"><span>WebGL2</span><Icon name="arrow" size={12} /><span>TouchDesigner</span></div></div>
  </nav>;
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registry } from "./filters/registry";
import { defaultState, type ParamDef } from "./filters/types";
import { Sidebar } from "./components/Sidebar";
import { Stage } from "./components/Stage";
import { ParamPanel } from "./components/ParamPanel";
import { wrapTD, wrapSimPassTD } from "./td/wrapper";
import { fluidGradientModule } from "./gl/fluidGradient";
import { descriptions } from "./lib/copy";
import { ParamEditor } from "./components/ParamEditor";
import { Modal } from "./components/Modal";
import { Icon } from "./components/Icon";
import { useWorkspaceRenderer } from "./hooks/useWorkspaceRenderer";
import { makePointer, pointerHandlers } from "./lib/pointer";
import { builtinSource, clone, hasChanges, isFilter, makeProject, newShader, passes, reconcileValues, type ShaderModule, type WorkspaceProject, type WorkspaceSnapshot } from "./workspace/model";
import { readWorkspace, saveWorkspace } from "./workspace/storage";
import { decodeImage, downloadBlob, exportProject, exportTD, fileStem, importProject, resolveSource } from "./workspace/files";
import type { PreviewQuality } from "./gl/program";
const ShaderEditor = lazy(() => import("./components/ShaderEditor").then((module) => ({ default: module.ShaderEditor })));

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>({ version: 1, activeId: "", projects: [] });
  const [booted, setBooted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("正在恢复");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState<TexImageSource | null>(null);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [quality, setQuality] = useState<PreviewQuality>("standard");
  const [passName, setPassName] = useState("");
  const [jump, setJump] = useState<{ line: number; key: number }>();
  const [focus, setFocus] = useState<"both" | "preview" | "code">("both");
  const [split, setSplit] = useState(62);
  const [wrapCode, setWrapCode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [codeMode, setCodeMode] = useState<"glsl" | "td" | "gradient">("glsl");
  const [drawer, setDrawer] = useState<"library" | "params" | "examples" | null>(null);
  const [modal, setModal] = useState<"new" | "params" | null>(null);
  const [newName, setNewName] = useState("Untitled Shader");
  const [undo, setUndo] = useState<WorkspaceProject | null>(null);
  const loadSequence = useRef(0);
  const saveSequence = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const workspaceRef = useRef(workspace); workspaceRef.current = workspace;
  const filterCanvas = useRef<HTMLCanvasElement>(null);
  const simCanvas = useRef<HTMLCanvasElement>(null);
  const workArea = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const pointer = useRef(makePointer());
  const handlers = useMemo(() => pointerHandlers(pointer.current), []);
  const project = workspace.projects.find((p) => p.id === workspace.activeId) ?? null;
  const projectRef = useRef(project); projectRef.current = project;
  const patchProject = useCallback((id: string, edit: (p: WorkspaceProject) => WorkspaceProject) => {
    setWorkspace((current) => ({ ...current, projects: current.projects.map((p) => p.id === id ? edit(p) : p) }));
  }, []);
  const commit = useCallback((id: string, module: ShaderModule) => patchProject(id, (p) => ({
    ...p, compiled: clone(module), values: reconcileValues(module.params, p.values, (p.compiled ?? p.draft).params),
  })), [patchProject]);
  const runtime = useWorkspaceRenderer({ project, source, filterCanvas, simCanvas, pointer, paused, quality, onCommit: commit });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await readWorkspace();
        if (saved?.version === 1 && saved.projects.length && saved.projects.some((p) => p.id === saved.activeId)) {
          if (alive) setWorkspace({ ...saved, projects: saved.projects.map((p) => p.source.kind === "builtin" ? { ...p, source: builtinSource } : p) });
        } else {
          const entry = registry[0], module = await entry.load();
          if (alive) setWorkspace({ version: 1, activeId: entry.id, projects: [makeProject(entry.id, entry.kind, module)] });
        }
      } catch (e) {
        const entry = registry[0], module = await entry.load();
        if (alive) {
          setWorkspace({ version: 1, activeId: entry.id, projects: [makeProject(entry.id, entry.kind, module)] });
          setError("无法恢复本地工作区；当前编辑仍可导出备份。");
        }
      } finally { if (alive) setBooted(true); }
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!booted) return;
    setSaveStatus("待保存");
    const sequence = ++saveSequence.current;
    const timer = window.setTimeout(() => {
      setSaveStatus("保存中");
      saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveWorkspace(workspace));
      saveQueue.current.then(() => { if (sequence === saveSequence.current) setSaveStatus("已保存到本机"); })
        .catch(() => { if (sequence === saveSequence.current) setSaveStatus("保存失败 · 请导出备份"); });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspace, booted]);
  useEffect(() => {
    if (!project) return;
    let alive = true;
    setSourceLoading(true); setSource(null);
    resolveSource(project.source).then((image) => { if (alive) { setSource(image); setSourceLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setSourceLoading(false); } });
    return () => { alive = false; };
  }, [project?.id, project?.source]);
  useEffect(() => { setPassName(""); setError(""); setDrawer(null); }, [project?.id]);

  const select = async (id: string) => {
    const sequence = ++loadSequence.current;
    setDrawer(null); setError(""); setLoading(false);
    if (workspaceRef.current.projects.some((p) => p.id === id)) {
      setWorkspace((current) => ({ ...current, activeId: id })); return;
    }
    const entry = registry.find((e) => e.id === id);
    if (!entry) return;
    setLoading(true);
    try {
      const module = await entry.load();
      if (sequence !== loadSequence.current) return;
      const created = makeProject(entry.id, entry.kind, module, entry.id, projectRef.current?.source ?? builtinSource);
      setWorkspace((current) => ({ ...current, activeId: id, projects: [...current.projects, created] }));
    } catch { if (sequence === loadSequence.current) setError("效果加载失败，请在效果库中重新选择重试。"); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  };
  const run = useCallback(() => {
    const current = projectRef.current;
    if (current && runtime.compile(current.draft)) { commit(current.id, current.draft); setNotice("运行成功"); }
  }, [runtime.compile, commit]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setDrawer(null); if (menu.current) menu.current.open = false; }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !(event.target as HTMLElement)?.closest(".cm-editor, dialog")) { event.preventDefault(); run(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [run]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 4000); return () => window.clearTimeout(timer); }, [notice]);

  const allPasses = project && !isFilter(project.draft) ? passes(project.draft) : [];
  const activePass = allPasses.find((p) => p.name === passName) ?? allPasses.find((p) => p.out === "screen") ?? allPasses[0];
  const code = project ? isFilter(project.draft) ? project.draft.core : activePass?.core ?? "" : "";
  const updateCode = (core: string) => {
    if (!project) return;
    patchProject(project.id, (p) => {
      const draft = clone(p.draft);
      if (isFilter(draft)) draft.core = core;
      else for (const pass of passes(draft)) if (pass.name === activePass?.name) pass.core = core;
      return { ...p, draft };
    });
  };
  const action = async (task: () => Promise<void>) => {
    if (menu.current) menu.current.open = false;
    try { setError(""); await task(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const onImage = (file: File) => action(async () => {
    const id = projectRef.current?.id; if (!id) return;
    const image = await decodeImage(file);
    const canvas = projectRef.current?.kind === "sim" ? simCanvas.current : filterCanvas.current;
    const gl = canvas?.getContext("webgl2");
    if (gl && Math.max(image.width, image.height) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw new Error("图片尺寸超过当前 GPU 的纹理限制。");
    patchProject(id, (p) => ({ ...p, source: { kind: "image", name: file.name, width: image.width, height: image.height, blob: file } }));
  });
  const backup = () => action(async () => {
    const current = projectRef.current; if (!current) return;
    const blob = await exportProject(current); downloadBlob(`${fileStem(current.draft.meta.name)}.glslproj.zip`, blob); setNotice("项目与原图已打包");
  });
  const importFile = (file: File) => action(async () => {
    const imported = await importProject(new Uint8Array(await file.arrayBuffer()));
    loadSequence.current++; setLoading(false);
    setWorkspace((current) => ({ ...current, activeId: imported.id, projects: [...current.projects, imported] }));
    setNotice("已导入为新项目");
  });
  const td = () => action(async () => {
    const current = projectRef.current; if (!current) return;
    const result = await exportTD(current); downloadBlob(result.filename, result.blob); setNotice("已导出 TouchDesigner 文件");
  });
  const restore = () => action(async () => {
    const current = projectRef.current; if (!current?.originId) return;
    const entry = registry.find((e) => e.id === current.originId); if (!entry) return;
    const module = clone(await entry.load());
    if (projectRef.current?.id !== current.id) return;
    if (runtime.compile(module)) {
      setUndo(clone(current));
      patchProject(current.id, (p) => ({ ...p, draft: module, compiled: clone(module), values: defaultState(module.params) }));
      setNotice("已恢复预设，可撤销");
    }
  });
  const undoRestore = () => {
    if (!undo || undo.id !== project?.id) return;
    if (runtime.compile(undo.compiled ?? undo.draft)) { patchProject(undo.id, () => undo); setUndo(null); }
  };
  const rename = (name: string) => {
    if (!project) return;
    patchProject(project.id, (p) => ({ ...p, draft: { ...p.draft, meta: { ...p.draft.meta, name } }, compiled: p.compiled ? { ...p.compiled, meta: { ...p.compiled.meta, name } } : null }));
  };
  const changed = project ? hasChanges(project) : false;
  const currentModule = project?.compiled ?? project?.draft;
  const sourceFree = !!currentModule && !isFilter(currentModule) && currentModule.needsSource === false;
  const params = project ? (project.compiled ?? project.draft).params : [];
  const canExport = !!project?.compiled && !changed && !runtime.diagnostics.length && !loading && runtime.ready;
  const exampleCode = codeMode === "gradient" ? wrapTD(fluidGradientModule, { sourceRequired: false }) : project ? isFilter(project.draft) ? wrapTD(project.draft, { state: project.values }) : activePass ? wrapSimPassTD(project.draft, activePass) : "" : "";
  const copyExample = () => action(async () => { await navigator.clipboard.writeText(codeMode === "glsl" ? code : exampleCode); setCopied(true); setNotice("代码已复制"); });
  const downloadExample = () => { const text = codeMode === "glsl" ? code : exampleCode; const filename = codeMode === "gradient" ? "gradient_source_td.glsl" : codeMode === "td" ? (activePass?.name ?? project?.draft.meta.id ?? "shader") + "_td.glsl" : (activePass?.name ?? "shared.core") + ".glsl"; downloadBlob(filename, new Blob([text], { type: "text/plain;charset=utf-8" })); };
  useEffect(() => { setCopied(false); }, [codeMode, code, project?.id]);
  useEffect(() => { if (!copied) return; const timer = window.setTimeout(() => setCopied(false), 1800); return () => window.clearTimeout(timer); }, [copied]);
  const visibleDiagnostics = runtime.diagnostics.filter((d) => !d.pass || d.pass === activePass?.name);

  return <div className="shell" ref={workArea} data-drawer={drawer ?? ""} data-focus={focus} style={{ "--preview-track": `${split}fr`, "--code-track": `${100 - split}fr` } as React.CSSProperties}>
    <header className="topbar">
      <a className="brand" href="./" aria-label="GLSL Workbench"><span className="brand-mark" aria-hidden="true">/ /</span><span>GLSL<span className="brand-light"> / Workbench</span></span></a>
      <span className="top-divider" />
      <input className="project-name" aria-label="项目名称" value={project?.draft.meta.name ?? ""} disabled={!project} onChange={(e) => rename(e.target.value)} onBlur={(e) => { if (!e.target.value.trim()) rename("Untitled Shader"); }} />
      <div className="top-actions">
        <button className="icon-btn library-toggle" aria-label="打开效果库" aria-expanded={drawer === "library"} onClick={() => setDrawer(drawer === "library" ? null : "library")}><Icon name="library" /></button>
        <button className="btn image-button" aria-label="导入图片" title={sourceFree ? "此模拟由程序生成，无需底图" : "导入源图片"} disabled={!project || loading || sourceFree} onClick={() => imageInput.current?.click()}><Icon name="image" /><span>导入图片</span></button>
        <details className="project-menu" ref={menu}><summary className="btn"><Icon name="save" /><span>项目</span></summary><div className="menu-popover">
          <button onClick={() => { menu.current!.open = false; setNewName("Untitled Shader"); setModal("new"); }}><Icon name="plus" />新建 Shader</button>
          <button onClick={() => { menu.current!.open = false; projectInput.current?.click(); }}><Icon name="upload" />导入项目</button>
          <button disabled={!project} onClick={backup}><Icon name="download" />导出项目与原图</button>
          <div className="menu-divider" /><button disabled={!project?.originId} onClick={restore}><Icon name="reset" />恢复预设代码</button>
        </div></details>
        <span className="top-divider" />
        <button className="btn run-button" aria-label="运行" disabled={!project || !runtime.ready || loading} onClick={run} title="Ctrl / Cmd + Enter"><Icon name="play" /><span>运行</span><kbd aria-hidden="true">Ctrl ↵</kbd></button>
        <button className="btn btn-primary td-button" disabled={!canExport} onClick={td} title={canExport ? "导出当前源码和参数" : "请先成功运行当前代码"}><span>导出 TD</span><Icon name="arrow" /></button>
        <button className="icon-btn examples-toggle" aria-label="打开代码示例" aria-expanded={drawer === "examples"} onClick={() => setDrawer(drawer === "examples" ? null : "examples")}><Icon name="code" /></button>
        <button className="icon-btn params-toggle" aria-label="打开参数面板" aria-expanded={drawer === "params"} onClick={() => setDrawer(drawer === "params" ? null : "params")}><Icon name="sliders" /></button>
      </div>
      <input ref={imageInput} className="hidden-input" type="file" accept="image/*" aria-label="选择源图片" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void onImage(file); }} />
      <input ref={projectInput} className="hidden-input" type="file" accept=".zip,.glslproj.zip" aria-label="选择项目文件" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void importFile(file); }} />
    </header>
    {drawer && <button className="drawer-scrim" aria-label="关闭侧栏" onClick={() => setDrawer(null)} />}
    <Sidebar activeId={workspace.activeId} projects={workspace.projects} onSelect={select} onNew={() => { setNewName("Untitled Shader"); setModal("new"); }} onClose={() => setDrawer(null)} />
    <main className="workspace">
      <section className="preview-zone" aria-label="效果预览">
        <div className="section-head"><div className="section-heading"><Icon name="image" /><span>预览</span><span className="technical-tag">WebGL2</span></div><div className="section-actions">
          <select aria-label="预览质量" value={quality} onChange={(e) => setQuality(e.target.value as PreviewQuality)}><option value="low">低 · 0.5×</option><option value="standard">标准 · 1×</option><option value="high">高 · 2×</option></select>
          <button className="icon-btn" disabled={!project} aria-label={paused ? "继续预览" : "暂停预览"} onClick={() => setPaused(!paused)}><Icon name={paused ? "play" : "pause"} /></button>
          {project?.kind === "sim" && <button className="icon-btn" aria-label="重置模拟" onClick={runtime.resetSimulation}><Icon name="reset" /></button>}
          <button className="icon-btn" aria-label={focus === "preview" ? "恢复分屏" : "放大预览"} onClick={() => setFocus(focus === "preview" ? "both" : "preview")}><Icon name="expand" /></button>
        </div></div>
        <Stage filterRef={filterCanvas} simRef={simCanvas} kind={project?.kind ?? "filter"} handlers={handlers} loading={!booted || loading || sourceLoading} error={runtime.runtimeError} onRetry={runtime.retry} />
        <div className="preview-footer"><div className="source-info"><span className="status-dot" /><span title={sourceFree ? "程序生成的模拟" : project?.source.name}>{sourceFree ? "程序生成" : project?.source.name ?? "等待项目"}</span><span className="mono">{sourceFree ? "SIMULATION" : project?.source.kind === "builtin" ? "LIVE GRADIENT" : `${project?.source.width} × ${project?.source.height}`}</span>{!sourceFree && project?.source.kind === "image" && <button className="text-btn" onClick={() => patchProject(project.id, (p) => ({ ...p, source: builtinSource }))}>渐变底图</button>}</div><span className="preview-hint">{currentModule?.meta.group === "Organic Growth" ? "调参观察生长，重置重新生成" : project?.kind === "sim" ? "拖动预览，施加扰动" : "共享 core · 双端输出"}</span></div>
      </section>
    </main>
    <div className="split-handle" role="separator" tabIndex={0} aria-label="调整预览与代码宽度" aria-orientation="vertical" aria-valuemin={30} aria-valuemax={80} aria-valuenow={Math.round(split)}
      onKeyDown={(e) => { if (["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); setSplit((s) => Math.max(30, Math.min(80, s + (e.key === "ArrowLeft" ? -3 : 3)))); } }}
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={(e) => { if (!e.currentTarget.hasPointerCapture(e.pointerId) || !workArea.current) return; const preview = workArea.current.querySelector(".workspace")!.getBoundingClientRect(); const examples = workArea.current.querySelector(".code-panel")!.getBoundingClientRect(); setSplit(Math.max(30, Math.min(80, (e.clientX - preview.left) / (preview.width + examples.width + 7) * 100))); }}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}><span /></div>
    <aside className="code-panel" aria-label="代码示例">
      <section className="editor-zone" aria-label="GLSL 编辑区">
        <div className="section-head"><div className="section-heading"><Icon name="code" /><span>代码示例</span></div><div className="section-actions"><button className="icon-btn" aria-label="切换自动换行" aria-pressed={wrapCode} title={wrapCode ? "关闭自动换行" : "开启自动换行"} onClick={() => setWrapCode(!wrapCode)}><Icon name="wrap" /></button><button className="icon-btn" aria-label="复制代码示例" title={copied ? "已复制" : "复制当前代码"} disabled={!project} onClick={copyExample}><Icon name={copied ? "check" : "copy"} /></button><span className={`compile-state ${runtime.diagnostics.length ? "state-error" : changed ? "state-pending" : "state-ok"}`} role="status">{runtime.diagnostics.length ? "编译失败" : changed ? "待运行" : project?.compiled ? "编译成功" : "加载中"}</span><button className="icon-btn" aria-label={focus === "code" ? "恢复分屏" : "放大代码"} onClick={() => setFocus(focus === "code" ? "both" : "code")}><Icon name="expand" /></button></div><button className="icon-btn examples-close" aria-label="关闭代码示例" onClick={() => { setDrawer(null); setFocus("both"); }}><Icon name="close" /></button></div>
        <div className="example-tabs" role="tablist" aria-label="代码示例格式"><button role="tab" aria-selected={codeMode === "glsl"} onClick={() => setCodeMode("glsl")}>GLSL</button><button role="tab" aria-selected={codeMode === "td"} onClick={() => setCodeMode("td")}>TouchDesigner</button><button role="tab" aria-selected={codeMode === "gradient"} onClick={() => setCodeMode("gradient")}>Gradient 底图</button></div>
        <div className="example-file"><span>{codeMode === "gradient" ? "gradient_source_td.glsl" : codeMode === "td" ? (activePass?.name ?? project?.draft.meta.id ?? "shader") + "_td.glsl" : (activePass?.name ?? "shared.core") + ".glsl"}</span>{allPasses.length && codeMode !== "gradient" ? <select aria-label="模拟 Pass" value={activePass?.name} onChange={(e) => setPassName(e.target.value)}>{allPasses.map((p) => <option key={p.name} value={p.name}>{p.name}{p.out === "screen" ? " · display" : ""}</option>)}</select> : null}</div>
        {activePass && codeMode !== "gradient" && <div className="pass-info"><span>INPUT: {activePass.inputs.join(" / ") || "none"}</span><span>OUT: {activePass.out}{activePass.iterations ? ` · ×${activePass.iterations}` : ""}</span></div>}
        <div className="code-surface" hidden={codeMode !== "glsl"}>{project && <Suspense fallback={<div className="code-host empty">正在加载编辑器…</div>}><ShaderEditor key={`${project.id}:${activePass?.name ?? "core"}`} code={code} onChange={updateCode} onRun={run} diagnostics={visibleDiagnostics} jump={jump} wrap={wrapCode} /></Suspense>}</div>
        {project && codeMode !== "glsl" && <div className="code-surface"><Suspense fallback={<div className="code-host empty">正在加载示例…</div>}><ShaderEditor key={`${codeMode}:${activePass?.name ?? "core"}`} code={exampleCode} onChange={() => {}} onRun={run} diagnostics={[]} readOnly ariaLabel="TouchDesigner 代码示例" wrap={wrapCode} /></Suspense></div>}
        {!!runtime.diagnostics.length && <div className="diagnostics" role="alert">{runtime.diagnostics.map((d, i) => <button key={i} onClick={() => { setCodeMode("glsl"); if (d.pass) setPassName(d.pass); if (d.line) setJump({ line: d.line, key: Date.now() }); setFocus("code"); }}><span>{d.pass ?? "core"}{d.line ? `:${d.line}` : ""}</span>{d.message}</button>)}</div>}
        <div className="example-caption"><span>{codeMode === "glsl" ? "可编辑 · Ctrl / ⌘ + Enter 运行" : codeMode === "gradient" ? "只读 · 无输入的 Gradient GLSL TOP" : "只读 · TouchDesigner 平台包装"}</span><button className="text-btn" disabled={!project} onClick={downloadExample}><Icon name="download" size={12} />下载示例</button></div>
        <div className="editor-footer"><span>GLSL ES 3.00<span className="muted"> → GLSL TOP 4.60</span></span><details className="code-help"><summary>接口说明</summary><div><code>vec4 renderMain(vec2 uv, vec2 res, float time)</code><p>共享 core 不写 #version 或 main。使用 INPUT0 读取源图片；模拟的 INPUT0–3 由当前 Pass 连接决定。</p><p>内置 uTime、uResolution、uMouse。模拟另有 uDt、uFrame、uTexel、uMouseVel、uMouseDown、uIteration（迭代序号）、uCanvasResolution（预览尺寸）。自定义 uniform 请在参数定义中配置。</p></div></details><span className="shortcut">Ctrl / ⌘ + Enter 运行</span></div>
      </section>
    </aside>
    <ParamPanel params={params} draftCount={project?.draft.params.length ?? 0} state={project?.values ?? {}} desc={project ? descriptions[project.originId ?? project.draft.meta.id] ?? project.draft.meta.desc : undefined} onChange={(name, value) => project && patchProject(project.id, (p) => ({ ...p, values: { ...p.values, [name]: value } }))} onReset={() => project && patchProject(project.id, (p) => ({ ...p, values: defaultState(params) }))} onEdit={() => { setDrawer(null); setModal("params"); }} onClose={() => setDrawer(null)} disabled={!project || loading} />
    <footer className="statusbar"><div><span className={`status-dot ${saveStatus.includes("失败") ? "error-dot" : ""}`} /><span>{saveStatus}</span>{notice && <span className="notice" role="status">{notice}</span>}{undo?.id === project?.id && <button className="text-btn" onClick={undoRestore}>撤销恢复</button>}</div><div className="runtime-status"><span>{paused ? "已暂停" : runtime.animated ? `${runtime.fps} FPS` : "按需渲染"}</span><span className="mono" data-testid="resolution">{runtime.resolution}</span><span>{project?.kind === "sim" ? "MULTI PASS" : "SINGLE PASS"}</span></div></footer>
    {error && <div className="error-toast" role="alert"><span>{error}</span><button className="icon-btn" aria-label="关闭提示" onClick={() => setError("")}><Icon name="close" /></button></div>}
    {modal === "new" && <Modal title="新建 Shader" onClose={() => setModal(null)}><form onSubmit={(e) => { e.preventDefault(); const created = newShader(newName.trim() || "Untitled Shader", project?.source); loadSequence.current++; setLoading(false); setWorkspace((current) => ({ ...current, activeId: created.id, projects: [...current.projects, created] })); setModal(null); }}><label className="field-label">名称<input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={120} /></label><p className="muted">从源图片模板开始。代码、参数和原图自动保存在本机。</p><div className="modal-actions"><button type="button" className="btn" onClick={() => setModal(null)}>取消</button><button className="btn btn-primary" type="submit">创建 Shader</button></div></form></Modal>}
    {modal === "params" && project && <ParamEditor params={project.draft.params} onClose={() => setModal(null)} onSave={(definitions: ParamDef[]) => patchProject(project.id, (p) => ({ ...p, draft: { ...p.draft, params: definitions } }))} />}
  </div>;
}

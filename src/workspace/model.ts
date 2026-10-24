import { defaultState, type FilterModule, type ParamDef, type ParamState } from "../filters/types";
import type { SimModule, SimPassDef } from "../sims/types";

export type ShaderModule = FilterModule | SimModule;
export type SourceAsset = { kind: "builtin"; name: string; width: number; height: number } | { kind: "image"; name: string; width: number; height: number; blob: Blob };
export interface WorkspaceProject {
  version: 1;
  id: string;
  originId: string | null;
  kind: "filter" | "sim";
  draft: ShaderModule;
  compiled: ShaderModule | null;
  values: ParamState;
  source: SourceAsset;
}
export interface WorkspaceSnapshot { version: 1; activeId: string; projects: WorkspaceProject[] }
export const builtinSource: SourceAsset = { kind: "builtin", name: "Gradient Fluid", width: 1280, height: 720 };
export const clone = <T,>(value: T): T => structuredClone(value);
export const isFilter = (module: ShaderModule): module is FilterModule => "core" in module;
export const passes = (mod: SimModule): SimPassDef[] => [...(mod.init ?? []), ...mod.step, mod.display];
export const signature = (mod: ShaderModule | null): string => JSON.stringify(mod);
export const hasChanges = (project: WorkspaceProject): boolean => signature(project.draft) !== signature(project.compiled);
export function reconcileValues(params: ParamDef[], values: ParamState, oldParams: ParamDef[] = params): ParamState {
  const next = defaultState(params);
  for (const p of params) {
    if (oldParams.some((old) => old.name === p.name && old.type === p.type) && values[p.name] !== undefined) {
      const v = values[p.name];
      const clamp = (n: number) => Math.max(p.type === "color" ? 0 : p.min ?? 0, Math.min(p.type === "color" ? 1 : p.max ?? 1, n));
      if (typeof v === "boolean") next[p.name] = v;
      else if (Array.isArray(v)) next[p.name] = v.map(clamp);
      else next[p.name] = clamp(v);
    }
  }
  return next;
}
export function makeProject(id: string, kind: "filter" | "sim", module: ShaderModule, originId: string | null = id, source = builtinSource): WorkspaceProject {
  return { version: 1, id, originId, kind, draft: clone(module), compiled: null, values: defaultState(module.params), source };
}
export function newShader(name: string, source = builtinSource): WorkspaceProject {
  const id = `custom-${crypto.randomUUID()}`;
  return makeProject(id, "filter", {
    meta: { id, name, group: "Pixel", desc: "自定义单通道 Shader。编辑共享 GLSL，运行后导出到 TouchDesigner。", animated: true },
    params: [],
    core: `// INPUT0 = 源图片；uv = 0–1；res = 输出尺寸；time = 秒\n// 内置：uTime、uResolution、uMouse\nvec4 renderMain(vec2 uv, vec2 res, float time) {\n    return texture(INPUT0, uv);\n}\n`,
  }, null, source);
}
const RESERVED = new Set(["uTime", "uResolution", "uTexel", "uDt", "uFrame", "uIteration", "uCanvasResolution", "uMouse", "uMouseVel", "uMouseDown", "uTex0", "uTex1", "uTex2", "uTex3"]);
export function validateParams(params: ParamDef[]): string | null {
  if (!Array.isArray(params) || params.length > 128) return "参数定义无效或超过 128 个。";
  const names = new Set<string>();
  for (const p of params) {
    if (!p || !/^u[A-Za-z0-9_]+$/.test(p.name) || p.name.includes("__") || p.name.startsWith("uTD") || RESERVED.has(p.name) || names.has(p.name)) return `参数名称无效、重复或与内置变量冲突：${p?.name ?? ""}`;
    names.add(p.name);
    if (typeof p.label !== "string" || !p.label.trim() || !["float", "vec2", "color", "bool"].includes(p.type)) return `参数定义无效：${p.name}`;
    if (p.type === "bool") { if (typeof p.value !== "boolean") return `${p.name} 需要布尔默认值。`; continue; }
    const values = p.type === "float" ? [p.value] : p.value;
    const count = p.type === "float" ? 1 : p.type === "vec2" ? 2 : 3;
    if (!Array.isArray(values) || values.length !== count || values.some((v) => typeof v !== "number" || !Number.isFinite(v))) return `${p.name} 默认值类型无效。`;
    const numbers = values as number[];
    if (p.type === "color") { if (numbers.some((v) => v < 0 || v > 1)) return `${p.name} 颜色必须在 0–1 之间。`; continue; }
    const min = p.min ?? 0, max = p.max ?? 1, step = p.step ?? 0.01;
    if (![min, max, step].every(Number.isFinite) || min >= max || step <= 0 || numbers.some((v) => v < min || v > max)) return `${p.name} 范围、步长或默认值无效。`;
  }
  return null;
}
export function validateValues(params: ParamDef[], state: ParamState): string | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "参数值无效。";
  return validateParams(params.map((p) => ({ ...p, value: state[p.name] })));
}
export function topology(mod: SimModule): string {
  return JSON.stringify({ buffers: mod.buffers, init: mod.init?.map(({ core: _core, ...p }) => p), step: mod.step.map(({ core: _core, ...p }) => p), display: (({ core: _core, ...p }) => p)(mod.display), needsSource: mod.needsSource, resetOnParams: mod.resetOnParams });
}

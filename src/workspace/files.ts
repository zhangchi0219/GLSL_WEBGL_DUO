import { zip, unzipSync, strToU8, strFromU8, type Zippable } from "fflate";
import { registry } from "../filters/registry";
import { simTDFiles, wrapTD } from "../td/wrapper";
import { builtinSource, clone, isFilter, passes, topology, validateParams, validateValues, type ShaderModule, type SourceAsset, type WorkspaceProject } from "./model";
import { makeTestCard } from "../lib/testCard";

const LIMIT = 64 * 1024 * 1024;
export const fileStem = (name: string) => name.replace(/[^a-zA-Z0-9\u3400-\u9fff_-]/g, "_").slice(0, 80) || "shader";
export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function pack(files: Zippable): Promise<Blob> {
  return new Promise((resolve, reject) => zip(files, { level: 6 }, (error, data) => error ? reject(error) : resolve(new Blob([data.slice().buffer], { type: "application/zip" }))));
}
export async function exportProject(project: WorkspaceProject): Promise<Blob> {
  const { source, ...body } = project;
  const metadata = source.kind === "image" ? { kind: source.kind, name: source.name, width: source.width, height: source.height, path: "assets/source", mime: source.blob.type } : source;
  const files: Zippable = { "project.json": strToU8(JSON.stringify({ ...body, source: metadata }, null, 2)) };
  if (source.kind === "image") files["assets/source"] = [new Uint8Array(await source.blob.arrayBuffer()), { level: 0 }];
  return pack(files);
}
function validateModule(value: unknown, kind: "filter" | "sim"): asserts value is ShaderModule {
  if (!value || typeof value !== "object") throw new Error("项目模块缺失。 ");
  const module = value as ShaderModule;
  if (!module.meta || typeof module.meta.name !== "string" || !module.meta.name.trim() || typeof module.meta.id !== "string" || typeof module.meta.desc !== "string") throw new Error("项目名称或说明无效。 ");
  const problem = validateParams(module.params);
  if (problem) throw new Error(problem);
  if (kind === "filter") {
    if (!isFilter(module) || typeof module.core !== "string" || module.core.length > 1024 * 1024) throw new Error("Shader 源码无效。 ");
  } else {
    if (isFilter(module) || !Array.isArray(module.buffers) || !Array.isArray(module.step) || !module.display || (module.init !== undefined && !Array.isArray(module.init))) throw new Error("模拟网络无效。 ");
    if (passes(module).some((p) => !p || typeof p.core !== "string" || p.core.length > 1024 * 1024)) throw new Error("Pass 源码无效。 ");
  }
}
export async function importProject(bytes: Uint8Array): Promise<WorkspaceProject> {
  if (bytes.length > LIMIT) throw new Error("项目文件超过 64 MB。 ");
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (file) => {
      if (file.name !== "project.json" && file.name !== "assets/source") return false;
      total += file.originalSize;
      if (total > LIMIT || (file.name === "project.json" && file.originalSize > 4 * 1024 * 1024)) throw new Error("解压内容过大。 ");
      return true;
    } });
  } catch { throw new Error("项目 ZIP 损坏或解压内容过大。 "); }
  let parsed: any;
  try { parsed = JSON.parse(strFromU8(files["project.json"])); } catch { throw new Error("项目缺少有效的 project.json。 "); }
  if (parsed.version !== 1) throw new Error("不支持此项目版本，请使用版本 1 的项目文件。 ");
  if (!["filter", "sim"].includes(parsed.kind) || (parsed.originId !== null && typeof parsed.originId !== "string")) throw new Error("项目类型无效。 ");
  validateModule(parsed.draft, parsed.kind);
  if (parsed.compiled !== null) validateModule(parsed.compiled, parsed.kind);
  const problem = validateValues((parsed.compiled ?? parsed.draft).params, parsed.values);
  if (problem) throw new Error(problem);
  if (parsed.kind === "sim") {
    const entry = registry.find((r) => r.kind === "sim" && r.id === parsed.originId);
    if (!entry) throw new Error("模拟项目必须来自现有预设。 ");
    const base = await entry.load();
    if (isFilter(base) || topology(base) !== topology(parsed.draft) || (parsed.compiled && topology(base) !== topology(parsed.compiled))) throw new Error("项目修改了模拟拓扑；此版本只支持编辑既有 Pass。 ");
  }
  let source: SourceAsset;
  if (parsed.source?.kind === "builtin") source = builtinSource;
  else {
    if (parsed.source?.kind !== "image" || !files["assets/source"] || typeof parsed.source.name !== "string" || typeof parsed.source.mime !== "string" || !parsed.source.mime.startsWith("image/")) throw new Error("项目原图缺失或格式无效。 ");
    const blob = new Blob([files["assets/source"].slice().buffer], { type: parsed.source.mime });
    const image = await decodeImage(blob);
    source = { kind: "image", name: parsed.source.name, width: image.width, height: image.height, blob };
  }
  return { version: 1, id: `import-${crypto.randomUUID()}`, originId: parsed.originId, kind: parsed.kind, draft: clone(parsed.draft), compiled: parsed.compiled ? clone(parsed.compiled) : null, values: parsed.values, source };
}
export async function decodeImage(blob: Blob): Promise<HTMLImageElement> {
  if (!blob.type.startsWith("image/") || blob.size > LIMIT) throw new Error("请选择 64 MB 以内的图片文件。 ");
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || Math.max(image.naturalWidth, image.naturalHeight) > 16384) throw new Error("图片无效或尺寸超过 16384px。 ");
    return image;
  } catch (error) { throw new Error(error instanceof Error && error.message.includes("16384") ? error.message : "图片解码失败，请换一张图片。 "); }
  finally { URL.revokeObjectURL(url); }
}
export async function resolveSource(source: SourceAsset): Promise<TexImageSource> {
  return source.kind === "builtin" ? makeTestCard() : decodeImage(source.blob);
}
export async function exportTD(project: WorkspaceProject): Promise<{ filename: string; blob: Blob }> {
  if (!project.compiled || JSON.stringify(project.compiled) !== JSON.stringify(project.draft)) throw new Error("请先成功运行当前代码，再导出 TD。 ");
  const name = fileStem(project.draft.meta.name);
  const options = { state: project.values, exportId: project.originId ?? project.id };
  if (isFilter(project.compiled)) return { filename: `${name}_td.glsl`, blob: new Blob([wrapTD(project.compiled, options)], { type: "text/plain;charset=utf-8" }) };
  const files: Zippable = {};
  for (const file of simTDFiles(project.compiled, options)) files[file.name] = strToU8(file.text);
  return { filename: `${name}_td.zip`, blob: await pack(files) };
}

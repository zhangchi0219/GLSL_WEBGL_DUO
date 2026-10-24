import type { SimModule, SimPassDef } from "../sims/types";

export const TD_TARGET = "TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel";
export const tdOperator = (pass: SimPassDef): "GLSL TOP" | "GLSL Multi TOP" => pass.inputs.length > 3 ? "GLSL Multi TOP" : "GLSL TOP";

// Display names and registry IDs stay unchanged. Only suggested TD OP names
// use ASCII snake_case, with role prefixes to separate TOPs, DATs and feedback.
export function tdIdentifier(value: string): string {
  const name = value.normalize("NFKD").replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return !name ? "shader" : /^[0-9]/.test(name) ? `op_${name}` : name;
}

export function tdNames(mod: SimModule, exportId = mod.meta.id) {
  const used = new Set<string>();
  const unique = (candidate: string) => {
    let name = candidate, suffix = 2;
    while (used.has(name)) name = `${candidate}_${suffix++}`;
    used.add(name); return name;
  };
  const passes = [...(mod.init ?? []), ...mod.step, mod.display];
  return {
    component: `base_${tdIdentifier(exportId)}`,
    source: unique("source_image"),
    top: new Map(passes.map((pass) => [pass.name, unique(`${pass.inputs.length > 3 ? "glslmulti" : "glsl"}_${tdIdentifier(pass.name)}`)])),
    dat: new Map(passes.map((pass) => [pass.name, unique(`shader_${tdIdentifier(pass.name)}`)])),
    feedback: new Map(mod.buffers.map((b) => [b.name, unique(`feedback_${tdIdentifier(b.name)}`)])),
    constant: new Map(mod.buffers.map((b) => [b.name, unique(`constant_${tdIdentifier(b.name)}`)])),
  };
}

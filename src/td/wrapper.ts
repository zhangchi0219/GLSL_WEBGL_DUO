import type { FilterModule, ParamDef, ParamState } from "../filters/types";
import type { SimModule, SimPassDef } from "../sims/types";
import { TD_TARGET, tdIdentifier, tdNames, tdOperator } from "./naming";

// Wrap a filter's shared core in the TouchDesigner GLSL TOP boilerplate and a
// setup comment block. Used by BOTH the in-app "Download for TouchDesigner"
// button and the scripts/gen-td.ts generator — one source for the wrapper too.

function fmtFloat(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

function fmtValue(p: ParamDef): string {
  if (p.type === "color" || p.type === "vec2") return (p.value as number[]).map(fmtFloat).join(" ");
  if (p.type === "bool") return p.value ? "1" : "0";
  return fmtFloat(p.value as number);
}

function tdType(p: ParamDef): string {
  return p.type === "color" ? "vec3" : p.type === "vec2" ? "vec2" : "float";
}

function pad(s: string, n: number): string {
  return s.length >= n ? s + " " : s + " ".repeat(n - s.length);
}

export interface TDExportOptions { state?: ParamState; exportId?: string; sourceRequired?: boolean }
function tunedParams(params: ParamDef[], options: TDExportOptions): ParamDef[] {
  return params.map((p) => ({ ...p, value: options.state?.[p.name] ?? p.value }));
}
export function wrapTD(m: FilterModule, options: TDExportOptions = {}): string {
  const { meta, params, core } = m;
  const animated = true;
  const timeArg = "uTime";

  const setup = tunedParams(params, options)
    .map((p) => `  ${pad(p.name, 13)}${pad(tdType(p), 6)}${pad(fmtValue(p), 14)} ${p.label}`)
    .join("\n");
  const timeSetup = animated
    ? "  uTime        float expr: absTime.seconds   drives the animation\n"
    : "";
  const perf = meta.heavy
    ? "\nPerf: many texture taps per pixel — at 4K lower the radius/length or downres first."
    : "";
  const extra = meta.tdNote ? "\n" + meta.tdNote : "";
  const sourceRequired = options.sourceRequired !== false;

  return `// ============================================================
// ${meta.name} — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: ${TD_TARGET}. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_${tdIdentifier(options.exportId ?? meta.id)}; Pixel Shader DAT: shader_${tdIdentifier(options.exportId ?? meta.id)}.
// Export ID: ${options.exportId ?? meta.id}. Generated from the shared GLSL core.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
${sourceRequired ? "#define INPUT0 sTD2DInputs[0]" : "// Procedural source: no input texture required."}
#define uResolution (uTDOutputInfo.res.zw)
uniform float uTime;
uniform vec2 uMouse;

// ===================== SHARED CORE =====================
${core}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, ${timeArg}));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). ${sourceRequired ? "Connect your source TOP to Input 0." : "No input TOP required; set output resolution explicitly."}
Set Input Extend Mode UV = Hold, Input Smoothness = Interpolate Pixels (no mipmaps).
If the build exposes Working Color Space, use Passthrough when matching the browser's raw RGB values.

Vectors page (custom uniforms):
${timeSetup}  uMouse       vec2  0.5 0.5   Mouse In CHOP normalized 0–1, y-up
${setup}

Inputs: ${sourceRequired ? "Input 0 = source TOP (sampled as INPUT0)." : "none. Connect this TOP's output to the effect's source input."}${perf}${extra}
=============================================== */
`;
}

// ---------------------------------------------------------------------------
// Stateful sims → one GLSL TOP kernel per pass + a NETWORK.md wiring guide.
// A stateful sim is NOT a single drop-in TOP: each buffer that is read AND
// written becomes a Feedback TOP loop, and the kernel's "self" input connects to
// that feedback. The pass cores are the SAME strings the web app runs.
// ---------------------------------------------------------------------------

function inputLabel(pass: SimPassDef, name: string): string {
  return name === "self" ? `${pass.out} current state (see NETWORK.md for its exact producer)` : name === "source" ? "source image TOP" : `${name} buffer TOP`;
}

export function wrapSimPassTD(mod: SimModule, pass: SimPassDef): string {
  const names = tdNames(mod);
  const defines = pass.inputs.map((_n, i) => `#define INPUT${i} sTD2DInputs[${i}]`).join("\n");
  const inComment = pass.inputs.length
    ? pass.inputs.map((n, i) => `//   Input ${i}: ${inputLabel(pass, n)}`).join("\n")
    : "//   (no inputs)";
  const iter = pass.iterations && pass.iterations > 1
    ? `\n// Run this kernel ${pass.iterations}× per frame via GLSL TOP Common page\n// Num Passes = ${pass.iterations}; subsequent passes read the previous output as Input 0.\n// uIteration = float(uTDPass), starting at zero.`
    : "";

  return `// ============================================================
// ${mod.meta.name} — pass "${pass.name}" → buffer "${pass.out}"
// ${tdOperator(pass)} kernel (GLSL 4.60). AUTO-GENERATED.
// Target: ${TD_TARGET}.
// TOP: ${names.top.get(pass.name)}; Pixel Shader DAT: ${names.dat.get(pass.name)}.
${pass.inputs.length > 3 ? "// Four inputs: use GLSL Multi TOP; ordinary GLSL TOP has only three wired inputs.\n" : ""}
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
${inComment}${iter}
// ============================================================

layout(location = 0) out vec4 fragColor;
${defines}

#define uResolution (uTDOutputInfo.res.zw)
#define uTexel (uTDOutputInfo.res.xy)
#define uIteration float(uTDPass)

// Wire these on the Vectors / CHOP pages (see NETWORK.md):
uniform float uTime;       // absTime.seconds
uniform float uDt;         // 1.0/me.time.rate (or a Constant CHOP)
uniform float uFrame;      // absTime.frame
uniform vec2  uCanvasResolution; // display TOP resolution, even on data passes
uniform vec2  uMouse;      // Mouse In CHOP (normalized, y-up)
uniform vec2  uMouseVel;   // Mouse In CHOP slope (tx,ty)
uniform float uMouseDown;  // Mouse In CHOP left button
// Custom params (uForce, uRadius, …) are declared by the SHARED CORE below —
// add them on the Vectors page with the values from NETWORK.md.

// ===================== SHARED CORE =====================
${pass.core}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}
`;
}

export function simNetworkMd(mod: SimModule, options: TDExportOptions = {}): string {
  const names = tdNames(mod, options.exportId);
  const written = new Set<string>(), feedback = new Set<string>();
  const updated = new Set(mod.step.map((p) => p.out));
  for (const pass of [...mod.step, mod.display]) {
    for (const raw of pass.inputs) {
      const name = raw === "self" ? pass.out : raw;
      if (name !== "source" && updated.has(name) && !written.has(name)) feedback.add(name);
    }
    if (pass.out !== "screen") written.add(pass.out);
  }
  const initial = new Map(mod.buffers.map((b) => [b.name, names.top.get([...(mod.init ?? [])].reverse().find((p) => p.out === b.name)?.name ?? "") ?? names.constant.get(b.name)!]));
  const latest = new Map(mod.buffers.map((b) => [b.name, feedback.has(b.name) ? `${names.feedback.get(b.name)} (previous frame)` : initial.get(b.name)!]));
  const connections = mod.step.map((pass, index) => {
    const inputs = pass.inputs.map((raw, i) => {
      const name = raw === "self" ? pass.out : raw;
      return `Input ${i} = ${name === "source" ? names.source : latest.get(name) ?? name}`;
    }).join("; ") || "no inputs";
    latest.set(pass.out, names.top.get(pass.name)!);
    return `${index + 1}. **${pass.name}**: \`${names.top.get(pass.name)}\` (${tdOperator(pass)}) → \`${pass.out}\`; ${inputs}; Num Passes = ${pass.iterations ?? 1}. Kernel: \`${pass.name}.glsl\`.`;
  }).join("\n");
  const bufferLines = mod.buffers.map((b) => `- \`${b.name}\`: ${b.components} channels, ${b.size ? `fixed ${b.size[0]} x ${b.size[1]} pixels` : `${(b.scale ?? 1) * 100}% of the preview resolution`}, RGBA ${b.format === "rgba32f" ? "32" : "16"}-bit float, ${b.filter ?? "linear"} sampling. ${feedback.has(b.name) ? `Feedback TOP required: \`${names.feedback.get(b.name)}\`; initialization input = \`${initial.get(b.name)}\`; Target TOP = final \`${latest.get(b.name)}\` output.` : "Intermediate/read-only buffer; no cross-frame Feedback TOP required."}`).join("\n");
  const paramLines = tunedParams(mod.params, options).map((p) => `  ${p.name}  ${tdType(p)}  ${fmtValue(p)}  (${p.label})`).join("\n");
  const displayInputs = mod.display.inputs.map((name, index) => `Input ${index} = ${name === "source" ? names.source : latest.get(name) ?? name}`).join("; ");
  const usesSource = [...(mod.init ?? []), ...mod.step, mod.display].some((pass) => pass.inputs.includes("source"));
  return `# ${mod.meta.name} — TouchDesigner network

${mod.meta.desc}

Export ID: \`${options.exportId ?? mod.meta.id}\`. Custom values below match the exported browser controls.
Target: ${TD_TARGET}. TD 2021 and earlier are outside this export target. No POP/compute-only API is used; the same pixel shader interface is used in 2023 and 2025 branches. This API target is not a claim of native runtime testing on every build.
Use **GLSL Multi TOP** for passes with four inputs; **GLSL TOP** for zero to three inputs. The operator type is stated beside every pass below. ${usesSource ? `Connect your source image as \`${names.source}\`.` : "No source TOP required."}
Set each kernel TOP's output resolution explicitly to its buffer resolution; set the display TOP to the full preview resolution. Use each buffer's floating-point format and sampling mode below; disable mipmapping. Do not scale fixed data textures with the display. Match the browser's displayed render size when comparing pixel-dependent effects.

## Operator names
Create a Base COMP named \`${names.component}\` and put this network inside it. Display labels/registry IDs and filenames remain unchanged; OP names use ASCII snake_case and distinct TOP/DAT/Feedback prefixes. If that Base COMP already exists, create a separate component with a unique suffix.

| Pass | Operator | TOP name | Pixel Shader DAT | File |
| --- | --- | --- | --- | --- |
${[...(mod.init ?? []), ...mod.step, mod.display].map((p) => `| ${p.name} | ${tdOperator(p)} | \`${names.top.get(p.name)}\` | \`${names.dat.get(p.name)}\` | \`${p.name}.glsl\` |`).join("\n")}

## Sampling and color settings
- On **every shader TOP**, set GLSL Version = 4.60 (\`glsl460\`), Mode = Vertex/Pixel (\`vertexpixel\`), and Input Extend Mode UV = Hold (\`inputextenduv = hold\`) to match CLAMP_TO_EDGE.
- Fixed-size buffers: set Output Resolution = Custom, the exact width/height below, and **Use Global Res Multiplier = Off** (\`resmult = 0\`). Otherwise data texture indices and sorting lengths can break.
- Configure **Input Smoothness** (\`inputfiltertype\`) on the consuming shader TOP. **Viewer Smoothness** (\`filtertype\`) only changes the viewer, not shader sampling. Use nearest for passes sampling data-only inputs; use linear for continuous image/field sampling. Integer lookups use \`texelFetch\` and bypass interpolation, including mixed data/field passes. DLA aggregate display uses nearest; the other displays use linear. Do not enable mipmaps.
- Store simulation state as the specified linear float format (\`rgba16float\` or \`rgba32float\`), never sRGB/8-bit. On builds with color management, set Working Color Space = Passthrough for raw-RGB comparison; configure custom color uniforms on **Vectors**, not the color-managed Colors page. The final display can use RGBA 8-bit fixed (\`rgba8fixed\`).

## Buffers
${bufferLines}

## Initialization (once on load, resize or reset)
${(mod.init ?? []).map((p, i) => `${i + 1}. **${p.name}**: \`${names.top.get(p.name)}\` seeds \`${p.out}\` with \`${p.name}.glsl\`; inputs: ${p.inputs.join(", ") || "none"}.`).join("\n") || "No explicit initialization passes."}

For buffers marked as feedback, connect the seed TOP to the Feedback TOP input. Enable Reset while initializing, then release Reset. Read-only initialized buffers (for example L-system structure) connect directly from their initialization shader; they do not need a Feedback TOP. For buffers without an explicit seed, use a zero-valued Constant TOP of the same size and floating-point format. Reset again after resizing or changing kernels.
${mod.resetOnParams?.length ? `\nReset all feedback together after changing these initialization controls: ${mod.resetOnParams.join(", ")}. Fixed logical buffers survive display-only resizing in the browser.\n` : ""}

## Per-frame pass order and exact input connections
${connections}

Then **display**: \`${names.top.get(mod.display.name)}\` (${tdOperator(mod.display)}, \`display.glsl\`) uses ${displayInputs} and outputs to screen.

## Feedback and iterations
For each buffer marked as feedback, set the Feedback TOP's **Target TOP** to the final writer listed above. Its output supplies previous-frame state to the first reader; later readers in the same frame use the latest writer's output from the connections table. Do not wire every \`self\` input directly to the same Feedback TOP: a buffer may be written several times in one frame.
Keep any final writer that is not an ancestor of display cooking every frame.

A kernel with Num Passes > 1 uses the GLSL TOP Common page **Passes** parameter. Its first input must be \`self\`; TouchDesigner replaces Input 0 with the previous pass result for subsequent passes, while the other inputs remain fixed. This is same-frame iteration, not repeated frame feedback. Shared \`uIteration\` maps to \`float(uTDPass)\`, starting at zero for each kernel. Sorting and prefix-sum passes depend on this index.

## Shared uniforms
Vectors / CHOP exports (only active uniforms need a value):
\`\`\`
  uTime       float  absTime.seconds
  uDt         float  1.0/me.time.rate
  uFrame      float  absTime.frame
  uCanvasResolution vec2  display TOP width and height (also on fixed-size data passes)
  uMouse      vec2   normalized 0–1, y-up
  uMouseVel   vec2   UV displacement per input update, decays by 0.85 each browser frame
  uMouseDown  float  left button 0 or 1
${paramLines}
\`\`\`
\`uResolution\` / \`uTexel\` come from each TOP's own output info.
A Mouse In CHOP can drive position/button. A Slope CHOP produces velocity per second: multiply by dt to approximate UV displacement, and add decay if you want to match the browser's input response. The browser clamps simulation dt to 1/30 second for stability.

The shared pass cores match the browser exactly; frame timing, input sampling and Feedback scheduling must also be configured to compare motion.
${mod.meta.tdNote ? `\n${mod.meta.tdNote}\n` : ""}

References: [Feedback TOP](https://derivative.ca/UserGuide/Feedback_TOP), [GLSL TOP](https://derivative.ca/UserGuide/GLSL_TOP), [GLSL Multi TOP](https://derivative.ca/UserGuide/GLSL_Multi_TOP), [Write a GLSL TOP](https://derivative.ca/UserGuide/Write_a_GLSL_TOP), [2022 Vulkan baseline](https://derivative.ca/release/202224200/66252).
`;
}

export interface TDFile {
  name: string;
  text: string;
}

export function simTDFiles(mod: SimModule, options: TDExportOptions = {}): TDFile[] {
  const passes = [...(mod.init ?? []), ...mod.step, mod.display];
  // de-dup pass names (e.g. multiple clear* are distinct; keep first by name)
  const seen = new Map<string, string>();
  const files: TDFile[] = [];
  for (const p of passes) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name)) throw new Error(`TD Pass 文件名无效：${p.name}`);
    const key = p.name.toLowerCase(), prior = seen.get(key);
    if (prior === p.name) continue;
    if (prior) throw new Error(`TD Pass 文件名在 Windows 上重名：${prior} / ${p.name}`);
    seen.set(key, p.name);
    files.push({ name: `${p.name}.glsl`, text: wrapSimPassTD(mod, p) });
  }
  files.push({ name: "NETWORK.md", text: simNetworkMd(mod, options) });
  return files;
}

// Single concatenated text for the in-app download button.
export function simBundle(mod: SimModule): string {
  return simTDFiles(mod)
    .map((f) => `// ============================================================\n// FILE: ${f.name}\n// ============================================================\n${f.text}`)
    .join("\n\n");
}

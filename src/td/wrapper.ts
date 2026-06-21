import type { FilterModule, ParamDef } from "../filters/types";
import type { SimModule, SimPassDef } from "../sims/types";

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

export function wrapTD(m: FilterModule): string {
  const { meta, params, core } = m;
  const animated = !!meta.animated;
  const timeArg = animated ? "uTime" : "0.0";
  const timeUniform = animated ? "uniform float uTime;\n\n" : "";

  const setup = params
    .map((p) => `  ${pad(p.name, 13)}${pad(tdType(p), 6)}${pad(fmtValue(p), 14)} ${p.label}`)
    .join("\n");
  const timeSetup = animated
    ? "  uTime        float expr: absTime.seconds   drives the animation\n"
    : "";
  const perf = meta.heavy
    ? "\nPerf: many texture taps per pixel — at 4K lower the radius/length or downres first."
    : "";
  const extra = meta.tdNote ? "\n" + meta.tdNote : "";

  return `// ============================================================
// ${meta.name} — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/${meta.id}.ts by \`npm run gen:td\`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
${core.trim()}
// =================== END SHARED CORE ===================

${timeUniform}void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, ${timeArg}));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
${timeSetup}${setup}

Inputs: Input 0 = source TOP (sampled as INPUT0).${perf}${extra}
=============================================== */
`;
}

// ---------------------------------------------------------------------------
// Stateful sims → one GLSL TOP kernel per pass + a NETWORK.md wiring guide.
// A stateful sim is NOT a single drop-in TOP: each buffer that is read AND
// written becomes a Feedback TOP loop, and the kernel's "self" input connects to
// that feedback. The pass cores are the SAME strings the web app runs.
// ---------------------------------------------------------------------------

function declParams(params: ParamDef[]): string {
  return params.map((p) => `uniform ${tdType(p)} ${p.name};`).join("\n");
}

function inputLabel(pass: SimPassDef, name: string): string {
  return name === "self" ? `${pass.out} (Feedback TOP loop)` : name === "source" ? "source image TOP" : `${name} buffer TOP`;
}

export function wrapSimPassTD(mod: SimModule, pass: SimPassDef): string {
  const defines = pass.inputs.map((_n, i) => `#define INPUT${i} sTD2DInputs[${i}]`).join("\n");
  const inComment = pass.inputs.length
    ? pass.inputs.map((n, i) => `//   Input ${i}: ${inputLabel(pass, n)}`).join("\n")
    : "//   (no inputs)";
  const iter = pass.iterations && pass.iterations > 1
    ? `\n// Run this kernel ${pass.iterations}× per frame (Jacobi iterations) via a\n// Feedback TOP loop on '${pass.out}' that cooks ${pass.iterations} times.`
    : "";

  return `// ============================================================
// ${mod.meta.name} — pass "${pass.name}" → buffer "${pass.out}"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
${inComment}${iter}
// ============================================================

layout(location = 0) out vec4 fragColor;
${defines}

#define uResolution (uTDOutputInfo.res.zw)
#define uTexel (uTDOutputInfo.res.xy)

// Wire these on the Vectors / CHOP pages (see NETWORK.md):
uniform float uTime;       // absTime.seconds
uniform float uDt;         // 1.0/me.time.rate (or a Constant CHOP)
uniform float uFrame;      // absTime.frame
uniform vec2  uMouse;      // Mouse In CHOP (normalized, y-up)
uniform vec2  uMouseVel;   // Mouse In CHOP slope (tx,ty)
uniform float uMouseDown;  // Mouse In CHOP left button
${declParams(mod.params)}

// ===================== SHARED CORE =====================
${pass.core.trim()}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}
`;
}

export function simNetworkMd(mod: SimModule): string {
  const bufLines = mod.buffers
    .map((b) => `- \`${b.name}\` — ${b.components}ch, ${(b.scale ?? 1) * 100}% res, **RGBA 16-bit float**, inside a Feedback TOP loop.`)
    .join("\n");
  const stepLines = mod.step
    .map((p, i) => {
      const ins = p.inputs.map((n) => (n === "self" ? `${p.out}(fb)` : n)).join(", ") || "—";
      const it = p.iterations && p.iterations > 1 ? ` ×${p.iterations}` : "";
      return `${i + 1}. **${p.name}**${it} → \`${p.out}\`  (inputs: ${ins})  — \`${p.name}.glsl\``;
    })
    .join("\n");
  const paramLines = mod.params
    .map((p) => `  ${p.name}  ${tdType(p)}  ${fmtValue(p)}  (${p.label})`)
    .join("\n");

  return `# ${mod.meta.name} — TouchDesigner network

${mod.meta.desc}

A stateful simulation is a small **network**, not one TOP. Each buffer below lives
in a **Feedback TOP** loop; a GLSL TOP (one per kernel) reads the feedback via its
\`self\` input and writes the next state. Use **RGBA 16-bit float** on every TOP.

## Buffers (Feedback TOP loops)
${bufLines}

## Per-frame pass order
${stepLines}

Then the **display** kernel (\`display.glsl\`) reads \`${mod.display.inputs.join(", ")}\`
and outputs to screen.

## Shared uniforms on every GLSL TOP
Vectors page / CHOP exports:
\`\`\`
  uTime       float  absTime.seconds
  uDt         float  1.0/me.time.rate     (or a Constant CHOP)
  uFrame      float  absTime.frame
  uMouse      vec2   Mouse In CHOP (tx,ty), normalized 0-1, y-up
  uMouseVel   vec2   Mouse In CHOP slope (use a Slope CHOP on tx,ty)
  uMouseDown  float  Mouse In CHOP left button
${paramLines}
\`\`\`
\`uResolution\`/\`uTexel\` are #defined from the TOP's own output info — set each
GLSL TOP's resolution to its buffer's resolution.

## Wiring sketch
- For each buffer B: GLSL TOP \`<pass>\` → Feedback TOP \`B_fb\` → back into the
  GLSL TOP's \`self\` input. Order the per-frame passes as listed (a chain of GLSL
  TOPs sharing the feedback buffers).
- The **pressure** kernel runs ${mod.step.find((p) => p.name === "pressure")?.iterations ?? 1}× — loop its Feedback TOP that many cooks, or chain that many copies.
- Note: matching the browser exactly is fiddly; this reproduces the same kernels.
  For production fluid in TD, also consider native nodes, but these kernels are
  the faithful port of the web version.
`;
}

export interface TDFile {
  name: string;
  text: string;
}

export function simTDFiles(mod: SimModule): TDFile[] {
  const passes = [...(mod.init ?? []), ...mod.step, mod.display];
  // de-dup pass names (e.g. multiple clear* are distinct; keep first by name)
  const seen = new Set<string>();
  const files: TDFile[] = [];
  for (const p of passes) {
    if (seen.has(p.name)) continue;
    seen.add(p.name);
    files.push({ name: `${p.name}.glsl`, text: wrapSimPassTD(mod, p) });
  }
  files.push({ name: "NETWORK.md", text: simNetworkMd(mod) });
  return files;
}

// Single concatenated text for the in-app download button.
export function simBundle(mod: SimModule): string {
  return simTDFiles(mod)
    .map((f) => `// ============================================================\n// FILE: ${f.name}\n// ============================================================\n${f.text}`)
    .join("\n\n");
}

import type { FilterModule, ParamDef } from "../filters/types";

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

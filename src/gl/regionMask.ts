// Shared two-box effect mask, added to EVERY filter by the platform wrappers
// (src/gl/wrappers.ts for WebGL2, src/td/wrapper.ts for TouchDesigner). Each box
// (A/B) has its own center, size, and amount; the filter effect applies inside
// the boxes (feathered), the original INPUT0 shows through elsewhere. Lives in
// the wrapper — NOT in any filter's `core` — so every core stays byte-identical
// across both targets. Default `uMaskEnable = false` ⇒ zero behavior change.

import type { ParamDef } from "../filters/types";

// uMask* prefix is distinct from noisewarp's uRegion*/uFlow*, so noisewarp can
// carry both its own flow regions and this generic mask without name collisions.
export const REGION_PARAMS: ParamDef[] = [
  { name: "uMaskEnable", type: "bool", value: false, label: "Region Mask" },
  { name: "uMaskACenter", type: "vec2", value: [0.3, 0.5], min: 0.0, max: 1.0, step: 0.01, label: "A Center" },
  { name: "uMaskASize", type: "vec2", value: [0.35, 0.6], min: 0.0, max: 1.0, step: 0.01, label: "A Size" },
  { name: "uMaskAAmt", type: "float", value: 1.0, min: 0.0, max: 1.0, step: 0.01, label: "A Amount" },
  { name: "uMaskBCenter", type: "vec2", value: [0.7, 0.5], min: 0.0, max: 1.0, step: 0.01, label: "B Center" },
  { name: "uMaskBSize", type: "vec2", value: [0.35, 0.6], min: 0.0, max: 1.0, step: 0.01, label: "B Size" },
  { name: "uMaskBAmt", type: "float", value: 1.0, min: 0.0, max: 1.0, step: 0.01, label: "B Amount" },
  { name: "uMaskFeather", type: "float", value: 0.04, min: 0.001, max: 0.5, step: 0.005, label: "Mask Edge" },
  { name: "uMaskShow", type: "bool", value: false, label: "Show Boxes" },
];

// Uniform declarations + the two helpers. Inserted after the shared core, before
// main(), in both wrappers. Bools arrive as floats (renderer.ts sets 1.0/0.0).
export const REGION_GLSL = /* glsl */ `
uniform float uMaskEnable;
uniform vec2  uMaskACenter;
uniform vec2  uMaskASize;
uniform float uMaskAAmt;
uniform vec2  uMaskBCenter;
uniform vec2  uMaskBSize;
uniform float uMaskBAmt;
uniform float uMaskFeather;
uniform float uMaskShow;

float _maskBox(vec2 uv, vec2 c, vec2 s){
    vec2 d = abs(uv - c) - 0.5 * s;
    return max(d.x, d.y);                 // <0 inside the rectangle, >0 outside
}

vec4 _applyMask(vec4 eff, vec4 orig, vec2 uv){
    if (uMaskEnable < 0.5) return eff;     // default off ⇒ unchanged
    float ea = _maskBox(uv, uMaskACenter, uMaskASize);
    float eb = _maskBox(uv, uMaskBCenter, uMaskBSize);
    float ia = (1.0 - smoothstep(0.0, uMaskFeather, ea)) * uMaskAAmt;
    float ib = (1.0 - smoothstep(0.0, uMaskFeather, eb)) * uMaskBAmt;
    vec4 outc = mix(orig, eff, clamp(max(ia, ib), 0.0, 1.0));
    if (uMaskShow > 0.5){                  // A = orange, B = cyan outlines
        outc = mix(outc, vec4(1.0, 0.3, 0.0, 1.0), (1.0 - smoothstep(0.0, 0.004, abs(ea))) * 0.9);
        outc = mix(outc, vec4(0.0, 0.7, 1.0, 1.0), (1.0 - smoothstep(0.0, 0.004, abs(eb))) * 0.9);
    }
    return outc;
}
`;

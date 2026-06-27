// ============================================================
// Glitch / Datamosh — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/glitch.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uIntensity;
uniform float uBlock;
uniform float uSpeed;
uniform float uColorShift;
uniform float uScanNoise;

float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    float tq = floor(time * uSpeed * 12.0);

    float row = floor(uv.y * res.y / max(uBlock, 1.0));
    float n = hash21(vec2(row, tq));
    float shift = 0.0;
    if (n > 1.0 - uIntensity)
        shift = (hash21(vec2(row, tq + 7.0)) - 0.5) * uIntensity * 0.25;

    vec2 guv = uv + vec2(shift, 0.0);
    float cs = uColorShift * texel.x * 18.0 * (0.5 + n);
    vec3 col;
    col.r = texture(INPUT0, guv + vec2(cs, 0.0)).r;
    col.g = texture(INPUT0, guv).g;
    col.b = texture(INPUT0, guv - vec2(cs, 0.0)).b;

    float sn = hash21(vec2(floor(uv.y * res.y), tq));
    if (sn > 1.0 - uScanNoise * 0.25)
        col += (hash21(vec2(uv.x * res.x, tq)) - 0.5) * 0.6;

    return vec4(clamp(col, 0.0, 1.0), 1.0);
}
// =================== END SHARED CORE ===================

uniform float uTime;


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

void main(){
    vec4 eff = renderMain(vUV.st, uTDOutputInfo.res.zw, uTime);
    fragColor = TDOutputSwizzle(_applyMask(eff, texture(INPUT0, vUV.st), vUV.st));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uTime        float expr: absTime.seconds   drives the animation
  uIntensity   float 0.4            Intensity
  uBlock       float 24.0           Block Height (px)
  uSpeed       float 1.0            Speed
  uColorShift  float 0.5            Color Shift
  uScanNoise   float 0.3            Scan Noise
  uMaskEnable  float 0              Region Mask
  uMaskACenter vec2  0.3 0.5        A Center
  uMaskASize   vec2  0.35 0.6       A Size
  uMaskAAmt    float 1.0            A Amount
  uMaskBCenter vec2  0.7 0.5        B Center
  uMaskBSize   vec2  0.35 0.6       B Size
  uMaskBAmt    float 1.0            B Amount
  uMaskFeather float 0.04           Mask Edge
  uMaskShow    float 0              Show Boxes

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

// ============================================================
// CRT / Scanlines — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/crt.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uCurvature;
uniform float uScanline;
uniform float uScanDepth;
uniform float uMaskDepth;
uniform float uAberration;
uniform float uVignette;
uniform float uFlicker;

vec2 crtCurve(vec2 uv, float k){
    uv = uv * 2.0 - 1.0;
    vec2 offset = uv.yx * uv.yx * k;
    uv += uv * offset;
    return uv * 0.5 + 0.5;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 cuv = crtCurve(uv, uCurvature);
    if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0)
        return vec4(0.0, 0.0, 0.0, 1.0);

    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    float ab = uAberration * texel.x * 6.0;
    vec3 col;
    col.r = texture(INPUT0, cuv + vec2(ab, 0.0)).r;
    col.g = texture(INPUT0, cuv).g;
    col.b = texture(INPUT0, cuv - vec2(ab, 0.0)).b;

    float line = 0.5 + 0.5 * sin(cuv.y * res.y * 3.14159265 / max(uScanline, 1.0));
    col *= mix(1.0, line, uScanDepth);

    float m = mod(floor(cuv.x * res.x), 3.0);
    vec3 mask = vec3(m == 0.0 ? 1.0 : 0.55, m == 1.0 ? 1.0 : 0.55, m == 2.0 ? 1.0 : 0.55);
    col *= mix(vec3(1.0), mask, uMaskDepth);

    col *= 1.0 + uFlicker * 0.12 * (fract(sin(time * 91.7) * 4731.3) - 0.5);

    vec2 d = cuv - 0.5;
    col *= 1.0 - uVignette * dot(d, d);

    return vec4(col, 1.0);
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
  uCurvature   float 0.15           Curvature
  uScanline    float 2.0            Scanline Period
  uScanDepth   float 0.4            Scanline Depth
  uMaskDepth   float 0.3            RGB Mask
  uAberration  float 0.4            Aberration
  uVignette    float 0.5            Vignette
  uFlicker     float 0.1            Flicker
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

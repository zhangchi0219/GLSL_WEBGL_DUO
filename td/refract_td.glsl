// ============================================================
// Refraction Ripple — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/refract.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uSpeed;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uChroma;

float ripH(vec2 uv, vec2 res, float t){
    vec2 a = uv * vec2(res.x / res.y, 1.0);
    vec2 c1 = vec2(0.3, 0.4) + 0.12 * vec2(sin(t * 0.7), cos(t * 0.5));
    vec2 c2 = vec2(0.7, 0.6) + 0.12 * vec2(cos(t * 0.6), sin(t * 0.8));
    vec2 c3 = vec2(0.5, 0.2) + 0.12 * vec2(sin(t * 0.9), cos(t * 0.4));
    float h = 0.0;
    h += sin(length(a - c1) * uFrequency - t * 3.0);
    h += sin(length(a - c2) * uFrequency * 1.1 - t * 3.5);
    h += sin(length(a - c3) * uFrequency * 0.9 - t * 2.5);
    return h / 3.0;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float t = time * uSpeed;
    float eps = 1.5 / max(res.x, res.y);
    float hx = ripH(uv + vec2(eps, 0.0), res, t) - ripH(uv - vec2(eps, 0.0), res, t);
    float hy = ripH(uv + vec2(0.0, eps), res, t) - ripH(uv - vec2(0.0, eps), res, t);
    vec2 n = vec2(hx, hy) / (2.0 * eps);

    vec2 off = n * uAmplitude * 0.012;
    float ca = uChroma * 0.012;
    vec3 col;
    col.r = texture(INPUT0, uv + off * (1.0 + ca)).r;
    col.g = texture(INPUT0, uv + off).g;
    col.b = texture(INPUT0, uv + off * (1.0 - ca)).b;
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
  uSpeed       float 1.0            Speed
  uFrequency   float 28.0           Frequency
  uAmplitude   float 1.0            Amplitude
  uChroma      float 0.6            Chroma
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

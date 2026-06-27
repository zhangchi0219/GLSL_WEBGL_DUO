// ============================================================
// Caustic Water — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/caustics.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uSpeed;
uniform float uScale;
uniform float uStrength;
uniform float uCaustic;
uniform float uChroma;

float waterH(vec2 uv, vec2 res, float t){
    vec2 p = (uv * vec2(res.x / res.y, 1.0)) * uScale * 8.0;
    float v = 0.0;
    v += sin(p.x + t);
    v += sin(p.y * 1.2 - t * 1.1);
    v += sin((p.x + p.y) * 0.8 + t * 0.7);
    v += sin(length(p - 4.0) * 1.3 - t * 1.4);
    return v * 0.25;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float t = time * uSpeed;
    float eps = 1.5 / max(res.x, res.y);
    float hx = waterH(uv + vec2(eps, 0.0), res, t) - waterH(uv - vec2(eps, 0.0), res, t);
    float hy = waterH(uv + vec2(0.0, eps), res, t) - waterH(uv - vec2(0.0, eps), res, t);
    vec2 n = vec2(hx, hy) / (2.0 * eps);

    vec2 off = n * uStrength * 0.01;
    float ca = uChroma * 0.01;
    vec3 col;
    col.r = texture(INPUT0, uv + off * (1.0 + ca)).r;
    col.g = texture(INPUT0, uv + off).g;
    col.b = texture(INPUT0, uv + off * (1.0 - ca)).b;

    float hb = waterH(uv, res, t);
    float c = pow(0.5 + 0.5 * sin(hb * 6.2831 * 2.0), 6.0);
    col += uCaustic * c;
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
  uScale       float 1.0            Scale
  uStrength    float 1.0            Refraction
  uCaustic     float 0.4            Caustic Light
  uChroma      float 0.5            Chroma
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

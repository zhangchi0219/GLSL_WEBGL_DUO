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

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
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

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

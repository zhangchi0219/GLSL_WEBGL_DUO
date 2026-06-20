// ============================================================
// Glitch / Datamosh — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (glitch).
// Animated by uTime → wire it on the Vectors page.
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

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uTime        float  expr: absTime.seconds   (drives the animation)
  uIntensity   float  0.4
  uBlock       float  24     block height (px)
  uSpeed       float  1.0
  uColorShift  float  0.5
  uScanNoise   float  0.3
Inputs: Input 0 = source TOP.  CHOP wiring: optional (uTime can be a CHOP export).
=============================================== */

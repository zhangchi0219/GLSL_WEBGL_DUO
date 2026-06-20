// ============================================================
// ASCII Art — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (ascii).
// Uses bit-coded 5x5 glyphs; `highp int` keeps the codes 32-bit on WebGL too.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uCell;
uniform float uColor;
uniform vec3  uInk;
uniform vec3  uPaper;

float luma(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); }

float character(highp int n, vec2 p){
    p = floor(p * vec2(4.0, -4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y){
        int a = int(round(p.x) + 5.0 * round(p.y));
        if (((n >> a) & 1) == 1) return 1.0;
    }
    return 0.0;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float cell = max(uCell, 4.0);
    vec2 pix = uv * res;
    vec2 buv = (floor(pix / cell) * cell + cell * 0.5) / res;
    vec3 src = texture(INPUT0, buv).rgb;
    float g = luma(src);

    highp int n = 4096;
    if (g > 0.2) n = 65600;
    if (g > 0.3) n = 163153;
    if (g > 0.4) n = 15255086;
    if (g > 0.5) n = 13121101;
    if (g > 0.6) n = 15252014;
    if (g > 0.7) n = 13195790;
    if (g > 0.8) n = 11512810;

    vec2 p = mod(pix / (cell * 0.5), 2.0) - vec2(1.0);
    float ch = character(n, p);
    vec3 fg = (uColor > 0.5) ? src : uInk;
    return vec4(mix(uPaper, fg, ch), 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uCell   float  8      character cell size (px)
  uColor  float  0      0 = ink/paper chars, 1 = chars tinted by source
  uInk    vec3   0.85 0.95 0.70
  uPaper  vec3   0.04 0.05 0.04
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

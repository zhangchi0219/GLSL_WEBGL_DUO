// ============================================================
// Mosaic / Pixelate — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (mosaic).
// No #version line — TD inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uBlock;
uniform float uRound;
uniform vec3  uBg;

vec4 renderMain(vec2 uv, vec2 res, float time){
    float bs = max(uBlock, 1.0);
    vec2 grid = res / bs;
    vec2 cell = floor(uv * grid);
    vec2 cuv  = (cell + 0.5) / grid;
    vec3 c = texture(INPUT0, cuv).rgb;
    if (uRound > 0.001){
        vec2 f = fract(uv * grid) - 0.5;
        float d = length(f) * 2.0;
        float m = smoothstep(uRound, uRound - 0.12, d);
        c = mix(uBg, c, m);
    }
    return vec4(c, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA.
Input 0  ← the TOP you want to pixelate (sampled as INPUT0).

Vectors page (custom uniforms):
  uBlock  float  16     block size in pixels
  uRound  float  0.0    0 = square cells, >0 = circular dots (try 1.0)
  uBg     vec3   0.04 0.04 0.04   gap color behind round dots
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

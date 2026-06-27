// ============================================================
// Mosaic / Pixelate — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/mosaic.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
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
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uBlock       float 16.0           Block Size (px)
  uRound       float 0.0            Roundness (0=square)
  uBg          vec3  0.04 0.04 0.04  Gap Color

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

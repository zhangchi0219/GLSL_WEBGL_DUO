// ============================================================
// Mosaic / Pixelate — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_mosaic; Pixel Shader DAT: shader_mosaic.
// Export ID: mosaic. Generated from the shared GLSL core.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define uResolution (uTDOutputInfo.res.zw)
uniform float uTime;
uniform vec2 uMouse;

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
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.
Set Input Extend Mode UV = Hold, Input Smoothness = Interpolate Pixels (no mipmaps).
If the build exposes Working Color Space, use Passthrough when matching the browser's raw RGB values.

Vectors page (custom uniforms):
  uTime        float expr: absTime.seconds   drives the animation
  uMouse       vec2  0.5 0.5   Mouse In CHOP normalized 0–1, y-up
  uBlock       float 16.0           Block Size (px)
  uRound       float 0.0            Roundness (0=square)
  uBg          vec3  0.04 0.04 0.04  Gap Color

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

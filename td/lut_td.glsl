// ============================================================
// Gradient Map LUT — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_lut; Pixel Shader DAT: shader_lut.
// Export ID: lut. Generated from the shared GLSL core.
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

uniform float uLevels;
uniform vec3  uShadow;
uniform vec3  uMid;
uniform vec3  uHigh;
uniform float uMix;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 src = texture(INPUT0, uv).rgb;
    float g = luma(src);
    if (uLevels > 1.5){ float L = uLevels; g = floor(g * (L - 1.0) + 0.5) / (L - 1.0); }
    vec3 grad = (g < 0.5) ? mix(uShadow, uMid, g * 2.0)
                          : mix(uMid, uHigh, (g - 0.5) * 2.0);
    return vec4(mix(src, grad, uMix), 1.0);
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
  uLevels      float 1.0            Posterize (1=off)
  uShadow      vec3  0.1 0.05 0.2   Shadows
  uMid         vec3  0.8 0.25 0.3   Midtones
  uHigh        vec3  0.98 0.9 0.55  Highlights
  uMix         float 1.0            Mix

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

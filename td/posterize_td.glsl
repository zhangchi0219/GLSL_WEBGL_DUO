// ============================================================
// Posterize / Grade — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_posterize; Pixel Shader DAT: shader_posterize.
// Export ID: posterize. Generated from the shared GLSL core.
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
uniform float uGamma;
uniform float uContrast;
uniform float uBrightness;
uniform float uSaturation;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 c = texture(INPUT0, uv).rgb;
    c = pow(max(c, 0.0), vec3(1.0 / max(uGamma, 0.01)));
    float L = max(uLevels, 2.0);
    c = floor(c * (L - 1.0) + 0.5) / (L - 1.0);
    c = (c - 0.5) * uContrast + 0.5 + uBrightness;
    c = mix(vec3(luma(c)), c, uSaturation);
    return vec4(clamp(c, 0.0, 1.0), 1.0);
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
  uLevels      float 5.0            Levels
  uGamma       float 1.0            Gamma
  uContrast    float 1.1            Contrast
  uBrightness  float 0.0            Brightness
  uSaturation  float 1.2            Saturation

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

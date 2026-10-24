// ============================================================
// Sharpen — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_sharpen; Pixel Shader DAT: shader_sharpen.
// Export ID: sharpen. Generated from the shared GLSL core.
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

uniform float uAmount;
uniform float uRadius;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = (1.0 / vec2(textureSize(INPUT0, 0))) * max(uRadius, 1.0);
    vec3 c = texture(INPUT0, uv).rgb;
    vec3 blur = (
        texture(INPUT0, uv + vec2(-1.0, 0.0) * t).rgb +
        texture(INPUT0, uv + vec2( 1.0, 0.0) * t).rgb +
        texture(INPUT0, uv + vec2( 0.0,-1.0) * t).rgb +
        texture(INPUT0, uv + vec2( 0.0, 1.0) * t).rgb +
        texture(INPUT0, uv + vec2(-1.0,-1.0) * t).rgb +
        texture(INPUT0, uv + vec2( 1.0, 1.0) * t).rgb +
        texture(INPUT0, uv + vec2( 1.0,-1.0) * t).rgb +
        texture(INPUT0, uv + vec2(-1.0, 1.0) * t).rgb) / 8.0;
    vec3 col = c + (c - blur) * uAmount;
    return vec4(clamp(col, 0.0, 1.0), 1.0);
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
  uAmount      float 1.0            Amount
  uRadius      float 1.0            Radius (px)

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

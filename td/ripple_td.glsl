// ============================================================
// Ripple Displace — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_ripple; Pixel Shader DAT: shader_ripple.
// Export ID: ripple. Generated from the shared GLSL core.
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

uniform float uAmplitude;
uniform float uFrequency;
uniform float uSpeed;
uniform vec2  uCenter;

vec4 renderMain(vec2 uv, vec2 res, float time){
    float aspect = res.x / res.y;
    vec2 d = uv - uCenter;
    vec2 da = d * vec2(aspect, 1.0);
    float dist = length(da);
    float wave = sin(dist * uFrequency - time * uSpeed);
    vec2 dir = (dist > 1e-5) ? d / dist : vec2(0.0);
    vec2 suv = uv + dir * wave * uAmplitude * 0.02;
    return vec4(texture(INPUT0, suv).rgb, 1.0);
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
  uAmplitude   float 0.5            Amplitude
  uFrequency   float 30.0           Frequency
  uSpeed       float 2.0            Speed
  uCenter      vec2  0.5 0.5        Center

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

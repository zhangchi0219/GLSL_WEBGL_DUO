// ============================================================
// Halftone / Dot Screen — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_halftone; Pixel Shader DAT: shader_halftone.
// Export ID: halftone. Generated from the shared GLSL core.
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

uniform float uScale;
uniform float uAngle;
uniform float uColor;
uniform vec3  uInk;
uniform vec3  uPaper;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
mat2 rot2(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float dotMask(vec2 uv, vec2 res, float cellPx, float angle, float value){
    vec2 p = rot2(angle) * (uv * res);
    vec2 cell = mod(p, cellPx) / cellPx - 0.5;
    float d = length(cell) * 2.0;
    float r = sqrt(clamp(value, 0.0, 1.0));
    return smoothstep(r + 0.08, r - 0.08, d);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 src = texture(INPUT0, uv).rgb;
    float a = radians(uAngle);
    vec3 col;
    if (uColor > 0.5){
        float mr = dotMask(uv, res, uScale, a + radians(15.0), src.r);
        float mg = dotMask(uv, res, uScale, a + radians(75.0), src.g);
        float mb = dotMask(uv, res, uScale, a + radians(45.0), src.b);
        col = vec3(mr, mg, mb);
    } else {
        float m = dotMask(uv, res, uScale, a, 1.0 - luma(src));
        col = mix(uPaper, uInk, m);
    }
    return vec4(col, 1.0);
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
  uScale       float 8.0            Dot Cell (px)
  uAngle       float 30.0           Screen Angle
  uColor       float 0              Color (RGB screens)
  uInk         vec3  0.06 0.05 0.05  Ink
  uPaper       vec3  0.93 0.91 0.84  Paper

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

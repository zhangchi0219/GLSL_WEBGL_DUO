// ============================================================
// Gradient Map LUT — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/lut.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

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
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uLevels      float 1.0            Posterize (1=off)
  uShadow      vec3  0.1 0.05 0.2   Shadows
  uMid         vec3  0.8 0.25 0.3   Midtones
  uHigh        vec3  0.98 0.9 0.55  Highlights
  uMix         float 1.0            Mix

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

// ============================================================
// Gradient Map / Duotone LUT — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (lut).
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
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uLevels  float  1      posterize steps (1 = smooth gradient)
  uShadow  vec3   0.10 0.05 0.20
  uMid     vec3   0.80 0.25 0.30
  uHigh    vec3   0.98 0.90 0.55
  uMix     float  1.0    blend toward graded result
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

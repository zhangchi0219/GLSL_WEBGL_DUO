// ============================================================
// Posterize / Color Grade — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (posterize).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

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
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.
(If your input is 16/32-bit float linear, the look may differ from the browser;
 use 8-bit fixed to match, or pre-convert.)

Vectors page:
  uLevels      float  5      quantization bands
  uGamma       float  1.0
  uContrast    float  1.1
  uBrightness  float  0.0
  uSaturation  float  1.2
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

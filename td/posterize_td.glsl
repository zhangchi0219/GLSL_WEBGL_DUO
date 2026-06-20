// ============================================================
// Posterize / Grade — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/posterize.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
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
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uLevels      float 5.0            Levels
  uGamma       float 1.0            Gamma
  uContrast    float 1.1            Contrast
  uBrightness  float 0.0            Brightness
  uSaturation  float 1.2            Saturation

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

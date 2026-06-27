// ============================================================
// Sobel Edge — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/sobel.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uStrength;
uniform float uThreshold;
uniform float uOverlay;
uniform float uInvert;
uniform vec3  uEdge;
uniform vec3  uBg;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    float tl = luma(texture(INPUT0, uv + vec2(-1.0,-1.0) * t).rgb);
    float tc = luma(texture(INPUT0, uv + vec2( 0.0,-1.0) * t).rgb);
    float tr = luma(texture(INPUT0, uv + vec2( 1.0,-1.0) * t).rgb);
    float ml = luma(texture(INPUT0, uv + vec2(-1.0, 0.0) * t).rgb);
    float mr = luma(texture(INPUT0, uv + vec2( 1.0, 0.0) * t).rgb);
    float bl = luma(texture(INPUT0, uv + vec2(-1.0, 1.0) * t).rgb);
    float bc = luma(texture(INPUT0, uv + vec2( 0.0, 1.0) * t).rgb);
    float br = luma(texture(INPUT0, uv + vec2( 1.0, 1.0) * t).rgb);

    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    float g  = sqrt(gx * gx + gy * gy) * uStrength;
    float e  = smoothstep(uThreshold, uThreshold + 0.1, g);
    if (uInvert > 0.5) e = 1.0 - e;

    vec3 col = (uOverlay > 0.5)
        ? mix(texture(INPUT0, uv).rgb, uEdge, e)
        : mix(uBg, uEdge, e);
    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uStrength    float 1.5            Strength
  uThreshold   float 0.15           Threshold
  uOverlay     float 0              Overlay On Image
  uInvert      float 0              Invert
  uEdge        vec3  0.95 0.93 0.85  Edge Color
  uBg          vec3  0.03 0.03 0.05  Background

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

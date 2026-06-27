// ============================================================
// Chromatic Aberration — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/chromatic.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uAmount;
uniform float uFalloff;
uniform vec2  uCenter;
uniform float uVignette;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 dir  = uv - uCenter;
    float dist = length(dir);
    vec2 off = dir * pow(dist, uFalloff) * uAmount * 0.08;
    float r = texture(INPUT0, uv + off).r;
    float g = texture(INPUT0, uv).g;
    float b = texture(INPUT0, uv - off).b;
    vec3 col = vec3(r, g, b);
    col *= 1.0 - uVignette * dist * dist;
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
  uAmount      float 0.4            Amount
  uFalloff     float 1.5            Edge Falloff
  uCenter      vec2  0.5 0.5        Center
  uVignette    float 0.3            Vignette

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

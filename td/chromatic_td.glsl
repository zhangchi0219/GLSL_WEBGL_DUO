// ============================================================
// Chromatic Aberration — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (chromatic).
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
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uAmount   float  0.4        split strength
  uFalloff  float  1.5        edge falloff exponent (0 = uniform)
  uCenter   vec2   0.5 0.5    split origin (0..1)
  uVignette float  0.3        darken toward edges
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

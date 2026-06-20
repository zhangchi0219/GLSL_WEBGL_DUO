// ============================================================
// Sharpen (unsharp mask) — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (sharpen).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

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
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uAmount  float  1.0    sharpen strength
  uRadius  float  1.0    sample spread (px)
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

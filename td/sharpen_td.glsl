// ============================================================
// Sharpen — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/sharpen.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
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
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uAmount      float 1.0            Amount
  uRadius      float 1.0            Radius (px)

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

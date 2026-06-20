// ============================================================
// Sketch (Pencil) — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/sketch.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uStrength;
uniform float uHatch;
uniform vec3  uInk;
uniform vec3  uPaper;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

float hatchLayer(vec2 p, float ang, float period){
    float v = cos(ang) * p.x + sin(ang) * p.y;
    float f = abs(fract(v / period) - 0.5) * 2.0;
    return smoothstep(0.55, 0.15, f);
}

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
    float edge = clamp(sqrt(gx * gx + gy * gy) * uStrength, 0.0, 1.0);

    float L = luma(texture(INPUT0, uv).rgb);
    vec2 pix = uv * res;
    float hatch = 0.0;
    if (uHatch > 0.001){
        hatch = max(hatch, hatchLayer(pix, 0.785, 7.0) * step(L, 0.80));
        hatch = max(hatch, hatchLayer(pix, -0.785, 7.0) * step(L, 0.55));
        hatch = max(hatch, hatchLayer(pix, 0.0,   6.0) * step(L, 0.30));
        hatch = max(hatch, hatchLayer(pix, 1.571, 6.0) * step(L, 0.15));
    }
    float ink = clamp(edge + hatch * uHatch, 0.0, 1.0);
    return vec4(mix(uPaper, uInk, ink), 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uStrength    float 2.0            Edge Strength
  uHatch       float 0.7            Hatching
  uInk         vec3  0.1 0.1 0.12   Ink
  uPaper       vec3  0.95 0.93 0.86  Paper

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

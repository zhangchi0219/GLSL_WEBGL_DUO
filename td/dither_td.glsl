// ============================================================
// Bitmap / Ordered Dither — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (dither).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uPixel;
uniform float uLevels;
uniform float uSpread;
uniform float uMono;
uniform float uUseInk;
uniform vec3  uInk;
uniform vec3  uPaper;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float Bayer2(vec2 a){ a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float Bayer4(vec2 a){ return Bayer2(0.5 * a) * 0.25 + Bayer2(a); }
float Bayer8(vec2 a){ return Bayer4(0.5 * a) * 0.25 + Bayer2(a); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    float px = max(uPixel, 1.0);
    vec2 grid = res / px;
    vec2 suv  = (floor(uv * grid) + 0.5) / grid;
    vec3 c = texture(INPUT0, suv).rgb;

    vec2 bp = floor(uv * res / px);
    float t = Bayer8(bp);
    float L = max(uLevels, 2.0);

    vec3 col;
    if (uMono > 0.5){
        float g = luma(c);
        g = floor(g * (L - 1.0) + (t - 0.5) * uSpread + 0.5) / (L - 1.0);
        g = clamp(g, 0.0, 1.0);
        col = (uUseInk > 0.5) ? mix(uPaper, uInk, g) : vec3(g);
    } else {
        col = floor(c * (L - 1.0) + (t - 0.5) * uSpread + 0.5) / (L - 1.0);
        col = clamp(col, 0.0, 1.0);
    }
    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uPixel   float  2      pre-pixelation block size (px)
  uLevels  float  2      color levels per channel (2 = 1-bit)
  uSpread  float  1.0    dither strength
  uMono    float  1      1 = greyscale, 0 = per-channel color dither
  uUseInk  float  1      1 = remap mono to Ink/Paper colors
  uInk     vec3   0.05 0.05 0.08
  uPaper   vec3   0.92 0.90 0.82
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

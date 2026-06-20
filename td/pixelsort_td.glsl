// ============================================================
// Pixel Sort (single-pass approximation) — TouchDesigner GLSL TOP (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (pixelsort).
// NOTE: a true pixel sort is multi-pass; this approximates the streak look
// in one pass (per-pixel march + max/min within a luma-masked span).
// For a heavier/closer result, feed this through a Feedback TOP loop.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uLow;
uniform float uHigh;
uniform float uLength;
uniform float uVertical;
uniform float uReverse;
uniform float uMode;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    vec2 dir = (uVertical > 0.5) ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
    dir *= (uReverse > 0.5) ? -1.0 : 1.0;

    vec4 cur = texture(INPUT0, uv);
    float cl = luma(cur.rgb);
    if (cl < uLow || cl > uHigh) return vec4(cur.rgb, 1.0); // outside mask: untouched

    int maxN = int(clamp(uLength, 1.0, 280.0));
    vec4 best = cur; float bestL = cl;
    for (int i = 1; i < 280; i++){
        if (i > maxN) break;
        vec2 suv = uv + dir * texel * float(i);
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) break;
        vec4 s = texture(INPUT0, suv);
        float l = luma(s.rgb);
        if (l < uLow || l > uHigh) break;              // span boundary
        bool take = (uMode > 0.5) ? (l < bestL) : (l > bestL);
        if (take){ bestL = l; best = s; }
    }
    return vec4(best.rgb, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uLow      float  0.25   mask low luma (only pixels in [Low,High] sort)
  uHigh     float  0.80   mask high luma
  uLength   float  120    max march length in pixels
  uVertical float  0      0 = horizontal sort, 1 = vertical
  uReverse  float  0      flip sort direction
  uMode     float  0      0 = brightest wins, 1 = darkest wins
Inputs: Input 0 = source TOP.  CHOP wiring: none.
Perf: cost = uLength texture taps per pixel. At 4K, lower uLength or downres first.
=============================================== */

// ============================================================
// Blur (Gaussian / Box) — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (blur).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uRadius;
uniform float uGaussian;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    int r = int(clamp(uRadius, 0.0, 8.0));
    float sigma = max(uRadius * 0.5, 0.001);
    vec3 sum = vec3(0.0); float wsum = 0.0;
    for (int y = -8; y <= 8; y++){
        if (y < -r || y > r) continue;
        for (int x = -8; x <= 8; x++){
            if (x < -r || x > r) continue;
            float d2 = float(x * x + y * y);
            float w = (uGaussian > 0.5) ? exp(-d2 / (2.0 * sigma * sigma)) : 1.0;
            sum += texture(INPUT0, uv + vec2(float(x), float(y)) * texel).rgb * w;
            wsum += w;
        }
    }
    return vec4(sum / max(wsum, 0.0001), 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uRadius    float  4      kernel radius (px, capped at 8 here)
  uGaussian  float  1      1 = Gaussian weights, 0 = box (equal weights)
Inputs: Input 0 = source TOP.  CHOP wiring: none.
Note: for large blurs, TD's built-in Blur TOP is separable and far cheaper than
this NxN kernel — use it instead when radius needs to exceed ~8 px.
=============================================== */

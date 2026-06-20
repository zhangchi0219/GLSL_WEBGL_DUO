// ============================================================
// Bloom / Glow — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (bloom).
// Single-pass approximation (bright-pass + 32-tap weighted blur).
// For a cleaner/cheaper bloom in TD, see the multi-pass note below.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uThreshold;
uniform float uIntensity;
uniform float uRadius;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 brightPass(vec3 c, float th){ return c * smoothstep(th, th + 0.1, luma(c)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    vec3 base = texture(INPUT0, uv).rgb;
    vec3 bloom = vec3(0.0); float wsum = 0.0;
    const int N = 32;
    for (int i = 0; i < N; i++){
        float fi = float(i);
        float a = fi * 2.39996323;            // golden angle
        float rn = sqrt(fi / float(N));        // 0..1
        float r = rn * uRadius;
        float w = exp(-rn * rn * 2.5);
        vec2 off = vec2(cos(a), sin(a)) * r * texel;
        bloom += brightPass(texture(INPUT0, uv + off).rgb, uThreshold) * w;
        wsum += w;
    }
    bloom /= max(wsum, 0.0001);
    return vec4(base + bloom * uIntensity, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA (or 16-bit float for HDR glow).
Input 0 ← source TOP.

Vectors page:
  uThreshold  float  0.6     brightness cutoff for the glow
  uIntensity  float  1.0     glow add amount
  uRadius     float  24      glow radius in pixels

Inputs: Input 0 = source TOP.  CHOP wiring: none.

Higher-quality alternative (native multi-pass, recommended for big radii / 4K):
  source TOP  ->  Level TOP (or this shader with uIntensity 0 as bright-pass)
              ->  Blur TOP (size = radius)
              ->  Composite TOP (Operation = Add) over the source.
=============================================== */

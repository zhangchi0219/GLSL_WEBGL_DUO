// ============================================================
// Bloom / Glow — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/bloom.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
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
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uThreshold   float 0.6            Threshold
  uIntensity   float 1.0            Intensity
  uRadius      float 24.0           Glow Radius (px)

Inputs: Input 0 = source TOP (sampled as INPUT0).
Perf: many texture taps per pixel — at 4K lower the radius/length or downres first.
Higher-quality native path (recommended for big radii / 4K): source -> Level/Threshold -> Blur TOP (size = radius) -> Composite TOP (Add) over the source.
=============================================== */

// ============================================================
// Blur (Gauss/Box) — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/blur.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
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
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uRadius      float 4.0            Radius (px)
  uGaussian    float 1              Gaussian (off=Box)

Inputs: Input 0 = source TOP (sampled as INPUT0).
Perf: many texture taps per pixel — at 4K lower the radius/length or downres first.
For large blurs, TD's built-in separable Blur TOP is far cheaper than this NxN kernel.
=============================================== */

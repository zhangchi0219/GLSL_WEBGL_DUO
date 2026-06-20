// ============================================================
// Kuwahara (oil / painterly) — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (kuwahara).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uRadius;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    int r = int(clamp(uRadius, 1.0, 8.0));

    vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
    vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
    float c0 = 0.0, c1 = 0.0, c2 = 0.0, c3 = 0.0;

    for (int y = -8; y <= 8; y++){
        if (y < -r || y > r) continue;
        for (int x = -8; x <= 8; x++){
            if (x < -r || x > r) continue;
            vec3 col = texture(INPUT0, uv + vec2(float(x), float(y)) * t).rgb;
            vec3 col2 = col * col;
            if (x <= 0 && y <= 0){ m0 += col; s0 += col2; c0 += 1.0; }
            if (x >= 0 && y <= 0){ m1 += col; s1 += col2; c1 += 1.0; }
            if (x <= 0 && y >= 0){ m2 += col; s2 += col2; c2 += 1.0; }
            if (x >= 0 && y >= 0){ m3 += col; s3 += col2; c3 += 1.0; }
        }
    }

    m0 /= c0; m1 /= c1; m2 /= c2; m3 /= c3;
    float v0 = dot(s0 / c0 - m0 * m0, vec3(1.0));
    float v1 = dot(s1 / c1 - m1 * m1, vec3(1.0));
    float v2 = dot(s2 / c2 - m2 * m2, vec3(1.0));
    float v3 = dot(s3 / c3 - m3 * m3, vec3(1.0));

    vec3 col = m0; float mv = v0;
    if (v1 < mv){ mv = v1; col = m1; }
    if (v2 < mv){ mv = v2; col = m2; }
    if (v3 < mv){ mv = v3; col = m3; }
    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uRadius  float  4    window radius in pixels (1..8)
Inputs: Input 0 = source TOP.  CHOP wiring: none.
Perf: cost ~ (2r+1)^2 taps per pixel. At 4K keep uRadius low or downres first.
=============================================== */

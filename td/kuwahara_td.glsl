// ============================================================
// Kuwahara (Oil) — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_kuwahara; Pixel Shader DAT: shader_kuwahara.
// Export ID: kuwahara. Generated from the shared GLSL core.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define uResolution (uTDOutputInfo.res.zw)
uniform float uTime;
uniform vec2 uMouse;

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
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.
Set Input Extend Mode UV = Hold, Input Smoothness = Interpolate Pixels (no mipmaps).
If the build exposes Working Color Space, use Passthrough when matching the browser's raw RGB values.

Vectors page (custom uniforms):
  uTime        float expr: absTime.seconds   drives the animation
  uMouse       vec2  0.5 0.5   Mouse In CHOP normalized 0–1, y-up
  uRadius      float 4.0            Radius (px)

Inputs: Input 0 = source TOP (sampled as INPUT0).
Perf: many texture taps per pixel — at 4K lower the radius/length or downres first.
=============================================== */

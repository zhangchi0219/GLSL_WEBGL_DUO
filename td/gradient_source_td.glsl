// ============================================================
// Gradient Fluid — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_gradient_source; Pixel Shader DAT: shader_gradient_source.
// Export ID: gradient-source. Generated from the shared GLSL core.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
// Procedural source: no input texture required.
#define uResolution (uTDOutputInfo.res.zw)
uniform float uTime;
uniform vec2 uMouse;

// ===================== SHARED CORE =====================
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float t = time * 0.12;
    vec2 p = (uv - 0.5) * 2.0;
    p.x *= res.x / max(res.y, 1.0);

    // Slow domain warps create broad, liquid folds.
    vec2 q = p;
    for (int i = 0; i < 4; i++) {
        float f = float(i) + 1.0;
        q += 0.34 / f * vec2(
            sin(q.y * (2.0 + f) + t + f * 1.7),
            cos(q.x * (1.7 + f) - t * 0.8 + f)
        );
    }

    float fold = sin(q.x * 2.1 + q.y * 3.0 + t);
    float flow = sin(q.y * 2.5 - q.x * 1.2 - t * 0.7);
    float light = 0.5 + 0.5 * sin(q.x * 0.8 - q.y * 0.9 + t * 0.35);

    vec3 ink = vec3(0.11, 0.07, 0.25);
    vec3 violet = vec3(0.46, 0.29, 0.84);
    vec3 cyan = vec3(0.28, 0.76, 0.81);
    vec3 peach = vec3(0.95, 0.63, 0.55);
    vec3 color = mix(ink, violet, smoothstep(-0.95, 0.75, fold));
    color = mix(color, cyan, smoothstep(-0.15, 0.9, flow) * 0.82);
    float warm = smoothstep(0.35, 0.95, fold)
               * (1.0 - smoothstep(-0.35, 0.7, flow));
    color = mix(color, peach, warm * (0.55 + light * 0.3));
    float sheen = pow(max(0.0, 1.0 - abs(fold + flow * 0.18)), 12.0);
    color += vec3(0.04, 0.08, 0.09) * sheen;
    return vec4(color, 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). No input TOP required; set output resolution explicitly.
Set Input Extend Mode UV = Hold, Input Smoothness = Interpolate Pixels (no mipmaps).
If the build exposes Working Color Space, use Passthrough when matching the browser's raw RGB values.

Vectors page (custom uniforms):
  uTime        float expr: absTime.seconds   drives the animation
  uMouse       vec2  0.5 0.5   Mouse In CHOP normalized 0–1, y-up


Inputs: none. Connect this TOP's output to the effect's source input.
=============================================== */

// ============================================================
// Noise — pass "field" → buffer "vel"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_field; Pixel Shader DAT: shader_field.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   (no inputs)
// ============================================================

layout(location = 0) out vec4 fragColor;


#define uResolution (uTDOutputInfo.res.zw)
#define uTexel (uTDOutputInfo.res.xy)
#define uIteration float(uTDPass)

// Wire these on the Vectors / CHOP pages (see NETWORK.md):
uniform float uTime;       // absTime.seconds
uniform float uDt;         // 1.0/me.time.rate (or a Constant CHOP)
uniform float uFrame;      // absTime.frame
uniform vec2  uCanvasResolution; // display TOP resolution, even on data passes
uniform vec2  uMouse;      // Mouse In CHOP (normalized, y-up)
uniform vec2  uMouseVel;   // Mouse In CHOP slope (tx,ty)
uniform float uMouseDown;  // Mouse In CHOP left button
// Custom params (uForce, uRadius, …) are declared by the SHARED CORE below —
// add them on the Vectors page with the values from NETWORK.md.

// ===================== SHARED CORE =====================

// 三层平滑 value noise 的解析梯度；旋转梯度得到 curl 流场。
uniform float uNoiseScale;
uniform float uStrength;
uniform float uEvolution;
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
vec2 noiseGradient(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 s = f * f * (3.0 - 2.0 * f);
    vec2 ds = 6.0 * f * (1.0 - f);
    float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0));
    return vec2(mix(b - a, d - c, s.y) * ds.x,
                mix(c - a, d - b, s.x) * ds.y);
}

vec2 pointerField(vec2 uv, float aspect) {
    vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
    float fall = exp(-dot(d, d) / 0.012);
    vec2 push = clamp(uMouseVel, vec2(-1.5), vec2(1.5));
    return uMouseDown * fall * (push * 0.4 + vec2(-d.y / aspect, d.x) * 3.0);
}

vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    vec2 p = uv * vec2(aspect, 1.0) * uNoiseScale + time * uEvolution * vec2(0.17, -0.11);
    vec2 grad = noiseGradient(p);
    grad += noiseGradient(p * 2.03 + 17.1) * 0.55;
    grad += noiseGradient(p * 4.11 + 31.7) * 0.3;
    vec2 worldVel = vec2(grad.y, -grad.x) * uStrength * 0.17;
    worldVel *= min(1.0, 0.7 / max(length(worldVel), 0.0001));
    vec2 vel = worldVel / vec2(aspect, 1.0) + pointerField(uv, aspect);
    return vec4(clamp(vel, vec2(-1.5), vec2(1.5)), 0.0, 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

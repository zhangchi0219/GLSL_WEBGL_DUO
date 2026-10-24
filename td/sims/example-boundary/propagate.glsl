// ============================================================
// Boundary — pass "propagate" → buffer "h"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_propagate; Pixel Shader DAT: shader_propagate.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: h current state (see NETWORK.md for its exact producer)
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

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


uniform vec2 uObstacle;
uniform float uRadius;
// 以画面高度为单位保持圆形；矩形容器和圆形障碍物均为不可穿透边界。
bool solid(vec2 uv, float aspect) {
    return any(lessThan(uv, vec2(0.06))) || any(greaterThan(uv, vec2(0.94)))
        || length((uv - uObstacle) * vec2(aspect, 1.0)) < uRadius;
}

uniform float uWaveSpeed;
uniform float uDamping;
uniform float uFrequency;
uniform float uPointerForce;
float neighbor(vec2 uv, float center, float aspect) {
    // 固体邻居使用中心值作为 ghost cell：法向导数为零，波在边界反射。
    return solid(uv, aspect) ? center : texture(INPUT0, uv).r;
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    if (solid(uv, aspect)) return vec4(0.0);
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    vec2 h = texture(INPUT0, uv).rg;
    float lap = neighbor(uv + vec2(t.x, 0.0), h.r, aspect)
              + neighbor(uv - vec2(t.x, 0.0), h.r, aspect)
              + neighbor(uv + vec2(0.0, t.y), h.r, aspect)
              + neighbor(uv - vec2(0.0, t.y), h.r, aspect) - 4.0 * h.r;
    // 二维显式波动方程的 CFL 上限为 1/sqrt(2)。
    float speed = clamp(uWaveSpeed, 0.0, 0.68);
    float next = h.r + (h.r - h.g) * uDamping + speed * speed * lap;
    vec2 d = (uv - vec2(0.28, 0.5)) * vec2(aspect, 1.0);
    float source = exp(-dot(d, d) / 0.00022);
    next = mix(next, sin(time * 6.283185 * uFrequency) * 0.65, source * 0.4);
    vec2 mouse = (uv - uMouse) * vec2(aspect, 1.0);
    next += uMouseDown * uPointerForce * exp(-dot(mouse, mouse) / 0.0007) * min(uDt * 60.0, 2.0) * 0.08;
    return vec4(clamp(next, -3.0, 3.0), h.r, 0.0, 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

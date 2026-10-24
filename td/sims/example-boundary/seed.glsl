// ============================================================
// Boundary — pass "seed" → buffer "h"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_seed; Pixel Shader DAT: shader_seed.

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


uniform vec2 uObstacle;
uniform float uRadius;
// 以画面高度为单位保持圆形；矩形容器和圆形障碍物均为不可穿透边界。
bool solid(vec2 uv, float aspect) {
    return any(lessThan(uv, vec2(0.06))) || any(greaterThan(uv, vec2(0.94)))
        || length((uv - uObstacle) * vec2(aspect, 1.0)) < uRadius;
}

vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    if (solid(uv, aspect)) return vec4(0.0);
    vec2 d = (uv - vec2(0.28, 0.5)) * vec2(aspect, 1.0);
    // 预置环形波，暂停加载时也能看到非空的初始状态。
    float h = 0.3 * exp(-pow((length(d) - 0.075) / 0.012, 2.0));
    return vec4(h, h, 0.0, 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

// ============================================================
// Physics — pass "forces" → buffer "vel"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_forces; Pixel Shader DAT: shader_forces.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: vel current state (see NETWORK.md for its exact producer)
//   Input 1: pos buffer TOP
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define INPUT1 sTD2DInputs[1]

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


const vec2 PANEL_MIN = vec2(0.2);
const vec2 PANEL_MAX = vec2(0.8);
vec2 gridSize(sampler2D field) { return min(vec2(19.0, 17.0), vec2(textureSize(field, 0))); }
vec4 nodeValue(sampler2D field, vec2 node) {
    vec2 size = gridSize(field), dimensions = vec2(textureSize(field, 0));
    vec2 uv = (clamp(node, vec2(0.0), size - 1.0) + 0.5) / size;
    return texelFetch(field, min(ivec2(uv * dimensions), ivec2(dimensions) - 1), 0);
}
vec2 restPosition(vec2 node, vec2 size) {
    return PANEL_MIN + node * (PANEL_MAX - PANEL_MIN) / max(size - 1.0, vec2(1.0));
}

uniform float uGravity;
uniform float uStiffness;
uniform float uDamping;
uniform float uPointerForce;
vec2 spring(vec2 node, vec2 P, vec2 off, vec2 size, float aspect) {
    vec2 other = node + off;
    if (any(lessThan(other, vec2(0.0))) || any(greaterThan(other, size - 1.0))) return vec2(0.0);
    vec2 metric = vec2(aspect, 1.0);
    vec2 rest = (restPosition(other, size) - restPosition(node, size)) * metric;
    vec2 d = rest + (nodeValue(INPUT1, other).xy - P) * metric;
    float len = max(length(d), 0.00001), restLength = max(length(rest), 0.00001);
    return uStiffness * clamp(len / restLength - 1.0, -1.0, 2.0) * d / len / metric;
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 size = gridSize(INPUT1), node = min(floor(uv * size), size - 1.0);
    if (node.y >= size.y - 1.0) return vec4(0.0);
    float aspect = res.x / res.y;
    vec2 P = nodeValue(INPUT1, node).xy;
    vec2 f = vec2(0.0, -uGravity) - P * 1.5;
    f += spring(node, P, vec2(1.0, 0.0), size, aspect);
    f += spring(node, P, vec2(-1.0, 0.0), size, aspect);
    f += spring(node, P, vec2(0.0, 1.0), size, aspect);
    f += spring(node, P, vec2(0.0, -1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(1.0, 1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(-1.0, -1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(1.0, -1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(-1.0, 1.0), size, aspect);
    vec2 toMouse = uMouse - (restPosition(node, size) + P);
    vec2 d = toMouse * vec2(aspect, 1.0);
    f += uMouseDown * toMouse * uPointerForce * exp(-dot(d, d) / 0.018);
    float dt = clamp(uDt, 0.0001, 1.0 / 30.0);
    vec2 velocity = (nodeValue(INPUT0, node).xy + clamp(f, vec2(-20.0), vec2(20.0)) * dt) * exp(-uDamping * dt);
    return vec4(clamp(velocity, vec2(-1.5), vec2(1.5)), 0.0, 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

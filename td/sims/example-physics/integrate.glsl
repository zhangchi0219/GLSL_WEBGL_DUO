// ============================================================
// Physics — pass "integrate" → buffer "pos"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_integrate; Pixel Shader DAT: shader_integrate.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: pos current state (see NETWORK.md for its exact producer)
//   Input 1: vel buffer TOP
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

vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 size = gridSize(INPUT0), node = min(floor(uv * size), size - 1.0);
    if (node.y >= size.y - 1.0) return vec4(0.0);
    vec2 P = nodeValue(INPUT0, node).xy;
    vec2 next = clamp(P + nodeValue(INPUT1, node).xy * min(uDt, 1.0 / 30.0), vec2(-0.15), vec2(0.15));
    vec2 off = mix(vec2(1.0), vec2(-1.0), step(size - 1.0, node));
    vec2 spacing = (PANEL_MAX - PANEL_MIN) / max(size - 1.0, vec2(1.0));
    vec2 dx = (nodeValue(INPUT0, node + vec2(off.x, 0.0)).xy - P) / (off.x * spacing.x);
    vec2 dy = (nodeValue(INPUT0, node + vec2(0.0, off.y)).xy - P) / (off.y * spacing.y);
    float stretch = abs(length(vec2(1.0, 0.0) + dx) - 1.0) + abs(length(vec2(0.0, 1.0) + dy) - 1.0);
    return vec4(next, min(stretch, 3.0), 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

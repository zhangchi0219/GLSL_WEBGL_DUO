// ============================================================
// Space Colonization — pass "propose" → buffer "proposals"
// GLSL Multi TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glslmulti_propose; Pixel Shader DAT: shader_propose.
// Four inputs: use GLSL Multi TOP; ordinary GLSL TOP has only three wired inputs.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: nodes buffer TOP
//   Input 1: attractors buffer TOP
//   Input 2: count buffer TOP
//   Input 3: clock buffer TOP
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define INPUT1 sTD2DInputs[1]
#define INPUT2 sTD2DInputs[2]
#define INPUT3 sTD2DInputs[3]

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

uniform float uSeed;
uniform float uSpeed;
uniform vec3 uInk;
uniform vec3 uPaper;
float random01(uint n) {
    n ^= uint(uSeed) * 747796405u + 2891336453u;
    n ^= n >> 16u; n *= 2246822519u; n ^= n >> 13u;
    n *= 3266489917u; n ^= n >> 16u;
    return float(n & 16777215u) / 16777216.0;
}
int itemId(vec2 uv, vec2 res) { ivec2 p = ivec2(uv * res); return p.y * int(res.x) + p.x; }
vec4 item(sampler2D tex, int id) {
    int width = textureSize(tex, 0).x;
    return texelFetch(tex, ivec2(id % width, id / width), 0);
}
vec2 squareUV(vec2 uv, vec2 res) { return (uv - 0.5) * res / min(res.x, res.y) + 0.5; }
vec2 mouseUV() { return squareUV(uMouse, uCanvasResolution); }
float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 d = b - a;
    return length(p - a - d * clamp(dot(p - a, d) / max(dot(d, d), 1e-12), 0.0, 1.0));
}
uniform float uInfluence;
uniform float uKillDistance;
uniform float uStepLength;
uniform float uWidth;

vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res), count = int(texture(INPUT2, vec2(0.5)).x);
    vec4 clock = texture(INPUT3, vec2(0.5));
    if (id >= count || count >= 1024 || clock.z <= 0.0 || floor(clock.x * 18.0) <= floor(max(0.0, clock.x - clock.z) * 18.0)) return vec4(0.0);
    vec2 p = item(INPUT0, id).xy, direction = vec2(0.0), nearest = vec2(0.0); float best = 100.0, votes = 0.0;
    for (int j = 0; j < 512; j++) {
        vec4 a = item(INPUT1, j); if (a.w < 0.5) continue;
        vec2 d = a.xy - p; float distance = length(d);
        if (distance < best) { best = distance; nearest = d; }
        if (int(a.z) == id && a.z >= 0.0) { direction += d / max(distance, 1e-6); votes += 1.0; }
    }
    // Extend the initial trunk toward the nearest remaining attractor until
    // it reaches the influence envelope, as in the space-colonization model.
    if (votes == 0.0 && count < 20 && id == count - 1 && best < 10.0) direction = nearest;
    if (length(direction) < 1e-6) return vec4(0.0);
    vec2 next = p + normalize(direction) * uStepLength;
    // A new segment may not duplicate an existing node.
    for (int j = 0; j < 1024; j++) {
        if (j >= count) break;
        if (length(item(INPUT0, j).xy - next) < uStepLength * 0.45) return vec4(0.0);
    }
    return vec4(clamp(next, vec2(0.02), vec2(0.98)), 1.0, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

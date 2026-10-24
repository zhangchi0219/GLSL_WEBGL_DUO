// ============================================================
// DLA — pass "walk" → buffer "walkers"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_walk; Pixel Shader DAT: shader_walk.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: walkers current state (see NETWORK.md for its exact producer)
//   Input 1: aggregate buffer TOP
//   Input 2: clock buffer TOP
// Run this kernel 8× per frame via GLSL TOP Common page
// Num Passes = 8; subsequent passes read the previous output as Input 0.
// uIteration = float(uTDPass), starting at zero.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define INPUT1 sTD2DInputs[1]
#define INPUT2 sTD2DInputs[2]

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

uniform float uStick;
bool solid(ivec2 p) { return texelFetch(INPUT1, clamp(p, ivec2(0), ivec2(383)), 0).r > 0.5; }
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec4 a = texture(INPUT0, uv), clock = texture(INPUT2, vec2(0.5));
    if (a.z > 0.5 || clock.z <= 0.0) return a;
    uint key = uint(itemId(uv, res)) + uint(clock.y) * 4099u + uint(uIteration) * 65537u;
    if (random01(key + 7u) > min(clock.z * 60.0, 1.0)) return a;
    ivec2 cell = ivec2(a.xy * 384.0);
    int direction = int(random01(key) * 4.0);
    ivec2 delta = direction == 0 ? ivec2(1, 0) : direction == 1 ? ivec2(-1, 0) : direction == 2 ? ivec2(0, 1) : ivec2(0, -1);
    ivec2 next = clamp(cell + delta, ivec2(3), ivec2(380));
    if (!solid(next)) cell = next;
    bool touching = solid(cell + ivec2(1, 0)) || solid(cell + ivec2(-1, 0)) || solid(cell + ivec2(0, 1)) || solid(cell + ivec2(0, -1));
    float attached = touching && random01(key + 3u) < uStick ? 1.0 : 0.0;
    return vec4((vec2(cell) + 0.5) / 384.0, attached, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

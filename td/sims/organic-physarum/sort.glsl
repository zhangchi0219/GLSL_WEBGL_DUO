// ============================================================
// Physarum — pass "sort" → buffer "indices"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_sort; Pixel Shader DAT: shader_sort.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: indices current state (see NETWORK.md for its exact producer)
// Run this kernel 78× per frame via GLSL TOP Common page
// Num Passes = 78; subsequent passes read the previous output as Input 0.
// uIteration = float(uTDPass), starting at zero.
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

bool lessPair(vec2 a, vec2 b) { return a.x < b.x || (a.x == b.x && a.y < b.y); }
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int stage = int(uIteration), level = 1;
    for (int l = 1; l <= 12; l++) { if (stage < l) { level = l; break; } stage -= l; }
    int stride = 1 << (level - 1 - stage), block = 1 << level;
    int id = itemId(uv, res), partner = id ^ stride;
    vec4 a = item(INPUT0, id), b = item(INPUT0, partner);
    bool keepMin = ((id & block) == 0) == ((id & stride) == 0);
    return (lessPair(a.xy, b.xy) == keepMin) ? a : b;
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

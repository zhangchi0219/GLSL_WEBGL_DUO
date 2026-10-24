// ============================================================
// Reaction–Diffusion — pass "react" → buffer "chemicals"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_react; Pixel Shader DAT: shader_react.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: chemicals current state (see NETWORK.md for its exact producer)
//   Input 1: clock buffer TOP
// Run this kernel 12× per frame via GLSL TOP Common page
// Num Passes = 12; subsequent passes read the previous output as Input 0.
// uIteration = float(uTDPass), starting at zero.
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

uniform float uFeed;
uniform float uKill;
uniform float uDiffusion;
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 c = texture(INPUT0, uv).rg;
    float h = min(texture(INPUT1, vec2(0.5)).z * 60.0 * 0.45, 0.9);
    if (h <= 0.0) return vec4(c, 0.0, 1.0);
    vec2 lap = -c;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        if (x == 0 && y == 0) continue;
        lap += texture(INPUT0, uv + vec2(x, y) * uTexel).rg * ((x == 0 || y == 0) ? 0.2 : 0.05);
    }
    float reaction = c.x * c.y * c.y;
    c += h * vec2(lap.x - reaction + uFeed * (1.0 - c.x), uDiffusion * lap.y + reaction - (uKill + uFeed) * c.y);
    if (uMouseDown > 0.5) c = mix(c, vec2(0.5, 1.0), (1.0 - smoothstep(0.012, 0.025, length(uv - mouseUV()))) * 0.5);
    return vec4(clamp(c, 0.0, 1.0), 0.0, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

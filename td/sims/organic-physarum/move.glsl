// ============================================================
// Physarum — pass "move" → buffer "agents"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_move; Pixel Shader DAT: shader_move.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: agents current state (see NETWORK.md for its exact producer)
//   Input 1: field buffer TOP
//   Input 2: clock buffer TOP
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
uniform float uSensorDistance;
uniform float uSensorAngle;
uniform float uTurnAngle;
uniform float uMoveSpeed;
uniform float uDecay;
uniform float uDiffusion;

float sense(vec2 p, float angle) { return texture(INPUT1, clamp(p + uSensorDistance * vec2(cos(angle), sin(angle)), vec2(0.0), vec2(1.0))).r; }
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec4 a = texture(INPUT0, uv), clock = texture(INPUT2, vec2(0.5));
    if (clock.z <= 0.0) return a;
    float sensor = radians(uSensorAngle), f = sense(a.xy, a.z), l = sense(a.xy, a.z + sensor), r = sense(a.xy, a.z - sensor);
    float turn = radians(uTurnAngle) * clock.z * 60.0;
    if (f < l || f < r) {
        if (abs(l - r) < 0.00001) a.z += (random01(uint(itemId(uv, res)) + uint(clock.y) * 4099u) < 0.5 ? -turn : turn);
        else a.z += l > r ? turn : -turn;
    }
    vec2 p = a.xy + vec2(cos(a.z), sin(a.z)) * uMoveSpeed * clock.z;
    if (p.x < 0.02 || p.x > 0.98) { a.z = 3.14159265 - a.z; p.x = clamp(p.x, 0.02, 0.98); }
    if (p.y < 0.02 || p.y > 0.98) { a.z = -a.z; p.y = clamp(p.y, 0.02, 0.98); }
    return vec4(p, mod(a.z, 6.2831853), 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

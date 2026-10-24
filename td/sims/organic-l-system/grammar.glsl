// ============================================================
// L-system — pass "grammar" → buffer "structure"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_grammar; Pixel Shader DAT: shader_grammar.

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
uniform float uDepth;
uniform float uAngle;
uniform float uLength;
uniform float uJitter;
uniform float uWidth;

// Bounded grammar traversal: the base-5 address selects a child F at each
// expansion. The explicit stack records turtle origins and headings.
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res), depth = int(uDepth);
    if (float(id) >= pow(5.0, uDepth)) return vec4(-10.0);
    vec2 origins[6]; float headings[6];
    origins[0] = vec2(0.5, 0.08); headings[0] = 1.570796327;
    float unit = 0.76 * uLength / pow(3.0, uDepth);
    int remaining = id; uint path = 1u;
    for (int level = 0; level < 5; level++) {
        if (level >= depth) break;
        int divisor = int(pow(5.0, float(depth - level - 1)) + 0.5);
        int child = remaining / divisor; remaining %= divisor;
        float span = unit * pow(3.0, float(depth - level - 1));
        float offset = child == 0 ? 0.0 : (child <= 2 ? 1.0 : 2.0);
        vec2 axis = vec2(cos(headings[level]), sin(headings[level]));
        origins[level + 1] = origins[level] + axis * span * offset;
        path = path * 5u + uint(child);
        float angle = radians(uAngle + (random01(path) - 0.5) * 2.0 * uJitter);
        headings[level + 1] = headings[level] + (child == 1 ? angle : (child == 3 ? -angle : 0.0));
    }
    vec2 start = origins[depth], end = start + unit * vec2(cos(headings[depth]), sin(headings[depth]));
    return vec4(start, end);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

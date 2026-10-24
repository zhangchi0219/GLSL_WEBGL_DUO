// ============================================================
// Space Colonization — pass "raster" → buffer "field"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_raster; Pixel Shader DAT: shader_raster.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: geometry buffer TOP
//   Input 1: indices buffer TOP
//   Input 2: ranges buffer TOP
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
uniform float uInfluence;
uniform float uKillDistance;
uniform float uStepLength;
uniform float uWidth;

float primitiveWeight(vec2 p, int id, float radius) {
    vec4 g = item(INPUT0, id);
    if (g.x < 0.0) return 0.0;
    return 1.0 - smoothstep(radius * 0.35, radius, segmentDistance(p, g.xy, g.zw));
}
float gatherAt(vec2 p) {
    float radius = uWidth + 0.0013, total = 0.0;
    if (false) {
        for (int id = 0; id < 1024; id++) { if (id >= int(0)) break; total += primitiveWeight(p, id, radius); }
        return total;
    }
    ivec2 center = ivec2(floor(p * 16.0));
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        ivec2 cell = center + ivec2(x, y);
        if (any(lessThan(cell, ivec2(0))) || any(greaterThanEqual(cell, ivec2(16)))) continue;
        vec2 span = texelFetch(INPUT2, cell, 0).xy;
        for (int k = 0; k < 1024; k++) {
            int index = int(span.x) + k; if (index >= int(span.y)) break;
            total += primitiveWeight(p, int(item(INPUT1, index).y), radius);
        }
    }
    return total;
}

vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(min(gatherAt(uv), 1.0), 0.0, 0.0, 1.0); }

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

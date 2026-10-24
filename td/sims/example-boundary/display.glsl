// ============================================================
// Boundary — pass "display" → buffer "screen"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_display; Pixel Shader DAT: shader_display.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: h buffer TOP
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


uniform vec2 uObstacle;
uniform float uRadius;
// 以画面高度为单位保持圆形；矩形容器和圆形障碍物均为不可穿透边界。
bool solid(vec2 uv, float aspect) {
    return any(lessThan(uv, vec2(0.06))) || any(greaterThan(uv, vec2(0.94)))
        || length((uv - uObstacle) * vec2(aspect, 1.0)) < uRadius;
}

vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    float height = texture(INPUT0, uv).r;
    float dx = texture(INPUT0, uv + vec2(t.x, 0.0)).r - texture(INPUT0, uv - vec2(t.x, 0.0)).r;
    float dy = texture(INPUT0, uv + vec2(0.0, t.y)).r - texture(INPUT0, uv - vec2(0.0, t.y)).r;
    vec2 p = uv * vec2(aspect, 1.0);
    vec2 grid = abs(fract(p * 20.0 + 0.5) - 0.5);
    float gridLine = 1.0 - smoothstep(0.01, 0.045, min(grid.x, grid.y));
    vec3 col = vec3(0.018, 0.026, 0.037) + gridLine * vec3(0.016, 0.022, 0.03);
    col += vec3(0.13, 0.75, 1.0) * max(height, 0.0) * 1.8;
    col += vec3(1.0, 0.42, 0.15) * max(-height, 0.0) * 1.8;
    col += vec3(0.16, 0.32, 0.40) * min(length(vec2(dx, dy)) * 3.0, 0.7);
    float circle = length((uv - uObstacle) * vec2(aspect, 1.0)) - uRadius;
    vec2 wall = min(uv - 0.06, 0.94 - uv) * vec2(aspect, 1.0);
    float edge = min(abs(circle), abs(min(wall.x, wall.y)));
    float aa = 1.5 / res.y;
    if (solid(uv, aspect)) col = vec3(0.035, 0.043, 0.055);
    col += (1.0 - smoothstep(aa, aa * 2.5, edge)) * vec3(0.4, 0.50, 0.60);
    return vec4(clamp(col, 0.0, 1.0), 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

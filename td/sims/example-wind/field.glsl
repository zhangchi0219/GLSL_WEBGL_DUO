// ============================================================
// Wind — pass "field" → buffer "vel"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_field; Pixel Shader DAT: shader_field.

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

// 风向以角度表示。阵风沿空间传播；拖动叠加局部旋转和推力。
uniform float uDirection;
uniform float uStrength;
uniform float uGust;

vec2 pointerField(vec2 uv, float aspect) {
    vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
    float fall = exp(-dot(d, d) / 0.012);
    vec2 push = clamp(uMouseVel, vec2(-1.5), vec2(1.5));
    return uMouseDown * fall * (push * 0.4 + vec2(-d.y / aspect, d.x) * 3.0);
}

vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    float angle = radians(uDirection);
    vec2 axis = vec2(cos(angle), sin(angle));
    vec2 side = vec2(-axis.y, axis.x);
    vec2 p = uv * vec2(aspect, 1.0);
    float swell = sin(dot(p, axis) * 8.0 - time * 1.6);
    float bend = sin(dot(p, side) * 9.0 + time * 0.9);
    vec2 worldVel = uStrength * 0.22 * (axis * (1.0 + uGust * 0.45 * swell) + side * uGust * 0.5 * bend);
    vec2 vel = worldVel / vec2(aspect, 1.0) + pointerField(uv, aspect);
    return vec4(clamp(vel, vec2(-1.5), vec2(1.5)), 0.0, 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

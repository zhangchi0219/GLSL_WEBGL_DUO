// ============================================================
// 2D Fluid (Stable) — pass "pressure" → buffer "pressure"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: pressure (Feedback TOP loop)
//   Input 1: divergence buffer TOP
// Run this kernel 25× per frame (Jacobi iterations) via a
// Feedback TOP loop on 'pressure' that cooks 25 times.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define INPUT1 sTD2DInputs[1]

#define uResolution (uTDOutputInfo.res.zw)
#define uTexel (uTDOutputInfo.res.xy)

// Wire these on the Vectors / CHOP pages (see NETWORK.md):
uniform float uTime;       // absTime.seconds
uniform float uDt;         // 1.0/me.time.rate (or a Constant CHOP)
uniform float uFrame;      // absTime.frame
uniform vec2  uMouse;      // Mouse In CHOP (normalized, y-up)
uniform vec2  uMouseVel;   // Mouse In CHOP slope (tx,ty)
uniform float uMouseDown;  // Mouse In CHOP left button
// Custom params (uForce, uRadius, …) are declared by the SHARED CORE below —
// add them on the Vectors page with the values from NETWORK.md.

// ===================== SHARED CORE =====================
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).x;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).x;
    float b = texture(INPUT0, uv - vec2(0.0, t.y)).x;
    float tp = texture(INPUT0, uv + vec2(0.0, t.y)).x;
    float div = texture(INPUT1, uv).x;
    return vec4((l + r + b + tp - div) * 0.25, 0.0, 0.0, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

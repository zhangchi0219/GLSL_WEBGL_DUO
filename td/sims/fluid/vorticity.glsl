// ============================================================
// 2D Fluid (Stable) — pass "vorticity" → buffer "vel"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: vel buffer TOP
//   Input 1: curl buffer TOP
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
uniform float uVorticity;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT1, uv - vec2(t.x, 0.0)).x;
    float r = texture(INPUT1, uv + vec2(t.x, 0.0)).x;
    float b = texture(INPUT1, uv - vec2(0.0, t.y)).x;
    float tp = texture(INPUT1, uv + vec2(0.0, t.y)).x;
    float c = texture(INPUT1, uv).x;
    vec2 force = 0.5 * vec2(abs(tp) - abs(b), abs(r) - abs(l));
    force /= length(force) + 1e-5;
    force *= uVorticity * c;
    force.y *= -1.0;
    vec2 v = texture(INPUT0, uv).xy;
    v += force * uDt;
    return vec4(v, 0.0, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

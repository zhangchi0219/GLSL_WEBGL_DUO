// ============================================================
// Raindrop Ripples — pass "propagate" → buffer "h"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: h (Feedback TOP loop)
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

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
uniform float uDamping;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float c = texture(INPUT0, uv).r;
    float p = texture(INPUT0, uv).g;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).r;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).r;
    float u = texture(INPUT0, uv + vec2(0.0, t.y)).r;
    float d = texture(INPUT0, uv - vec2(0.0, t.y)).r;
    float nh = (l + r + u + d) * 0.5 - p;
    nh *= uDamping;
    return vec4(nh, c, 0.0, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

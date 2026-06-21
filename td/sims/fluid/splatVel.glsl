// ============================================================
// 2D Fluid (Stable) — pass "splatVel" → buffer "vel"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: vel (Feedback TOP loop)
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
uniform float uForce;
uniform float uRadius;
uniform float uDyeAmount;
uniform float uVorticity;
uniform float uVelDiss;
uniform float uDyeDiss;
uniform float uPressureDecay;
uniform float uColorShift;
uniform float uSourceMix;

// ===================== SHARED CORE =====================
uniform float uForce;
uniform float uRadius;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 v = texture(INPUT0, uv).xy;
    if (uMouseDown > 0.5){
        vec2 d = (uv - uMouse) * vec2(res.x / res.y, 1.0);
        float f = exp(-dot(d, d) / (uRadius * uRadius));
        v += uMouseVel * uForce * 300.0 * f;
    }
    return vec4(v, 0.0, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

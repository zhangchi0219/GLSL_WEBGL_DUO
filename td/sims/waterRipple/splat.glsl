// ============================================================
// Raindrop Ripples — pass "splat" → buffer "h"
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
uniform float uDamping;
uniform float uDropRadius;
uniform float uRainRate;
uniform float uPointerForce;
uniform float uRefraction;
uniform float uSpecular;

// ===================== SHARED CORE =====================
uniform float uDropRadius;
uniform float uRainRate;
uniform float uPointerForce;
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec4 h = texture(INPUT0, uv);
    float aspect = res.x / res.y;
    float add = 0.0;
    if (uMouseDown > 0.5){
        vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
        add -= uPointerForce * exp(-dot(d, d) / (uDropRadius * uDropRadius));
    }
    float tq = floor(time * 18.0);
    float spawn = step(1.0 - uRainRate, hash21(vec2(tq, 3.7)));
    vec2 rp = vec2(hash21(vec2(tq, 1.3)), hash21(vec2(tq, 2.1)));
    vec2 dr = (uv - rp) * vec2(aspect, 1.0);
    add -= spawn * 0.5 * exp(-dot(dr, dr) / (uDropRadius * uDropRadius));
    h.r += add;
    return h;
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

// ============================================================
// Sheer Veil — pass "integrate" → buffer "pos"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: pos (Feedback TOP loop)
//   Input 1: vel buffer TOP
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
uniform float uPinTop;
uniform vec2  uClothCenter;
uniform vec2  uClothSize;
bool inCloth(vec2 uv){ vec2 d = abs(uv - uClothCenter); return d.x < uClothSize.x && d.y < uClothSize.y; }
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 P   = texture(INPUT0, uv).xyz;       // displacement from rest
    vec3 vel = texture(INPUT1, uv).xyz;
    P += vel * uDt;

    // particles outside the panel stay flat at rest (contribute nothing)
    if (!inCloth(uv)) return vec4(0.0);

    // pin the panel's TOP row(s) live (computed from the uniform so the toggle
    // responds immediately — init only re-runs on a resize). Rest = zero disp.
    float top = uClothCenter.y + uClothSize.y;
    float pinned = uPinTop * step(top - uTexel.y * 1.5, uv.y);
    if (pinned > 0.5) P = vec3(0.0);

    return vec4(P, 0.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

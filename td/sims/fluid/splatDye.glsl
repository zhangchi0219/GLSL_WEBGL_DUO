// ============================================================
// 2D Fluid (Stable) — pass "splatDye" → buffer "dye"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: dye (Feedback TOP loop)
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
uniform float uDyeAmount;
uniform float uRadius;
uniform float uColorShift;
vec3 hsv2rgb(vec3 c){
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 c = texture(INPUT0, uv).rgb;
    if (uMouseDown > 0.5){
        vec2 d = (uv - uMouse) * vec2(res.x / res.y, 1.0);
        float f = exp(-dot(d, d) / (uRadius * uRadius));
        vec3 col = hsv2rgb(vec3(fract(time * 0.12 + uColorShift), 0.7, 1.0));
        c += col * f * uDyeAmount;
    }
    return vec4(c, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

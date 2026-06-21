// ============================================================
// Raindrop Ripples — pass "display" → buffer "screen"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: h buffer TOP
//   Input 1: source image TOP
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
uniform float uDamping;
uniform float uDropRadius;
uniform float uRainRate;
uniform float uPointerForce;
uniform float uRefraction;
uniform float uSpecular;

// ===================== SHARED CORE =====================
uniform float uRefraction;
uniform float uSpecular;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).r;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).r;
    float u = texture(INPUT0, uv + vec2(0.0, t.y)).r;
    float d = texture(INPUT0, uv - vec2(0.0, t.y)).r;
    vec2 grad = vec2(r - l, u - d);
    vec3 col = texture(INPUT1, uv + grad * uRefraction).rgb;
    vec3 n = normalize(vec3(-grad * 60.0, 1.0));
    float hl = pow(clamp(dot(n, normalize(vec3(0.4, 0.6, 1.0))), 0.0, 1.0), 24.0);
    col += uSpecular * hl;
    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

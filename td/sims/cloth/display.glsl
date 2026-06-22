// ============================================================
// Sheer Veil — pass "display" → buffer "screen"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: pos buffer TOP
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
// Custom params (uForce, uRadius, …) are declared by the SHARED CORE below —
// add them on the Vectors page with the values from NETWORK.md.

// ===================== SHARED CORE =====================
uniform float uRefraction;
uniform float uNormalScale;
uniform float uBaseOpacity;
uniform float uFresnelPow;
uniform float uSheen;
uniform vec3  uTint;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    vec3 c = texture(INPUT0, uv).xyz;         // displacement from rest

    // normal from the z (out-of-plane) gradient — resolution-independent, so a
    // gentle wrinkle reads translucent and only steep folds turn opaque (unlike a
    // position cross-product, which the tiny inter-particle spacing would saturate)
    float zl = texture(INPUT0, uv - vec2(t.x, 0.0)).z;
    float zr = texture(INPUT0, uv + vec2(t.x, 0.0)).z;
    float zd = texture(INPUT0, uv - vec2(0.0, t.y)).z;
    float zu = texture(INPUT0, uv + vec2(0.0, t.y)).z;
    vec2 grad = vec2(zr - zl, zu - zd);
    vec3 n = normalize(vec3(-grad * uNormalScale, 1.0));

    vec2 disp = c.xy;                             // in-plane billow (already a displacement)
    vec2 off  = (n.xy + disp) * uRefraction;
    vec3 bg   = texture(INPUT1, uv).rgb;
    vec3 refr = texture(INPUT1, uv + off).rgb;

    // Fresnel opacity: grazing folds read more opaque, like real chiffon/voile
    float fres  = pow(clamp(1.0 - n.z, 0.0, 1.0), uFresnelPow);
    float alpha = clamp(uBaseOpacity + (1.0 - uBaseOpacity) * fres, 0.0, 1.0);

    float sheen = pow(clamp(dot(n, normalize(vec3(0.3, 0.5, 1.0))), 0.0, 1.0), 18.0);
    vec3 fabric = refr * uTint + uSheen * sheen;

    vec3 col = mix(bg, fabric, alpha);
    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

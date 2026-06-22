// ============================================================
// Sheer Veil — pass "forces" → buffer "vel"
// TouchDesigner GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: vel (Feedback TOP loop)
//   Input 1: pos buffer TOP
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
uniform float uStiffness;
uniform float uTether;
uniform float uDamping;
uniform float uGravity;
uniform float uWind;
uniform float uGrabRadius;
uniform float uPointerForce;

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

// Strain spring pulling P toward the neighbor at offset off (uv), rest length rest.
// P, Q are DISPLACEMENTS; the constant grid offset is added back exactly so the
// neighbor distance keeps full precision despite half-float storage. At a clamped
// edge the sample returns this particle's own displacement, so d == vec3(off,0) →
// strain 0 → no force (a free edge), which is the intended boundary.
vec3 spring(vec3 P, vec2 uv, vec2 off, float rest, float k){
    vec3 Q = texture(INPUT1, uv + off).xyz;
    vec3 d = vec3(off, 0.0) + (Q - P);
    float len = length(d);
    if (len < 1e-7) return vec3(0.0);        // coincident neighbors → no spring
    return k * (len / rest - 1.0) * (d / len);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 vel = texture(INPUT0, uv).xyz;
    vec3 P   = texture(INPUT1, uv).xyz;       // displacement from rest
    vec2 t = uTexel;

    float kS  = uStiffness;        // structural (orthogonal)
    float kSh = uStiffness * 0.6;  // shear (diagonal), a touch softer
    float dl  = length(t);

    vec3 f = vec3(0.0);
    f += spring(P, uv, vec2( t.x, 0.0), t.x, kS);
    f += spring(P, uv, vec2(-t.x, 0.0), t.x, kS);
    f += spring(P, uv, vec2(0.0,  t.y), t.y, kS);
    f += spring(P, uv, vec2(0.0, -t.y), t.y, kS);
    f += spring(P, uv, vec2( t.x,  t.y), dl, kSh);
    f += spring(P, uv, vec2(-t.x,  t.y), dl, kSh);
    f += spring(P, uv, vec2( t.x, -t.y), dl, kSh);
    f += spring(P, uv, vec2(-t.x, -t.y), dl, kSh);

    // soft anchor to the rest grid — holds the sheet on screen, lets it ripple.
    // Rest is zero displacement, so this just pulls the displacement toward 0.
    f -= P * uTether;

    // gravity pulls toward lower screen y
    f.y -= uGravity;

    // animated wind: a travelling swell in z (toward/away) + a little turbulence
    float swell = sin(time * 2.0 + uv.x * 12.0 + uv.y * 6.0);
    float turb  = hash21(floor(uv * 9.0) + floor(time * 3.0)) - 0.5;
    f.z += uWind * (swell * 0.6 + turb * 0.4);
    f.x += uWind * 0.3 * sin(time * 1.3 + uv.y * 8.0);

    // mouse grab pulls nearby particles toward the cursor (aspect-correct falloff).
    // Cursor is in uv space, so compare against the absolute position uv + P.xy.
    if (uMouseDown > 0.5){
        vec2 toM = uMouse - (uv + P.xy);
        vec2 dm = toM * vec2(res.x / res.y, 1.0);
        float fall = exp(-dot(dm, dm) / (uGrabRadius * uGrabRadius));
        f.xy += toM * uPointerForce * fall;
        f.z  += uPointerForce * 0.5 * fall;     // also tug toward the viewer
    }

    vel += f * uDt;
    vel *= uDamping;
    vel = clamp(vel, vec3(-4.0), vec3(4.0));     // cap for explicit-integration safety
    return vec4(vel, 0.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

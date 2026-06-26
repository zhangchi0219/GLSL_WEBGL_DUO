import type { SimModule, SimPassDef } from "./types";
import type { ParamDef } from "../filters/types";

// 2.5D sheer-cloth simulation, composited over the source image. A grid of cloth
// particles (one per texel) carries a 3D position; the sheet billows toward/away
// from the viewer and the display pass refracts the image through its wrinkle
// normals with Fresnel opacity — the "floating silk / chiffon" look.
//
// Physics: mass-spring + semi-implicit Euler over two RGBA16F buffers.
//   pos — xyz = particle DISPLACEMENT from rest (rest = vec3(0); absolute pos is
//         vec3(uv,0) + disp); w unused.
//   vel — xyz = particle velocity.
// Displacement (not absolute position) is stored because the buffers are half
// float: absolute uv positions in [0,1] have a half-float ULP (~5e-4 near 1.0)
// at or above the inter-particle spacing (~1/width), so neighbor differences —
// the basis of every spring — would round to garbage. Displacements live near 0
// where half-float is precise, and the exact grid offset is added back when
// differencing neighbors (see `spring`), keeping sub-texel distances accurate.
// A velocity buffer (not Verlet's previous-position) is used because the engine's
// ping-pong only exposes the front texture, so last-frame position can't be read
// back cleanly. Springs are STRAIN-based (k * (len/rest - 1)) so the stiffness is
// dimensionless and resolution-independent. A soft tether to rest keeps the
// un-pinned veil from rigid-drifting off-screen.

const SEED_POS = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){
    return vec4(0.0);   // zero displacement = flat sheet at rest
}
`;

const SEED_VEL = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){
    return vec4(0.0);
}
`;

// vel (INPUT0) ← neighbor springs (pos = INPUT1) + gravity + wind + tether + grab.
const FORCES = /* glsl */ `
uniform float uStiffness;
uniform float uTether;
uniform float uDamping;
uniform float uGravity;
uniform float uWind;
uniform float uGrabRadius;
uniform float uPointerForce;
uniform vec2  uClothCenter;
uniform vec2  uClothSize;

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

// Is the rest position uv inside the centered cloth panel?
bool inCloth(vec2 uv){ vec2 d = abs(uv - uClothCenter); return d.x < uClothSize.x && d.y < uClothSize.y; }

// Strain spring pulling P toward the neighbor at offset off (uv), rest length rest.
// P, Q are DISPLACEMENTS; the constant grid offset is added back exactly so the
// neighbor distance keeps full precision despite half-float storage. A neighbor
// outside the panel is a free edge (no spring), so the bounded sheet's borders flap.
vec3 spring(vec3 P, vec2 uv, vec2 off, float rest, float k){
    if (!inCloth(uv + off)) return vec3(0.0); // free edge at the panel boundary
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
`;

// pos (INPUT0) ← pos + vel (INPUT1) * dt, confined to the panel, with a region-top pin.
const INTEGRATE = /* glsl */ `
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
`;

// Screen-space sheer render: refract the image through wrinkle normals + Fresnel.
const DISPLAY = /* glsl */ `
uniform float uRefraction;
uniform float uNormalScale;
uniform float uBaseOpacity;
uniform float uFresnelPow;
uniform float uSheen;
uniform vec3  uTint;
uniform vec2  uClothCenter;
uniform vec2  uClothSize;

// Soft-edged membership of the centered panel: 1 inside, 0 outside, smooth border.
float clothMask(vec2 uv){
    vec2 d = uClothSize - abs(uv - uClothCenter);          // >0 inside on each axis
    float edge = min(uClothSize.x, uClothSize.y) * 0.12;   // soft border width
    return smoothstep(0.0, edge, min(d.x, d.y));
}

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

    // confine the fabric to the centered panel; sample the mask at the displaced
    // position so the soft silhouette waves with the in-plane billow
    alpha *= clothMask(uv - disp);

    float sheen = pow(clamp(dot(n, normalize(vec3(0.3, 0.5, 1.0))), 0.0, 1.0), 18.0);
    vec3 fabric = refr * uTint + uSheen * sheen;

    vec3 col = mix(bg, fabric, alpha);
    return vec4(col, 1.0);
}
`;

const forces: SimPassDef = { name: "forces", core: FORCES, out: "vel", inputs: ["self", "pos"] };
const integrate: SimPassDef = { name: "integrate", core: INTEGRATE, out: "pos", inputs: ["self", "vel"] };
const display: SimPassDef = { name: "display", core: DISPLAY, out: "screen", inputs: ["pos", "source"] };

function baseParams(): ParamDef[] {
  return [
    { name: "uClothCenter", type: "vec2", value: [0.5, 0.5], min: 0.0, max: 1.0, step: 0.01, label: "Cloth Center" },
    { name: "uClothSize", type: "vec2", value: [0.22, 0.30], min: 0.05, max: 0.5, step: 0.01, label: "Cloth Size" },
    { name: "uStiffness", type: "float", value: 16.0, min: 0.0, max: 60.0, step: 0.5, label: "Stiffness" },
    { name: "uTether", type: "float", value: 6.0, min: 0.0, max: 30.0, step: 0.1, label: "Anchor" },
    { name: "uDamping", type: "float", value: 0.96, min: 0.8, max: 0.995, step: 0.001, label: "Damping" },
    { name: "uGravity", type: "float", value: 0.3, min: 0.0, max: 3.0, step: 0.01, label: "Gravity" },
    { name: "uWind", type: "float", value: 0.5, min: 0.0, max: 3.0, step: 0.01, label: "Wind" },
    { name: "uPinTop", type: "bool", value: false, label: "Pin Top Edge" },
    { name: "uGrabRadius", type: "float", value: 0.12, min: 0.02, max: 0.4, step: 0.005, label: "Grab Radius" },
    { name: "uPointerForce", type: "float", value: 1.2, min: 0.0, max: 5.0, step: 0.01, label: "Grab Force" },
    { name: "uRefraction", type: "float", value: 0.08, min: 0.0, max: 0.4, step: 0.001, label: "Refraction" },
    { name: "uNormalScale", type: "float", value: 8.0, min: 0.5, max: 40.0, step: 0.1, label: "Wrinkle Sharpness" },
    { name: "uBaseOpacity", type: "float", value: 0.5, min: 0.0, max: 1.0, step: 0.01, label: "Base Opacity" },
    { name: "uFresnelPow", type: "float", value: 2.5, min: 0.5, max: 6.0, step: 0.05, label: "Fresnel Power" },
    { name: "uSheen", type: "float", value: 0.4, min: 0.0, max: 2.0, step: 0.01, label: "Sheen" },
    { name: "uTint", type: "color", value: [0.85, 0.88, 0.95], label: "Fabric Tint" },
  ];
}

function make(name: string, desc: string, overrides: Record<string, number | boolean>): SimModule {
  const params = baseParams().map((p) =>
    overrides[p.name] !== undefined ? { ...p, value: overrides[p.name] } : p,
  );
  return {
    // shared meta.id → one set of TD kernels for both variants
    meta: { id: "cloth", name, group: "Simulation", desc, animated: true },
    params,
    buffers: [
      { name: "pos", components: 4 },
      { name: "vel", components: 4 },
    ],
    init: [
      { name: "seedPos", core: SEED_POS, out: "pos", inputs: [] },
      { name: "seedVel", core: SEED_VEL, out: "vel", inputs: [] },
    ],
    step: [forces, integrate],
    display,
    needsSource: true,
  };
}

export const veil = make(
  "Sheer Veil",
  "A single sheer fabric panel floating in the center, blown by wind over the image. Drag to grab and deform it; see-through, with edges and folds reading more opaque. Move/resize it with Cloth Center / Cloth Size.",
  { uGravity: 0.0, uWind: 1.0, uTether: 3.0, uPinTop: false },
);

export const banner = make(
  "Hanging Banner",
  "A centered chiffon panel pinned at its top edge, hanging under gravity with a gentle breeze. Drag to push it around; release and watch it settle.",
  { uGravity: 0.6, uWind: 0.3, uTether: 4.0, uPinTop: true },
);

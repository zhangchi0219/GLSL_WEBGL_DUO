// ============================================================
// Domain-Warped Noise — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/noisewarp.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uScale;
uniform float uOctaves;
uniform float uLacunarity;
uniform float uGain;
uniform float uWarp;
uniform float uWarp2;
uniform float uContrast;
uniform vec2  uFlow;
uniform vec2  uFlowA;
uniform vec2  uRegionACenter;
uniform vec2  uRegionASize;
uniform vec2  uFlowB;
uniform vec2  uRegionBCenter;
uniform vec2  uRegionBSize;
uniform float uRegionFeather;
uniform float uShowRegion;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uMix;

float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Value noise in [0,1] with a quintic fade for C2-continuous gradients.
float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian motion. Fixed loop bound + break on the uniform octave count
// (a uniform loop bound itself can fail to compile on some GLSL ES 3.00 drivers).
float fbm(vec2 p){
    float sum = 0.0, amp = 0.5, norm = 0.0;
    const int MAX_OCT = 8;
    for (int i = 0; i < MAX_OCT; i++){
        if (float(i) >= uOctaves) break;
        sum  += amp * vnoise(p);
        norm += amp;
        p    *= uLacunarity;
        amp  *= uGain;
    }
    return sum / max(norm, 1e-4);
}

// signed box edge in uv space: <0 inside the rectangle, >0 outside.
float boxEdge(vec2 uv, vec2 c, vec2 s){
    vec2 rd = abs(uv - c) - 0.5 * s;
    return max(rd.x, rd.y);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    // aspect-correct, centered domain at the chosen base scale
    vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * uScale;

    // two fast-flow regions, each with its own velocity; soft feathered edges
    float edgeA   = boxEdge(uv, uRegionACenter, uRegionASize);
    float edgeB   = boxEdge(uv, uRegionBCenter, uRegionBSize);
    float insideA = 1.0 - smoothstep(0.0, uRegionFeather, edgeA);
    float insideB = 1.0 - smoothstep(0.0, uRegionFeather, edgeB);

    // per-pixel velocity: base flow, overridden by region A then B where present
    vec2 vel = uFlow;
    vel = mix(vel, uFlowA, insideA);
    vel = mix(vel, uFlowB, insideB);
    vec2 flow = vel * time;

    // domain warping: sample fbm at coords displaced by fbm (Inigo Quilez)
    vec2 q = vec2(fbm(p + flow), fbm(p + flow + vec2(5.2, 1.3)));
    vec2 r = q;
    if (uWarp2 > 0.5){
        r = vec2(fbm(p + uWarp * q + vec2(1.7, 9.2)),
                 fbm(p + uWarp * q + vec2(8.3, 2.8)));
    }
    float f = fbm(p + uWarp * r);

    // contrast around the midpoint, then map through the two-color ramp
    float v = clamp((f - 0.5) * uContrast + 0.5, 0.0, 1.0);
    vec3 col = mix(uColorA, uColorB, v);
    // depth: darken by the first warp field for veined marble shading
    col *= 0.6 + 0.4 * clamp(q.x, 0.0, 1.0);

    // 0 = pure pattern, 1 = pattern modulates the loaded image
    vec3 src = texture(INPUT0, uv).rgb;
    col = mix(col, col * src, uMix);

    // optional outlines so the slider-defined selections are visible
    if (uShowRegion > 0.5){
        float lineA = 1.0 - smoothstep(0.0, 0.004, abs(edgeA));
        float lineB = 1.0 - smoothstep(0.0, 0.004, abs(edgeB));
        col = mix(col, vec3(1.0, 0.3, 0.0), lineA * 0.9);  // A = orange
        col = mix(col, vec3(0.0, 0.7, 1.0), lineB * 0.9);  // B = cyan
    }

    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================

uniform float uTime;


uniform float uMaskEnable;
uniform vec2  uMaskACenter;
uniform vec2  uMaskASize;
uniform float uMaskAAmt;
uniform vec2  uMaskBCenter;
uniform vec2  uMaskBSize;
uniform float uMaskBAmt;
uniform float uMaskFeather;
uniform float uMaskShow;

float _maskBox(vec2 uv, vec2 c, vec2 s){
    vec2 d = abs(uv - c) - 0.5 * s;
    return max(d.x, d.y);                 // <0 inside the rectangle, >0 outside
}

vec4 _applyMask(vec4 eff, vec4 orig, vec2 uv){
    if (uMaskEnable < 0.5) return eff;     // default off ⇒ unchanged
    float ea = _maskBox(uv, uMaskACenter, uMaskASize);
    float eb = _maskBox(uv, uMaskBCenter, uMaskBSize);
    float ia = (1.0 - smoothstep(0.0, uMaskFeather, ea)) * uMaskAAmt;
    float ib = (1.0 - smoothstep(0.0, uMaskFeather, eb)) * uMaskBAmt;
    vec4 outc = mix(orig, eff, clamp(max(ia, ib), 0.0, 1.0));
    if (uMaskShow > 0.5){                  // A = orange, B = cyan outlines
        outc = mix(outc, vec4(1.0, 0.3, 0.0, 1.0), (1.0 - smoothstep(0.0, 0.004, abs(ea))) * 0.9);
        outc = mix(outc, vec4(0.0, 0.7, 1.0, 1.0), (1.0 - smoothstep(0.0, 0.004, abs(eb))) * 0.9);
    }
    return outc;
}

void main(){
    vec4 eff = renderMain(vUV.st, uTDOutputInfo.res.zw, uTime);
    fragColor = TDOutputSwizzle(_applyMask(eff, texture(INPUT0, vUV.st), vUV.st));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uTime        float expr: absTime.seconds   drives the animation
  uScale       float 3.0            Base Scale
  uOctaves     float 5.0            Octaves
  uLacunarity  float 2.0            Lacunarity
  uGain        float 0.5            Gain
  uWarp        float 4.0            Warp Strength
  uWarp2       float 1              Second Warp
  uContrast    float 1.4            Contrast
  uFlow        vec2  0.0 0.0        Base Flow X / Y
  uFlowA       vec2  0.4 0.0        A Flow X / Y
  uRegionACenter vec2  0.25 0.5       A Center
  uRegionASize vec2  0.3 0.6        A Size
  uFlowB       vec2  -0.4 0.0       B Flow X / Y
  uRegionBCenter vec2  0.75 0.5       B Center
  uRegionBSize vec2  0.3 0.6        B Size
  uRegionFeather float 0.08           Region Edge
  uShowRegion  float 0              Show Regions
  uColorA      vec3  0.04 0.12 0.18  Low Color
  uColorB      vec3  0.96 0.82 0.55  High Color
  uMix         float 0.0            Mix w/ Image
  uMaskEnable  float 0              Region Mask
  uMaskACenter vec2  0.3 0.5        A Center
  uMaskASize   vec2  0.35 0.6       A Size
  uMaskAAmt    float 1.0            A Amount
  uMaskBCenter vec2  0.7 0.5        B Center
  uMaskBSize   vec2  0.35 0.6       B Size
  uMaskBAmt    float 1.0            B Amount
  uMaskFeather float 0.04           Mask Edge
  uMaskShow    float 0              Show Boxes

Inputs: Input 0 = source TOP (sampled as INPUT0).
Perf: many texture taps per pixel — at 4K lower the radius/length or downres first.
=============================================== */

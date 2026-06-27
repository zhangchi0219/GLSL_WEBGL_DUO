// ============================================================
// Kuwahara (Oil) — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/kuwahara.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uRadius;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    int r = int(clamp(uRadius, 1.0, 8.0));

    vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
    vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
    float c0 = 0.0, c1 = 0.0, c2 = 0.0, c3 = 0.0;

    for (int y = -8; y <= 8; y++){
        if (y < -r || y > r) continue;
        for (int x = -8; x <= 8; x++){
            if (x < -r || x > r) continue;
            vec3 col = texture(INPUT0, uv + vec2(float(x), float(y)) * t).rgb;
            vec3 col2 = col * col;
            if (x <= 0 && y <= 0){ m0 += col; s0 += col2; c0 += 1.0; }
            if (x >= 0 && y <= 0){ m1 += col; s1 += col2; c1 += 1.0; }
            if (x <= 0 && y >= 0){ m2 += col; s2 += col2; c2 += 1.0; }
            if (x >= 0 && y >= 0){ m3 += col; s3 += col2; c3 += 1.0; }
        }
    }

    m0 /= c0; m1 /= c1; m2 /= c2; m3 /= c3;
    float v0 = dot(s0 / c0 - m0 * m0, vec3(1.0));
    float v1 = dot(s1 / c1 - m1 * m1, vec3(1.0));
    float v2 = dot(s2 / c2 - m2 * m2, vec3(1.0));
    float v3 = dot(s3 / c3 - m3 * m3, vec3(1.0));

    vec3 col = m0; float mv = v0;
    if (v1 < mv){ mv = v1; col = m1; }
    if (v2 < mv){ mv = v2; col = m2; }
    if (v3 < mv){ mv = v3; col = m3; }
    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================


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
    vec4 eff = renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0);
    fragColor = TDOutputSwizzle(_applyMask(eff, texture(INPUT0, vUV.st), vUV.st));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uRadius      float 4.0            Radius (px)
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

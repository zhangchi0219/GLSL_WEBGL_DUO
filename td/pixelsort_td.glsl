// ============================================================
// Pixel Sort — TouchDesigner GLSL TOP (GLSL 4.60)
// AUTO-GENERATED from src/filters/pixelsort.ts by `npm run gen:td`.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uLow;
uniform float uHigh;
uniform float uLength;
uniform float uVertical;
uniform float uReverse;
uniform float uMode;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    vec2 dir = (uVertical > 0.5) ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
    dir *= (uReverse > 0.5) ? -1.0 : 1.0;

    vec4 cur = texture(INPUT0, uv);
    float cl = luma(cur.rgb);
    if (cl < uLow || cl > uHigh) return vec4(cur.rgb, 1.0); // outside mask: untouched

    int maxN = int(clamp(uLength, 1.0, 280.0));
    vec4 best = cur; float bestL = cl;
    for (int i = 1; i < 280; i++){
        if (i > maxN) break;
        vec2 suv = uv + dir * texel * float(i);
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) break;
        vec4 s = texture(INPUT0, suv);
        float l = luma(s.rgb);
        if (l < uLow || l > uHigh) break;              // span boundary
        bool take = (uMode > 0.5) ? (l < bestL) : (l > bestL);
        if (take){ bestL = l; best = s; }
    }
    return vec4(best.rgb, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.

Vectors page (custom uniforms):
  uLow         float 0.25           Mask Low
  uHigh        float 0.8            Mask High
  uLength      float 120.0          Sort Length (px)
  uVertical    float 0              Vertical
  uReverse     float 0              Reverse Dir
  uMode        float 0              Darkest (off=Bright)

Inputs: Input 0 = source TOP (sampled as INPUT0).
Perf: many texture taps per pixel — at 4K lower the radius/length or downres first.
A true pixel sort is multi-pass — loop this through a Feedback TOP for a stronger result.
=============================================== */

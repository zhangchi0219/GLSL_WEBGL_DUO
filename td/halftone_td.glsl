// ============================================================
// Halftone / Dot Screen — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (halftone).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uScale;
uniform float uAngle;
uniform float uColor;
uniform vec3  uInk;
uniform vec3  uPaper;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
mat2 rot2(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float dotMask(vec2 uv, vec2 res, float cellPx, float angle, float value){
    vec2 p = rot2(angle) * (uv * res);
    vec2 cell = mod(p, cellPx) / cellPx - 0.5;
    float d = length(cell) * 2.0;
    float r = sqrt(clamp(value, 0.0, 1.0));
    return smoothstep(r + 0.08, r - 0.08, d);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 src = texture(INPUT0, uv).rgb;
    float a = radians(uAngle);
    vec3 col;
    if (uColor > 0.5){
        float mr = dotMask(uv, res, uScale, a + radians(15.0), src.r);
        float mg = dotMask(uv, res, uScale, a + radians(75.0), src.g);
        float mb = dotMask(uv, res, uScale, a + radians(45.0), src.b);
        col = vec3(mr, mg, mb);
    } else {
        float m = dotMask(uv, res, uScale, a, 1.0 - luma(src));
        col = mix(uPaper, uInk, m);
    }
    return vec4(col, 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uScale  float  8      dot cell size in pixels
  uAngle  float  30     screen angle (degrees)
  uColor  float  0      0 = mono ink/paper, 1 = RGB screens on black
  uInk    vec3   0.06 0.05 0.05
  uPaper  vec3   0.93 0.91 0.84
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

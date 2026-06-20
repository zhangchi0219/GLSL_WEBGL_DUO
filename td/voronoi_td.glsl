// ============================================================
// Voronoi Crystallize — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (voronoi).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uScale;
uniform float uJitter;
uniform float uEdge;
uniform vec3  uEdgeColor;

vec2 hash22(vec2 p){
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float cellPx = max(uScale, 2.0);
    vec2 grid = res / cellPx;
    vec2 g = uv * grid;
    vec2 gi = floor(g), gf = fract(g);

    float md = 1e9, md2 = 1e9;
    vec2 featAbs = gi;
    for (int y = -1; y <= 1; y++){
        for (int x = -1; x <= 1; x++){
            vec2 o = vec2(float(x), float(y));
            vec2 feat = o + (hash22(gi + o) - 0.5) * uJitter;
            float d = length(gf - feat);
            if (d < md){ md2 = md; md = d; featAbs = gi + feat; }
            else if (d < md2){ md2 = d; }
        }
    }

    vec3 col = texture(INPUT0, featAbs / grid).rgb;
    if (uEdge > 0.0){
        float e = smoothstep(0.0, uEdge, md2 - md);
        col = mix(uEdgeColor, col, e);
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
  uScale      float  24     cell size (px)
  uJitter     float  1.0    cell randomness (0 = square grid)
  uEdge       float  0.0    cell border width (0 = no borders, try 0.05)
  uEdgeColor  vec3   0.03 0.03 0.03
Inputs: Input 0 = source TOP.  CHOP wiring: none.
=============================================== */

// ============================================================
// Voronoi Crystallize — TouchDesigner GLSL TOP (GLSL 4.60)
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target.
// Suggested TOP name: glsl_voronoi; Pixel Shader DAT: shader_voronoi.
// Export ID: voronoi. Generated from the shared GLSL core.
// The SHARED CORE below is the exact same string the WebGL2 app compiles —
// byte-identical by construction. Edit the filter module, not this file.
// No #version line: TouchDesigner inserts it.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define uResolution (uTDOutputInfo.res.zw)
uniform float uTime;
uniform vec2 uMouse;

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
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > GLSL Version 4.60, Mode Vertex/Pixel. Pixel Format: 8-bit fixed RGBA
(matches the browser preview). Connect your source TOP to Input 0.
Set Input Extend Mode UV = Hold, Input Smoothness = Interpolate Pixels (no mipmaps).
If the build exposes Working Color Space, use Passthrough when matching the browser's raw RGB values.

Vectors page (custom uniforms):
  uTime        float expr: absTime.seconds   drives the animation
  uMouse       vec2  0.5 0.5   Mouse In CHOP normalized 0–1, y-up
  uScale       float 24.0           Cell Size (px)
  uJitter      float 1.0            Jitter
  uEdge        float 0.0            Edge Width
  uEdgeColor   vec3  0.03 0.03 0.03  Edge Color

Inputs: Input 0 = source TOP (sampled as INPUT0).
=============================================== */

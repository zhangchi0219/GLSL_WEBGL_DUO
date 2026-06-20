// ============================================================
// Oilify (Oil Paint) — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (oilify).
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uRadius;
uniform float uLevels;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    int r = int(clamp(uRadius, 1.0, 8.0));
    int levels = int(clamp(uLevels, 2.0, 32.0));

    int count[32];
    vec3 avg[32];
    for (int i = 0; i < 32; i++){ count[i] = 0; avg[i] = vec3(0.0); }

    for (int y = -8; y <= 8; y++){
        if (y < -r || y > r) continue;
        for (int x = -8; x <= 8; x++){
            if (x < -r || x > r) continue;
            vec3 c = texture(INPUT0, uv + vec2(float(x), float(y)) * t).rgb;
            int lvl = int(luma(c) * float(levels - 1) + 0.5);
            lvl = clamp(lvl, 0, 31);
            count[lvl] += 1;
            avg[lvl] += c;
        }
    }

    int mi = 0, mc = 0;
    for (int i = 0; i < 32; i++){
        if (i >= levels) break;
        if (count[i] > mc){ mc = count[i]; mi = i; }
    }
    return vec4(avg[mi] / float(max(mc, 1)), 1.0);
}
// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, 0.0));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uRadius  float  4      neighborhood radius (px)
  uLevels  float  16     intensity buckets (lower = chunkier strokes)
Inputs: Input 0 = source TOP.  CHOP wiring: none.
Perf: ~(2r+1)^2 taps per pixel; lower uRadius or downres at 4K.
=============================================== */

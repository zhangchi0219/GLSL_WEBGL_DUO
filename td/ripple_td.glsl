// ============================================================
// Ripple Displace — TouchDesigner GLSL TOP port (GLSL 4.60)
// Shared core is byte-identical to filters-preview.html (ripple).
// Animated by uTime → wire it on the Vectors page.
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

// ===================== SHARED CORE =====================
uniform float uAmplitude;
uniform float uFrequency;
uniform float uSpeed;
uniform vec2  uCenter;

vec4 renderMain(vec2 uv, vec2 res, float time){
    float aspect = res.x / res.y;
    vec2 d = uv - uCenter;
    vec2 da = d * vec2(aspect, 1.0);
    float dist = length(da);
    float wave = sin(dist * uFrequency - time * uSpeed);
    vec2 dir = (dist > 1e-5) ? d / dist : vec2(0.0);
    vec2 suv = uv + dir * wave * uAmplitude * 0.02;
    return vec4(texture(INPUT0, suv).rgb, 1.0);
}
// =================== END SHARED CORE ===================

uniform float uTime;

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}

/* ============ TOUCHDESIGNER SETUP ============
GLSL TOP > 4.60. Pixel Format: 8-bit fixed RGBA. Input 0 ← source TOP.

Vectors page:
  uTime       float  expr: absTime.seconds   (drives the animation)
  uAmplitude  float  0.5
  uFrequency  float  30
  uSpeed      float  2.0
  uCenter     vec2   0.5 0.5
Inputs: Input 0 = source TOP.  CHOP wiring: optional (uTime can be a CHOP export).
=============================================== */

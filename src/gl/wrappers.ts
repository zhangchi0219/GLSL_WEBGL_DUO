// WebGL2 platform wrapper. The shared core is sandwiched between TOP and BOTTOM.
// Mirrors the TouchDesigner wrapper (td/wrapper.ts): same uniform names, same
// INPUT0 macro — that is what keeps the core byte-identical across both targets.

export const VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){ vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

export const FS_TOP = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;
uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;
uniform sampler2D uTex0;
#define INPUT0 uTex0
`;

export const FS_BOTTOM = `
void main(){ fragColor = renderMain(vUV, uResolution, uTime); }`;

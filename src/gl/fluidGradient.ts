import type { FilterModule } from "../filters/types";
import { createProgram } from "./program";
import { FS_TOP, FS_BOTTOM } from "./wrappers";

export const fluidGradientModule: FilterModule = {
  meta: { id: "gradient-source", name: "Gradient Fluid", group: "Tone", desc: "缓慢流动的液态渐变底图。无输入，作为滤镜或模拟的 source TOP。", animated: true },
  params: [],
  core: `vec4 renderMain(vec2 uv, vec2 res, float time) {
    float t = time * 0.12;
    vec2 p = (uv - 0.5) * 2.0;
    p.x *= res.x / max(res.y, 1.0);

    // Slow domain warps create broad, liquid folds.
    vec2 q = p;
    for (int i = 0; i < 4; i++) {
        float f = float(i) + 1.0;
        q += 0.34 / f * vec2(
            sin(q.y * (2.0 + f) + t + f * 1.7),
            cos(q.x * (1.7 + f) - t * 0.8 + f)
        );
    }

    float fold = sin(q.x * 2.1 + q.y * 3.0 + t);
    float flow = sin(q.y * 2.5 - q.x * 1.2 - t * 0.7);
    float light = 0.5 + 0.5 * sin(q.x * 0.8 - q.y * 0.9 + t * 0.35);

    vec3 ink = vec3(0.11, 0.07, 0.25);
    vec3 violet = vec3(0.46, 0.29, 0.84);
    vec3 cyan = vec3(0.28, 0.76, 0.81);
    vec3 peach = vec3(0.95, 0.63, 0.55);
    vec3 color = mix(ink, violet, smoothstep(-0.95, 0.75, fold));
    color = mix(color, cyan, smoothstep(-0.15, 0.9, flow) * 0.82);
    float warm = smoothstep(0.35, 0.95, fold)
               * (1.0 - smoothstep(-0.35, 0.7, flow));
    color = mix(color, peach, warm * (0.55 + light * 0.3));
    float sheen = pow(max(0.0, 1.0 - abs(fold + flow * 0.18)), 12.0);
    color += vec3(0.04, 0.08, 0.09) * sheen;
    return vec4(color, 1.0);
}
`,
};

// Render the source in the active engine's context: no extra canvas/context,
// readback or full-image upload per frame.
export class FluidGradient {
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private framebuffer: WebGLFramebuffer;
  private time: WebGLUniformLocation | null;
  private resolution: WebGLUniformLocation | null;
  private width = 0;
  private height = 0;
  constructor(private gl: WebGL2RenderingContext) {
    this.program = createProgram(gl, FS_TOP, fluidGradientModule.core, FS_BOTTOM, []);
    this.texture = gl.createTexture()!;
    this.framebuffer = gl.createFramebuffer()!;
    this.time = gl.getUniformLocation(this.program, "uTime");
    this.resolution = gl.getUniformLocation(this.program, "uResolution");
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  render(width: number, height: number, time: number): WebGLTexture {
    const gl = this.gl;
    const scale = Math.min(1, 1280 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (w !== this.width || h !== this.height) {
      this.width = w; this.height = h;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("无法创建 Gradient 底图。");
    } else gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);
    gl.uniform1f(this.time, time);
    gl.uniform2f(this.resolution, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return this.texture;
  }
  dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteTexture(this.texture);
    this.gl.deleteFramebuffer(this.framebuffer);
  }
}

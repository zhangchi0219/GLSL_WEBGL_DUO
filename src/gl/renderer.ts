import { FS_TOP, FS_BOTTOM } from "./wrappers";
import { createProgram, drawingSize, type PreviewQuality } from "./program";
import type { ParamDef, ParamState } from "../filters/types";
import { FluidGradient } from "./fluidGradient";

// Generic WebGL2 fullscreen-pass engine. Holds NO per-filter state beyond the
// currently compiled program — it is a stateless consumer of (core, params, image).
// Swap the core with setCore(); push values every frame with render().
export class Renderer {
  readonly gl: WebGL2RenderingContext;
  quality: PreviewQuality = "standard";
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private prog: WebGLProgram | null = null;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private tex: WebGLTexture;
  private params: ParamDef[] = [];
  private gradient: FluidGradient | null = null;
  private gradientEnabled = false;
  imgAspect = 16 / 9;
  get animated(): boolean { return this.gradientEnabled || this.uni.uTime != null; }
  setGradient(enabled: boolean): void {
    this.gradientEnabled = enabled;
    if (enabled && !this.gradient) this.gradient = new FluidGradient(this.gl);
  }

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 is not supported in this browser.");
    this.gl = gl;

    // fullscreen triangle (no vertex buffer churn; covers the screen)
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // source texture (1px placeholder until an image is set)
    this.tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // match TD's vUV orientation
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([128, 128, 128, 255]));
  }

  compileCore(core: string, params: ParamDef[]): void {
    const gl = this.gl;
    const p = createProgram(gl, FS_TOP, core, FS_BOTTOM, params);
    const uni: typeof this.uni = {};
    ["uTime", "uResolution", "uMouse", "uTex0", ...params.map((x) => x.name)].forEach((n) => (uni[n] = gl.getUniformLocation(p, n)));
    gl.useProgram(p);
    gl.uniform1i(uni.uTex0, 0);
    if (this.prog) gl.deleteProgram(this.prog);
    this.prog = p;
    this.params = params;
    this.uni = uni;
  }

  // Kept for existing integrations; compileCore exposes structured diagnostics.
  setCore(core: string, params: ParamDef[]): string | null {
    try {
      this.compileCore(core, params);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  setImage(img: TexImageSource): void {
    const gl = this.gl;
    const dimensions = img as { width?: number; height?: number };
    if (Math.max(dimensions.width ?? 0, dimensions.height ?? 0) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw new Error(`图片超过 GPU 支持的 ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}px 纹理尺寸。`);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const a = img as { width?: number; height?: number; videoWidth?: number; videoHeight?: number };
    const w = a.width || a.videoWidth || 16;
    const h = a.height || a.videoHeight || 9;
    this.imgAspect = w / h;
  }

  private resize(): void {
    const [w, h] = drawingSize(this.canvas, this.quality);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  render(timeSec: number, state: ParamState, mouse: [number, number]): void {
    this.resize();
    if (!this.prog) return;
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    const source = this.gradientEnabled ? this.gradient!.render(this.canvas.width, this.canvas.height, timeSec) : this.tex;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.prog);
    gl.uniform1f(this.uni["uTime"], timeSec);
    gl.uniform2f(this.uni["uResolution"], this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uni["uMouse"], mouse[0], mouse[1]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source);
    for (const p of this.params) {
      const loc = this.uni[p.name];
      if (loc == null) continue;
      const v = state[p.name] ?? p.value;
      if (p.type === "float") gl.uniform1f(loc, v as number);
      else if (p.type === "bool") gl.uniform1f(loc, v ? 1.0 : 0.0);
      else if (p.type === "vec2") gl.uniform2f(loc, (v as number[])[0], (v as number[])[1]);
      else if (p.type === "color")
        gl.uniform3f(loc, (v as number[])[0], (v as number[])[1], (v as number[])[2]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  dispose(): void {
    this.gradient?.dispose();
    if (this.prog) this.gl.deleteProgram(this.prog);
    this.gl.deleteTexture(this.tex);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.buffer);
    this.prog = null;
  }
}

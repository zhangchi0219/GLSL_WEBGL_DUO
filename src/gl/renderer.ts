import { VS, FS_TOP, FS_BOTTOM } from "./wrappers";
import type { ParamDef, ParamState } from "../filters/types";

// Generic WebGL2 fullscreen-pass engine. Holds NO per-filter state beyond the
// currently compiled program — it is a stateless consumer of (core, params, image).
// Swap the core with setCore(); push values every frame with render().
export class Renderer {
  readonly gl: WebGL2RenderingContext;
  private prog: WebGLProgram | null = null;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private tex: WebGLTexture;
  private params: ParamDef[] = [];
  imgAspect = 16 / 9;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) throw new Error("WebGL2 is not supported in this browser.");
    this.gl = gl;

    // fullscreen triangle (no vertex buffer churn; covers the screen)
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
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

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s) || "";
      const numbered = src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n");
      throw new Error(log + "\n--- source ---\n" + numbered);
    }
    return s;
  }

  // Compile a new core. Returns an error string on failure, or null on success.
  setCore(core: string, params: ParamDef[]): string | null {
    const gl = this.gl;
    try {
      const fs = FS_TOP + core + FS_BOTTOM;
      const p = gl.createProgram()!;
      gl.attachShader(p, this.compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(p) || "link failed");
      if (this.prog) gl.deleteProgram(this.prog);
      this.prog = p;
      this.params = params;
      gl.useProgram(p);
      this.uni = {};
      ["uTime", "uResolution", "uMouse", "uTex0", ...params.map((x) => x.name)]
        .forEach((n) => (this.uni[n] = gl.getUniformLocation(p, n)));
      gl.uniform1i(this.uni["uTex0"], 0);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  setImage(img: TexImageSource): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
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
    gl.useProgram(this.prog);
    gl.uniform1f(this.uni["uTime"], timeSec);
    gl.uniform2f(this.uni["uResolution"], this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uni["uMouse"], mouse[0], mouse[1]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    for (const p of this.params) {
      const loc = this.uni[p.name];
      if (loc == null) continue;
      const v = state[p.name];
      if (p.type === "float") gl.uniform1f(loc, v as number);
      else if (p.type === "bool") gl.uniform1f(loc, v ? 1.0 : 0.0);
      else if (p.type === "vec2") gl.uniform2f(loc, (v as number[])[0], (v as number[])[1]);
      else if (p.type === "color")
        gl.uniform3f(loc, (v as number[])[0], (v as number[])[1], (v as number[])[2]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

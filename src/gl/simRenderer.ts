import { SIM_FS_TOP, SIM_FS_BOTTOM } from "./wrappers";
import { createProgram, drawingSize, type PreviewQuality } from "./program";
import type { SimBufferDef, SimModule, SimPassDef } from "../sims/types";
import type { ParamDef, ParamState } from "../filters/types";
import type { Pointer } from "../lib/pointer";
import { FluidGradient } from "./fluidGradient";

interface Slot {
  tex: WebGLTexture[]; // ping-pong pair
  fbo: WebGLFramebuffer[];
  idx: number; // index of the current (front) texture
  w: number;
  h: number;
  scale: number;
}
interface Pass {
  def: SimPassDef;
  prog: WebGLProgram;
  uni: Record<string, WebGLUniformLocation | null>;
}

const UNIFORMS = [
  "uTime", "uDt", "uFrame", "uResolution", "uTexel",
  "uMouse", "uMouseVel", "uMouseDown", "uTex0", "uTex1", "uTex2", "uTex3", "uIteration", "uCanvasResolution",
];

// Stateful multi-pass engine: ping-pong RGBA16F buffers + an ordered per-frame
// pass schedule + a display pass. Holds the buffers; the modules describe passes.
export class SimRenderer {
  readonly gl: WebGL2RenderingContext;
  quality: PreviewQuality = "standard";
  private vao: WebGLVertexArrayObject;
  private vertexBuffer: WebGLBuffer;
  private mod: SimModule | null = null;
  private bufs = new Map<string, Slot>();
  private initPasses: Pass[] = [];
  private stepPasses: Pass[] = [];
  private displayPass: Pass | null = null;
  private params: ParamDef[] = [];
  private sourceTex: WebGLTexture;
  private frameSource: WebGLTexture | null = null;
  private gradient: FluidGradient | null = null;
  private gradientEnabled = false;
  setGradient(enabled: boolean): void {
    this.gradientEnabled = enabled;
    if (enabled && !this.gradient) this.gradient = new FluidGradient(this.gl);
  }
  private dummyTex: WebGLTexture;
  private cw = 0;
  private ch = 0;
  private frame = 0;
  private lastT = performance.now();
  private resetKey: string | null = null;
  private needsInit = true;
  imgAspect = 16 / 9;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 is not supported in this browser.");
    if (!gl.getExtension("EXT_color_buffer_float"))
      throw new Error("EXT_color_buffer_float unavailable — float render targets are required for simulations.");
    this.gl = gl;

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.sourceTex = this.makeTex8(1, 1, new Uint8Array([20, 22, 28, 255]));
    this.dummyTex = this.makeTex8(1, 1, new Uint8Array([0, 0, 0, 255]));
  }

  private makeTex8(w: number, h: number, data: Uint8Array | null): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private makeTexF(w: number, h: number, def: SimBufferDef): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    const full = def.format === "rgba32f";
    gl.texImage2D(gl.TEXTURE_2D, 0, full ? gl.RGBA32F : gl.RGBA16F, w, h, 0, gl.RGBA, full ? gl.FLOAT : gl.HALF_FLOAT, null);
    const filter = def.filter === "nearest" ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private mkFbo(tex: WebGLTexture): WebGLFramebuffer {
    const gl = this.gl;
    const f = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.deleteFramebuffer(f); throw new Error("GPU 无法创建 RGBA16F 缓冲区，请降低预览质量。"); }
    return f;
  }

  private link(core: string, params: ParamDef[], name: string): { prog: WebGLProgram; uni: Pass["uni"] } {
    const gl = this.gl;
    const p = createProgram(gl, SIM_FS_TOP, core, SIM_FS_BOTTOM, params, name);
    gl.useProgram(p);
    const uni: Pass["uni"] = {};
    [...UNIFORMS, ...params.map((x) => x.name)].forEach((n) => (uni[n] = gl.getUniformLocation(p, n)));
    gl.uniform1i(uni["uTex0"], 0);
    gl.uniform1i(uni["uTex1"], 1);
    gl.uniform1i(uni["uTex2"], 2);
    gl.uniform1i(uni["uTex3"], 3);
    return { prog: p, uni };
  }

  compileModule(mod: SimModule): void {
    const allocated: Pass[] = [];
    const mk = (d: SimPassDef): Pass => {
      const pass = { def: d, ...this.link(d.core, mod.params, d.name) };
      allocated.push(pass);
      return pass;
    };
    try {
      const init = (mod.init ?? []).map(mk);
      const step = mod.step.map(mk);
      const display = mk(mod.display);
      this.disposeGraph();
      this.mod = mod;
      this.params = mod.params;
      this.initPasses = init;
      this.stepPasses = step;
      this.displayPass = display;
      this.frame = 0;
      this.cw = 0; // force buffer (re)alloc + init on next render
      this.ch = 0;
      this.lastT = performance.now();
      this.resetKey = null;
      this.needsInit = true;
    } catch (e) {
      allocated.forEach((p) => this.gl.deleteProgram(p.prog));
      throw e;
    }
  }
  setModule(mod: SimModule): string | null {
    try { this.compileModule(mod); return null; } catch (e) { return e instanceof Error ? e.message : String(e); }
  }
  reset(): void { this.needsInit = true; this.frame = 0; this.lastT = performance.now(); }

  setImage(img: TexImageSource): void {
    const gl = this.gl;
    const dims = img as { width?: number; height?: number };
    if (Math.max(dims.width ?? 0, dims.height ?? 0) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw new Error(`图片超过 GPU 支持的 ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}px 纹理尺寸。`);
    gl.deleteTexture(this.sourceTex);
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.sourceTex = t;
    const a = img as { width?: number; height?: number; videoWidth?: number; videoHeight?: number };
    this.imgAspect = (a.width || a.videoWidth || 16) / (a.height || a.videoHeight || 9);
  }

  private ensureBuffers(): boolean {
    const [w, h] = drawingSize(this.canvas, this.quality);
    if (w === this.cw && h === this.ch) return this.needsInit;
    this.cw = w;
    this.ch = h;
    this.canvas.width = w;
    this.canvas.height = h;
    let changed = this.needsInit;
    for (const b of this.mod!.buffers) {
      const scale = b.scale ?? 1.0;
      const bw = b.size?.[0] ?? Math.max(1, Math.round(w * scale));
      const bh = b.size?.[1] ?? Math.max(1, Math.round(h * scale));
      const old = this.bufs.get(b.name);
      if (old && old.w === bw && old.h === bh) continue;
      if (old) this.delSlot(old);
      const tex = [this.makeTexF(bw, bh, b), this.makeTexF(bw, bh, b)];
      this.bufs.set(b.name, { tex, fbo: [this.mkFbo(tex[0]), this.mkFbo(tex[1])], idx: 0, w: bw, h: bh, scale });
      changed = true;
    }
    if (changed) this.frame = 0;
    return changed;
  }

  private runPass(p: Pass, time: number, dt: number, state: ParamState, ptr: Pointer, iteration = 0): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    const isScreen = p.def.out === "screen";
    const target = isScreen ? null : this.bufs.get(p.def.out)!;
    const tw = target ? target.w : this.cw;
    const th = target ? target.h : this.ch;

    gl.useProgram(p.prog);

    // Bind all inputs, including the current front texture for "self".
    for (let i = 0; i < 4; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      const raw = p.def.inputs[i];
      let tex = this.dummyTex;
      if (raw) {
        const name = raw === "self" ? p.def.out : raw;
        if (name === "source") tex = this.frameSource ?? this.sourceTex;
        else {
          const s = this.bufs.get(name);
          if (s) tex = s.tex[s.idx];
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
    }

    gl.uniform1f(p.uni.uTime, time);
    gl.uniform1f(p.uni.uDt, dt);
    gl.uniform1f(p.uni.uFrame, this.frame);
    gl.uniform1f(p.uni.uIteration, iteration);
    gl.uniform2f(p.uni.uCanvasResolution, this.cw, this.ch);
    gl.uniform2f(p.uni.uResolution, tw, th);
    gl.uniform2f(p.uni.uTexel, 1 / tw, 1 / th);
    gl.uniform2f(p.uni.uMouse, ptr.pos[0], ptr.pos[1]);
    gl.uniform2f(p.uni.uMouseVel, ptr.vel[0], ptr.vel[1]);
    gl.uniform1f(p.uni.uMouseDown, ptr.down ? 1 : 0);
    for (const pd of this.params) {
      const loc = p.uni[pd.name];
      if (loc == null) continue;
      const v = state[pd.name] ?? pd.value;
      if (pd.type === "float") gl.uniform1f(loc, v as number);
      else if (pd.type === "bool") gl.uniform1f(loc, v ? 1 : 0);
      else if (pd.type === "vec2") gl.uniform2f(loc, (v as number[])[0], (v as number[])[1]);
      else if (pd.type === "color") gl.uniform3f(loc, (v as number[])[0], (v as number[])[1], (v as number[])[2]);
    }

    if (target) {
      // render into the BACK texture, then swap so it becomes the new front
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo[1 - target.idx]);
      gl.viewport(0, 0, tw, th);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      target.idx = 1 - target.idx;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, tw, th);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  render(time: number, state: ParamState, ptr: Pointer, paused = false): void {
    if (!this.mod || !this.displayPass) return;
    const key = JSON.stringify((this.mod.resetOnParams ?? []).map((name) => state[name] ?? this.params.find((p) => p.name === name)?.value));
    if (this.resetKey !== null && key !== this.resetKey) this.reset();
    this.resetKey = key;
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    dt = Math.min(Math.max(dt, 1e-4), 1 / 30); // clamp for stability

    const resized = this.ensureBuffers();
    this.gl.bindVertexArray(this.vao);
    this.frameSource = this.gradientEnabled && this.mod.needsSource !== false ? this.gradient!.render(this.cw, this.ch, time) : this.sourceTex;
    if (resized) {
      // Reset in place, including buffers without an explicit seed pass.
      for (const slot of this.bufs.values()) {
        for (const fbo of slot.fbo) {
          this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
          this.gl.clearColor(0, 0, 0, 0);
          this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        }
        slot.idx = 0;
      }
      for (const p of this.initPasses) this.runPass(p, time, dt, state, ptr);
      this.needsInit = false;
    }
    for (const p of paused ? [] : this.stepPasses) {
      const iters = p.def.iterations ?? 1;
      for (let k = 0; k < iters; k++) this.runPass(p, time, dt, state, ptr, k);
    }
    this.runPass(this.displayPass, time, dt, state, ptr);
    if (!paused) this.frame++;

    // ease pointer velocity back to rest so splats fade after a stroke
    ptr.vel[0] *= 0.85;
    ptr.vel[1] *= 0.85;
  }

  private delSlot(s: Slot): void {
    s.tex.forEach((t) => this.gl.deleteTexture(t));
    s.fbo.forEach((f) => this.gl.deleteFramebuffer(f));
  }

  private disposeGraph(): void {
    const gl = this.gl;
    [...this.initPasses, ...this.stepPasses, this.displayPass].forEach((p) => p && gl.deleteProgram(p.prog));
    this.initPasses = [];
    this.stepPasses = [];
    this.displayPass = null;
    for (const s of this.bufs.values()) this.delSlot(s);
    this.bufs.clear();
    this.cw = 0;
    this.ch = 0;
  }

  dispose(): void {
    this.gradient?.dispose();
    this.disposeGraph();
    this.gl.deleteTexture(this.sourceTex);
    this.gl.deleteTexture(this.dummyTex);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.vertexBuffer);
  }
}

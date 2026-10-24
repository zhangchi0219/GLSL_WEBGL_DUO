import type { ParamDef } from "../filters/types";
import { VS } from "./wrappers";

export interface ShaderDiagnostic { line?: number; message: string; pass?: string }
export class ShaderBuildError extends Error {
  constructor(message: string, readonly diagnostics: ShaderDiagnostic[]) { super(message); }
}
export function diagnosticsFromLog(log: string, offset = 0, pass?: string): ShaderDiagnostic[] {
  return log.split("\n").filter((line) => line.trim()).map((message) => {
    const match = message.match(/(?:ERROR:\s*)?\d+:(\d+)(?:[:(])/i) ?? message.match(/\d+\((\d+)\)/);
    const line = match ? Number(match[1]) - offset : undefined;
    return { line: line && line > 0 ? line : undefined, message, pass };
  });
}
export function createProgram(gl: WebGL2RenderingContext, top: string, core: string, bottom: string, params: ParamDef[], pass?: string): WebGLProgram {
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  if (!program) throw new Error("无法分配 WebGL 程序。 ");
  let failed = false;
  try {
    for (const [type, source, offset] of [[gl.VERTEX_SHADER, VS, 0], [gl.FRAGMENT_SHADER, top + core + bottom, top.split("\n").length - 1]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("无法分配 Shader。 ");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) || "Shader 编译失败。";
        throw new ShaderBuildError(log, diagnosticsFromLog(log, offset, pass));
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) || "Shader 链接失败。";
      throw new ShaderBuildError(log, [{ message: log, pass }]);
    }
    const builtins = new Set(["uTime", "uResolution", "uMouse", "uTex0", "uTex1", "uTex2", "uTex3", "uTexel", "uDt", "uFrame", "uIteration", "uCanvasResolution", "uMouseVel", "uMouseDown"]);
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
      const uniform = gl.getActiveUniform(program, i)!;
      if (builtins.has(uniform.name)) continue;
      const def = params.find((p) => p.name === uniform.name);
      const expected = def?.type === "vec2" ? gl.FLOAT_VEC2 : def?.type === "color" ? gl.FLOAT_VEC3 : gl.FLOAT;
      if (!def || uniform.type !== expected || uniform.size !== 1) {
        const message = `uniform ${uniform.name} 缺少匹配的参数定义（bool 控件使用 float 0/1）。`;
        throw new ShaderBuildError(message, [{ message, pass }]);
      }
    }
    return program;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    shaders.forEach((shader) => { if (gl.getAttachedShaders(program)?.includes(shader)) gl.detachShader(program, shader); gl.deleteShader(shader); });
    if (failed) gl.deleteProgram(program);
  }
}
export type PreviewQuality = "low" | "standard" | "high";
export function drawingSize(canvas: HTMLCanvasElement, quality: PreviewQuality): [number, number] {
  const factor = quality === "low" ? 0.5 : quality === "high" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const cap = quality === "high" ? 2048 : 1280;
  const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
  const scale = Math.min(factor, cap / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

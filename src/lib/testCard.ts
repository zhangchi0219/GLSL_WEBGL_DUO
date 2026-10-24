// Static preview for compatibility with image-based consumers. The live
// workspace renders its animated Gradient Fluid source directly on the GPU.
let cached: HTMLCanvasElement | null = null;
export function makeTestCard(): HTMLCanvasElement {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  const base = ctx.createLinearGradient(0, 720, 1280, 0);
  base.addColorStop(0, "#17103d"); base.addColorStop(0.45, "#7350cf"); base.addColorStop(1, "#62c6ce");
  ctx.fillStyle = base; ctx.fillRect(0, 0, 1280, 720);
  ctx.filter = "blur(65px)";
  for (const [x,y,r,color] of [[320,650,420,"#6e3ed2"],[950,120,520,"#61d2d1"],[780,500,320,"#eda596"]] as const) {
    const glow = ctx.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,color); glow.addColorStop(1,color+"00");
    ctx.fillStyle = glow; ctx.fillRect(0,0,1280,720);
  }
  ctx.filter = "none"; cached = canvas; return canvas;
}
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

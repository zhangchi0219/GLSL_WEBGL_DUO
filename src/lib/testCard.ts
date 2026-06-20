// Built-in test card so every filter is visible immediately without an upload.
// Gradient + color bars + circles + hi-freq diagonals + text → exercises all filters.
export function makeTestCard(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 720;
  const x = c.getContext("2d")!;

  const g = x.createLinearGradient(0, 0, 1280, 720);
  g.addColorStop(0, "#1b2a4a");
  g.addColorStop(0.5, "#b8423a");
  g.addColorStop(1, "#e7c14b");
  x.fillStyle = g;
  x.fillRect(0, 0, 1280, 720);

  const bars = ["#ffffff", "#ffe400", "#00e5e5", "#00d000", "#ff00ff", "#ff2a2a", "#1a1aff", "#000000"];
  bars.forEach((col, i) => {
    x.fillStyle = col;
    x.fillRect(i * 160, 0, 160, 160);
  });

  for (let i = 0; i < 7; i++) {
    x.beginPath();
    x.arc(180 + i * 150, 420, 40 + i * 6, 0, Math.PI * 2);
    x.fillStyle = `hsl(${i * 45}, 80%, 60%)`;
    x.fill();
  }

  x.strokeStyle = "rgba(255,255,255,0.7)";
  x.lineWidth = 2;
  for (let i = -720; i < 1280; i += 14) {
    x.beginPath();
    x.moveTo(i, 560);
    x.lineTo(i + 160, 720);
    x.stroke();
  }

  x.fillStyle = "#0a0a0a";
  x.font = "bold 150px system-ui, sans-serif";
  x.fillText("GLSL", 700, 430);
  x.fillStyle = "#f3f0e9";
  x.font = "bold 60px system-ui, sans-serif";
  x.fillText("FILTER LAB", 700, 510);

  return c;
}

// Trigger a client-side file download (used by the "Download for TouchDesigner" button).
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

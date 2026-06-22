// Shared pointer state, consumed by both the filter renderer (position only) and
// the sim renderer (position + velocity + pressed, for splats/drops).
export interface Pointer {
  pos: [number, number];  // 0–1, y-up (matches uMouse / TD vUV)
  vel: [number, number];  // last move delta in uv units
  down: boolean;
}

export function makePointer(): Pointer {
  return { pos: [0.5, 0.5], vel: [0, 0], down: false };
}

// Attach to the canvas element's pointer events (NOT the stage wrapper — the
// canvas is letterboxed inside the stage, so its rect is the right uv basis).
// Returns React-friendly handlers.
export function pointerHandlers(p: Pointer) {
  const update = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = 1 - (e.clientY - r.top) / r.height;
    p.vel = [x - p.pos[0], y - p.pos[1]];
    p.pos = [x, y];
  };
  return {
    onPointerMove: update,
    onPointerDown: (e: React.PointerEvent) => {
      // capture so a drag keeps reporting (relative to the canvas) even after
      // the pointer crosses the letterbox bars or leaves the canvas
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      p.down = true;
      update(e);
      p.vel = [0, 0];
    },
    onPointerUp: () => { p.down = false; },
    onPointerLeave: () => { p.down = false; },
  };
}

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

// Attach to a canvas element's pointer events. Returns React-friendly handlers.
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
    onPointerDown: (e: React.PointerEvent) => { p.down = true; update(e); p.vel = [0, 0]; },
    onPointerUp: () => { p.down = false; },
    onPointerLeave: () => { p.down = false; },
  };
}

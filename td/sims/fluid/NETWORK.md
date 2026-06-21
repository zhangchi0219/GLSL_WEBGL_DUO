# 2D Fluid (Stable) — TouchDesigner network

Drag to inject dye and velocity into an incompressible 2D fluid (Stam stable-fluids: advection + vorticity + Jacobi pressure solve). Heavy — runs at half resolution.

A stateful simulation is a small **network**, not one TOP. Each buffer below lives
in a **Feedback TOP** loop; a GLSL TOP (one per kernel) reads the feedback via its
`self` input and writes the next state. Use **RGBA 16-bit float** on every TOP.

## Buffers (Feedback TOP loops)
- `vel` — 2ch, 50% res, **RGBA 16-bit float**, inside a Feedback TOP loop.
- `dye` — 4ch, 50% res, **RGBA 16-bit float**, inside a Feedback TOP loop.
- `pressure` — 1ch, 50% res, **RGBA 16-bit float**, inside a Feedback TOP loop.
- `divergence` — 1ch, 50% res, **RGBA 16-bit float**, inside a Feedback TOP loop.
- `curl` — 1ch, 50% res, **RGBA 16-bit float**, inside a Feedback TOP loop.

## Per-frame pass order
1. **splatVel** → `vel`  (inputs: vel(fb))  — `splatVel.glsl`
2. **splatDye** → `dye`  (inputs: dye(fb))  — `splatDye.glsl`
3. **curl** → `curl`  (inputs: vel)  — `curl.glsl`
4. **vorticity** → `vel`  (inputs: vel, curl)  — `vorticity.glsl`
5. **divergence** → `divergence`  (inputs: vel)  — `divergence.glsl`
6. **pressureDecay** → `pressure`  (inputs: pressure(fb))  — `pressureDecay.glsl`
7. **pressure** ×25 → `pressure`  (inputs: pressure(fb), divergence)  — `pressure.glsl`
8. **gradientSubtract** → `vel`  (inputs: vel, pressure)  — `gradientSubtract.glsl`
9. **advectVel** → `vel`  (inputs: vel(fb))  — `advectVel.glsl`
10. **advectDye** → `dye`  (inputs: vel, dye(fb))  — `advectDye.glsl`

Then the **display** kernel (`display.glsl`) reads `dye, source`
and outputs to screen.

## Shared uniforms on every GLSL TOP
Vectors page / CHOP exports:
```
  uTime       float  absTime.seconds
  uDt         float  1.0/me.time.rate     (or a Constant CHOP)
  uFrame      float  absTime.frame
  uMouse      vec2   Mouse In CHOP (tx,ty), normalized 0-1, y-up
  uMouseVel   vec2   Mouse In CHOP slope (use a Slope CHOP on tx,ty)
  uMouseDown  float  Mouse In CHOP left button
  uForce  float  1.0  (Force)
  uRadius  float  0.035  (Splat Radius)
  uDyeAmount  float  1.0  (Dye Amount)
  uVorticity  float  8.0  (Vorticity)
  uVelDiss  float  0.992  (Velocity Dissipation)
  uDyeDiss  float  0.985  (Dye Dissipation)
  uPressureDecay  float  0.8  (Pressure Retention)
  uColorShift  float  0.0  (Color Shift)
  uSourceMix  float  0.0  (Image Mix)
```
`uResolution`/`uTexel` are #defined from the TOP's own output info — set each
GLSL TOP's resolution to its buffer's resolution.

## Wiring sketch
- For each buffer B: GLSL TOP `<pass>` → Feedback TOP `B_fb` → back into the
  GLSL TOP's `self` input. Order the per-frame passes as listed (a chain of GLSL
  TOPs sharing the feedback buffers).
- The **pressure** kernel runs 25× — loop its Feedback TOP that many cooks, or chain that many copies.
- Note: matching the browser exactly is fiddly; this reproduces the same kernels.
  For production fluid in TD, also consider native nodes, but these kernels are
  the faithful port of the web version.

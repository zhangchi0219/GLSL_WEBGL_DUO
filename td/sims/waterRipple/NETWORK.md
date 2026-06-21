# Raindrop Ripples — TouchDesigner network

Height-field water with ambient random raindrops (plus click/drag). Refracts the source image through the surface.

A stateful simulation is a small **network**, not one TOP. Each buffer below lives
in a **Feedback TOP** loop; a GLSL TOP (one per kernel) reads the feedback via its
`self` input and writes the next state. Use **RGBA 16-bit float** on every TOP.

## Buffers (Feedback TOP loops)
- `h` — 2ch, 100% res, **RGBA 16-bit float**, inside a Feedback TOP loop.

## Per-frame pass order
1. **propagate** → `h`  (inputs: h(fb))  — `propagate.glsl`
2. **splat** → `h`  (inputs: h(fb))  — `splat.glsl`

Then the **display** kernel (`display.glsl`) reads `h, source`
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
  uDamping  float  0.985  (Damping)
  uDropRadius  float  0.025  (Drop Radius)
  uRainRate  float  0.3  (Rain Rate)
  uPointerForce  float  0.6  (Pointer Force)
  uRefraction  float  0.25  (Refraction)
  uSpecular  float  0.5  (Specular)
```
`uResolution`/`uTexel` are #defined from the TOP's own output info — set each
GLSL TOP's resolution to its buffer's resolution.

## Wiring sketch
- For each buffer B: GLSL TOP `<pass>` → Feedback TOP `B_fb` → back into the
  GLSL TOP's `self` input. Order the per-frame passes as listed (a chain of GLSL
  TOPs sharing the feedback buffers).
- The **pressure** kernel runs 1× — loop its Feedback TOP that many cooks, or chain that many copies.
- Note: matching the browser exactly is fiddly; this reproduces the same kernels.
  For production fluid in TD, also consider native nodes, but these kernels are
  the faithful port of the web version.

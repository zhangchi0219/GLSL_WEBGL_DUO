# Sheer Veil — TouchDesigner network

A floating sheer fabric blown by wind, composited over the image. Drag to grab and deform the cloth; see-through, with edges and folds reading more opaque.

A stateful simulation is a small **network**, not one TOP. Each buffer below lives
in a **Feedback TOP** loop; a GLSL TOP (one per kernel) reads the feedback via its
`self` input and writes the next state. Use **RGBA 16-bit float** on every TOP.

## Buffers (Feedback TOP loops)
- `pos` — 4ch, 100% res, **RGBA 16-bit float**, inside a Feedback TOP loop.
- `vel` — 4ch, 100% res, **RGBA 16-bit float**, inside a Feedback TOP loop.

## Per-frame pass order
1. **forces** → `vel`  (inputs: vel(fb), pos)  — `forces.glsl`
2. **integrate** → `pos`  (inputs: pos(fb), vel)  — `integrate.glsl`

Then the **display** kernel (`display.glsl`) reads `pos, source`
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
  uStiffness  float  16.0  (Stiffness)
  uTether  float  6.0  (Anchor)
  uDamping  float  0.96  (Damping)
  uGravity  float  0.0  (Gravity)
  uWind  float  0.8  (Wind)
  uPinTop  float  0  (Pin Top Edge)
  uGrabRadius  float  0.12  (Grab Radius)
  uPointerForce  float  1.2  (Grab Force)
  uRefraction  float  0.08  (Refraction)
  uNormalScale  float  8.0  (Wrinkle Sharpness)
  uBaseOpacity  float  0.25  (Base Opacity)
  uFresnelPow  float  2.5  (Fresnel Power)
  uSheen  float  0.4  (Sheen)
  uTint  vec3  0.85 0.88 0.95  (Fabric Tint)
```
`uResolution`/`uTexel` are #defined from the TOP's own output info — set each
GLSL TOP's resolution to its buffer's resolution.

## Wiring sketch
- For each buffer B: GLSL TOP `<pass>` → Feedback TOP `B_fb` → back into the
  GLSL TOP's `self` input. Order the per-frame passes as listed (a chain of GLSL
  TOPs sharing the feedback buffers).
- Note: matching the browser exactly is fiddly; this reproduces the same kernels.
  For production fluid in TD, also consider native nodes, but these kernels are
  the faithful port of the web version.

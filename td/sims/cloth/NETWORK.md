# Sheer Veil — TouchDesigner network

A single sheer fabric panel floating in the center, blown by wind over the image. Drag to grab and deform it; see-through, with edges and folds reading more opaque. Move/resize it with Cloth Center / Cloth Size.

Export ID: `cloth`. Custom values below match the exported browser controls.
Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target. No POP/compute-only API is used; the same pixel shader interface is used in 2023 and 2025 branches. This API target is not a claim of native runtime testing on every build.
Use **GLSL Multi TOP** for passes with four inputs; **GLSL TOP** for zero to three inputs. The operator type is stated beside every pass below. Connect your source image as `source_image`.
Set each kernel TOP's output resolution explicitly to its buffer resolution; set the display TOP to the full preview resolution. Use each buffer's floating-point format and sampling mode below; disable mipmapping. Do not scale fixed data textures with the display. Match the browser's displayed render size when comparing pixel-dependent effects.

## Operator names
Create a Base COMP named `base_cloth` and put this network inside it. Display labels/registry IDs and filenames remain unchanged; OP names use ASCII snake_case and distinct TOP/DAT/Feedback prefixes. If that Base COMP already exists, create a separate component with a unique suffix.

| Pass | Operator | TOP name | Pixel Shader DAT | File |
| --- | --- | --- | --- | --- |
| seedPos | GLSL TOP | `glsl_seed_pos` | `shader_seed_pos` | `seedPos.glsl` |
| seedVel | GLSL TOP | `glsl_seed_vel` | `shader_seed_vel` | `seedVel.glsl` |
| forces | GLSL TOP | `glsl_forces` | `shader_forces` | `forces.glsl` |
| integrate | GLSL TOP | `glsl_integrate` | `shader_integrate` | `integrate.glsl` |
| display | GLSL TOP | `glsl_display` | `shader_display` | `display.glsl` |

## Sampling and color settings
- On **every shader TOP**, set GLSL Version = 4.60 (`glsl460`), Mode = Vertex/Pixel (`vertexpixel`), and Input Extend Mode UV = Hold (`inputextenduv = hold`) to match CLAMP_TO_EDGE.
- Fixed-size buffers: set Output Resolution = Custom, the exact width/height below, and **Use Global Res Multiplier = Off** (`resmult = 0`). Otherwise data texture indices and sorting lengths can break.
- Configure **Input Smoothness** (`inputfiltertype`) on the consuming shader TOP. **Viewer Smoothness** (`filtertype`) only changes the viewer, not shader sampling. Use nearest for passes sampling data-only inputs; use linear for continuous image/field sampling. Integer lookups use `texelFetch` and bypass interpolation, including mixed data/field passes. DLA aggregate display uses nearest; the other displays use linear. Do not enable mipmaps.
- Store simulation state as the specified linear float format (`rgba16float` or `rgba32float`), never sRGB/8-bit. On builds with color management, set Working Color Space = Passthrough for raw-RGB comparison; configure custom color uniforms on **Vectors**, not the color-managed Colors page. The final display can use RGBA 8-bit fixed (`rgba8fixed`).

## Buffers
- `pos`: 4 channels, 100% of the preview resolution, RGBA 16-bit float, linear sampling. Feedback TOP required: `feedback_pos`; initialization input = `glsl_seed_pos`; Target TOP = final `glsl_integrate` output.
- `vel`: 4 channels, 100% of the preview resolution, RGBA 16-bit float, linear sampling. Feedback TOP required: `feedback_vel`; initialization input = `glsl_seed_vel`; Target TOP = final `glsl_forces` output.

## Initialization (once on load, resize or reset)
1. **seedPos**: `glsl_seed_pos` seeds `pos` with `seedPos.glsl`; inputs: none.
2. **seedVel**: `glsl_seed_vel` seeds `vel` with `seedVel.glsl`; inputs: none.

For buffers marked as feedback, connect the seed TOP to the Feedback TOP input. Enable Reset while initializing, then release Reset. Read-only initialized buffers (for example L-system structure) connect directly from their initialization shader; they do not need a Feedback TOP. For buffers without an explicit seed, use a zero-valued Constant TOP of the same size and floating-point format. Reset again after resizing or changing kernels.


## Per-frame pass order and exact input connections
1. **forces**: `glsl_forces` (GLSL TOP) → `vel`; Input 0 = feedback_vel (previous frame); Input 1 = feedback_pos (previous frame); Num Passes = 1. Kernel: `forces.glsl`.
2. **integrate**: `glsl_integrate` (GLSL TOP) → `pos`; Input 0 = feedback_pos (previous frame); Input 1 = glsl_forces; Num Passes = 1. Kernel: `integrate.glsl`.

Then **display**: `glsl_display` (GLSL TOP, `display.glsl`) uses Input 0 = glsl_integrate; Input 1 = source_image and outputs to screen.

## Feedback and iterations
For each buffer marked as feedback, set the Feedback TOP's **Target TOP** to the final writer listed above. Its output supplies previous-frame state to the first reader; later readers in the same frame use the latest writer's output from the connections table. Do not wire every `self` input directly to the same Feedback TOP: a buffer may be written several times in one frame.
Keep any final writer that is not an ancestor of display cooking every frame.

A kernel with Num Passes > 1 uses the GLSL TOP Common page **Passes** parameter. Its first input must be `self`; TouchDesigner replaces Input 0 with the previous pass result for subsequent passes, while the other inputs remain fixed. This is same-frame iteration, not repeated frame feedback. Shared `uIteration` maps to `float(uTDPass)`, starting at zero for each kernel. Sorting and prefix-sum passes depend on this index.

## Shared uniforms
Vectors / CHOP exports (only active uniforms need a value):
```
  uTime       float  absTime.seconds
  uDt         float  1.0/me.time.rate
  uFrame      float  absTime.frame
  uCanvasResolution vec2  display TOP width and height (also on fixed-size data passes)
  uMouse      vec2   normalized 0–1, y-up
  uMouseVel   vec2   UV displacement per input update, decays by 0.85 each browser frame
  uMouseDown  float  left button 0 or 1
  uClothCenter  vec2  0.5 0.5  (Cloth Center)
  uClothSize  vec2  0.22 0.3  (Cloth Size)
  uStiffness  float  16.0  (Stiffness)
  uTether  float  3.0  (Anchor)
  uDamping  float  0.96  (Damping)
  uGravity  float  0.0  (Gravity)
  uWind  float  1.0  (Wind)
  uPinTop  float  0  (Pin Top Edge)
  uGrabRadius  float  0.12  (Grab Radius)
  uPointerForce  float  1.2  (Grab Force)
  uRefraction  float  0.08  (Refraction)
  uNormalScale  float  8.0  (Wrinkle Sharpness)
  uBaseOpacity  float  0.5  (Base Opacity)
  uFresnelPow  float  2.5  (Fresnel Power)
  uSheen  float  0.4  (Sheen)
  uTint  vec3  0.85 0.88 0.95  (Fabric Tint)
```
`uResolution` / `uTexel` come from each TOP's own output info.
A Mouse In CHOP can drive position/button. A Slope CHOP produces velocity per second: multiply by dt to approximate UV displacement, and add decay if you want to match the browser's input response. The browser clamps simulation dt to 1/30 second for stability.

The shared pass cores match the browser exactly; frame timing, input sampling and Feedback scheduling must also be configured to compare motion.


References: [Feedback TOP](https://derivative.ca/UserGuide/Feedback_TOP), [GLSL TOP](https://derivative.ca/UserGuide/GLSL_TOP), [GLSL Multi TOP](https://derivative.ca/UserGuide/GLSL_Multi_TOP), [Write a GLSL TOP](https://derivative.ca/UserGuide/Write_a_GLSL_TOP), [2022 Vulkan baseline](https://derivative.ca/release/202224200/66252).

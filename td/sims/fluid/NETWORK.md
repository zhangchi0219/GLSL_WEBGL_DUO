# 2D Fluid (Stable) — TouchDesigner network

Drag to inject dye and velocity into an incompressible 2D fluid (Stam stable-fluids: advection + vorticity + Jacobi pressure solve). Heavy — runs at half resolution.

Export ID: `fluid`. Custom values below match the exported browser controls.
Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target. No POP/compute-only API is used; the same pixel shader interface is used in 2023 and 2025 branches. This API target is not a claim of native runtime testing on every build.
Use **GLSL Multi TOP** for passes with four inputs; **GLSL TOP** for zero to three inputs. The operator type is stated beside every pass below. Connect your source image as `source_image`.
Set each kernel TOP's output resolution explicitly to its buffer resolution; set the display TOP to the full preview resolution. Use each buffer's floating-point format and sampling mode below; disable mipmapping. Do not scale fixed data textures with the display. Match the browser's displayed render size when comparing pixel-dependent effects.

## Operator names
Create a Base COMP named `base_fluid` and put this network inside it. Display labels/registry IDs and filenames remain unchanged; OP names use ASCII snake_case and distinct TOP/DAT/Feedback prefixes. If that Base COMP already exists, create a separate component with a unique suffix.

| Pass | Operator | TOP name | Pixel Shader DAT | File |
| --- | --- | --- | --- | --- |
| clearVel | GLSL TOP | `glsl_clear_vel` | `shader_clear_vel` | `clearVel.glsl` |
| clearDye | GLSL TOP | `glsl_clear_dye` | `shader_clear_dye` | `clearDye.glsl` |
| clearPressure | GLSL TOP | `glsl_clear_pressure` | `shader_clear_pressure` | `clearPressure.glsl` |
| splatVel | GLSL TOP | `glsl_splat_vel` | `shader_splat_vel` | `splatVel.glsl` |
| splatDye | GLSL TOP | `glsl_splat_dye` | `shader_splat_dye` | `splatDye.glsl` |
| curl | GLSL TOP | `glsl_curl` | `shader_curl` | `curl.glsl` |
| vorticity | GLSL TOP | `glsl_vorticity` | `shader_vorticity` | `vorticity.glsl` |
| divergence | GLSL TOP | `glsl_divergence` | `shader_divergence` | `divergence.glsl` |
| pressureDecay | GLSL TOP | `glsl_pressure_decay` | `shader_pressure_decay` | `pressureDecay.glsl` |
| pressure | GLSL TOP | `glsl_pressure` | `shader_pressure` | `pressure.glsl` |
| gradientSubtract | GLSL TOP | `glsl_gradient_subtract` | `shader_gradient_subtract` | `gradientSubtract.glsl` |
| advectVel | GLSL TOP | `glsl_advect_vel` | `shader_advect_vel` | `advectVel.glsl` |
| advectDye | GLSL TOP | `glsl_advect_dye` | `shader_advect_dye` | `advectDye.glsl` |
| display | GLSL TOP | `glsl_display` | `shader_display` | `display.glsl` |

## Sampling and color settings
- On **every shader TOP**, set GLSL Version = 4.60 (`glsl460`), Mode = Vertex/Pixel (`vertexpixel`), and Input Extend Mode UV = Hold (`inputextenduv = hold`) to match CLAMP_TO_EDGE.
- Fixed-size buffers: set Output Resolution = Custom, the exact width/height below, and **Use Global Res Multiplier = Off** (`resmult = 0`). Otherwise data texture indices and sorting lengths can break.
- Configure **Input Smoothness** (`inputfiltertype`) on the consuming shader TOP. **Viewer Smoothness** (`filtertype`) only changes the viewer, not shader sampling. Use nearest for passes sampling data-only inputs; use linear for continuous image/field sampling. Integer lookups use `texelFetch` and bypass interpolation, including mixed data/field passes. DLA aggregate display uses nearest; the other displays use linear. Do not enable mipmaps.
- Store simulation state as the specified linear float format (`rgba16float` or `rgba32float`), never sRGB/8-bit. On builds with color management, set Working Color Space = Passthrough for raw-RGB comparison; configure custom color uniforms on **Vectors**, not the color-managed Colors page. The final display can use RGBA 8-bit fixed (`rgba8fixed`).

## Buffers
- `vel`: 2 channels, 50% of the preview resolution, RGBA 16-bit float, linear sampling. Feedback TOP required: `feedback_vel`; initialization input = `glsl_clear_vel`; Target TOP = final `glsl_advect_vel` output.
- `dye`: 4 channels, 50% of the preview resolution, RGBA 16-bit float, linear sampling. Feedback TOP required: `feedback_dye`; initialization input = `glsl_clear_dye`; Target TOP = final `glsl_advect_dye` output.
- `pressure`: 1 channels, 50% of the preview resolution, RGBA 16-bit float, linear sampling. Feedback TOP required: `feedback_pressure`; initialization input = `glsl_clear_pressure`; Target TOP = final `glsl_pressure` output.
- `divergence`: 1 channels, 50% of the preview resolution, RGBA 16-bit float, linear sampling. Intermediate/read-only buffer; no cross-frame Feedback TOP required.
- `curl`: 1 channels, 50% of the preview resolution, RGBA 16-bit float, linear sampling. Intermediate/read-only buffer; no cross-frame Feedback TOP required.

## Initialization (once on load, resize or reset)
1. **clearVel**: `glsl_clear_vel` seeds `vel` with `clearVel.glsl`; inputs: none.
2. **clearDye**: `glsl_clear_dye` seeds `dye` with `clearDye.glsl`; inputs: none.
3. **clearPressure**: `glsl_clear_pressure` seeds `pressure` with `clearPressure.glsl`; inputs: none.

For buffers marked as feedback, connect the seed TOP to the Feedback TOP input. Enable Reset while initializing, then release Reset. Read-only initialized buffers (for example L-system structure) connect directly from their initialization shader; they do not need a Feedback TOP. For buffers without an explicit seed, use a zero-valued Constant TOP of the same size and floating-point format. Reset again after resizing or changing kernels.


## Per-frame pass order and exact input connections
1. **splatVel**: `glsl_splat_vel` (GLSL TOP) → `vel`; Input 0 = feedback_vel (previous frame); Num Passes = 1. Kernel: `splatVel.glsl`.
2. **splatDye**: `glsl_splat_dye` (GLSL TOP) → `dye`; Input 0 = feedback_dye (previous frame); Num Passes = 1. Kernel: `splatDye.glsl`.
3. **curl**: `glsl_curl` (GLSL TOP) → `curl`; Input 0 = glsl_splat_vel; Num Passes = 1. Kernel: `curl.glsl`.
4. **vorticity**: `glsl_vorticity` (GLSL TOP) → `vel`; Input 0 = glsl_splat_vel; Input 1 = glsl_curl; Num Passes = 1. Kernel: `vorticity.glsl`.
5. **divergence**: `glsl_divergence` (GLSL TOP) → `divergence`; Input 0 = glsl_vorticity; Num Passes = 1. Kernel: `divergence.glsl`.
6. **pressureDecay**: `glsl_pressure_decay` (GLSL TOP) → `pressure`; Input 0 = feedback_pressure (previous frame); Num Passes = 1. Kernel: `pressureDecay.glsl`.
7. **pressure**: `glsl_pressure` (GLSL TOP) → `pressure`; Input 0 = glsl_pressure_decay; Input 1 = glsl_divergence; Num Passes = 25. Kernel: `pressure.glsl`.
8. **gradientSubtract**: `glsl_gradient_subtract` (GLSL TOP) → `vel`; Input 0 = glsl_vorticity; Input 1 = glsl_pressure; Num Passes = 1. Kernel: `gradientSubtract.glsl`.
9. **advectVel**: `glsl_advect_vel` (GLSL TOP) → `vel`; Input 0 = glsl_gradient_subtract; Num Passes = 1. Kernel: `advectVel.glsl`.
10. **advectDye**: `glsl_advect_dye` (GLSL TOP) → `dye`; Input 0 = glsl_advect_vel; Input 1 = glsl_splat_dye; Num Passes = 1. Kernel: `advectDye.glsl`.

Then **display**: `glsl_display` (GLSL TOP, `display.glsl`) uses Input 0 = glsl_advect_dye; Input 1 = source_image and outputs to screen.

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
`uResolution` / `uTexel` come from each TOP's own output info.
A Mouse In CHOP can drive position/button. A Slope CHOP produces velocity per second: multiply by dt to approximate UV displacement, and add decay if you want to match the browser's input response. The browser clamps simulation dt to 1/30 second for stability.

The shared pass cores match the browser exactly; frame timing, input sampling and Feedback scheduling must also be configured to compare motion.


References: [Feedback TOP](https://derivative.ca/UserGuide/Feedback_TOP), [GLSL TOP](https://derivative.ca/UserGuide/GLSL_TOP), [GLSL Multi TOP](https://derivative.ca/UserGuide/GLSL_Multi_TOP), [Write a GLSL TOP](https://derivative.ca/UserGuide/Write_a_GLSL_TOP), [2022 Vulkan baseline](https://derivative.ca/release/202224200/66252).

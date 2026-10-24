# Noise — TouchDesigner network

平滑分形噪声的 curl 驱动旋涡轨迹。调整噪声尺度、强度和演变速度；拖动注入示踪颜色和局部扰动。

Export ID: `example-noise`. Custom values below match the exported browser controls.
Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel. TD 2021 and earlier are outside this export target. No POP/compute-only API is used; the same pixel shader interface is used in 2023 and 2025 branches. This API target is not a claim of native runtime testing on every build.
Use **GLSL Multi TOP** for passes with four inputs; **GLSL TOP** for zero to three inputs. The operator type is stated beside every pass below. No source TOP required.
Set each kernel TOP's output resolution explicitly to its buffer resolution; set the display TOP to the full preview resolution. Use each buffer's floating-point format and sampling mode below; disable mipmapping. Do not scale fixed data textures with the display. Match the browser's displayed render size when comparing pixel-dependent effects.

## Operator names
Create a Base COMP named `base_example_noise` and put this network inside it. Display labels/registry IDs and filenames remain unchanged; OP names use ASCII snake_case and distinct TOP/DAT/Feedback prefixes. If that Base COMP already exists, create a separate component with a unique suffix.

| Pass | Operator | TOP name | Pixel Shader DAT | File |
| --- | --- | --- | --- | --- |
| seedTrail | GLSL TOP | `glsl_seed_trail` | `shader_seed_trail` | `seedTrail.glsl` |
| field | GLSL TOP | `glsl_field` | `shader_field` | `field.glsl` |
| advect | GLSL TOP | `glsl_advect` | `shader_advect` | `advect.glsl` |
| display | GLSL TOP | `glsl_display` | `shader_display` | `display.glsl` |

## Sampling and color settings
- On **every shader TOP**, set GLSL Version = 4.60 (`glsl460`), Mode = Vertex/Pixel (`vertexpixel`), and Input Extend Mode UV = Hold (`inputextenduv = hold`) to match CLAMP_TO_EDGE.
- Fixed-size buffers: set Output Resolution = Custom, the exact width/height below, and **Use Global Res Multiplier = Off** (`resmult = 0`). Otherwise data texture indices and sorting lengths can break.
- Configure **Input Smoothness** (`inputfiltertype`) on the consuming shader TOP. **Viewer Smoothness** (`filtertype`) only changes the viewer, not shader sampling. Use nearest for passes sampling data-only inputs; use linear for continuous image/field sampling. Integer lookups use `texelFetch` and bypass interpolation, including mixed data/field passes. DLA aggregate display uses nearest; the other displays use linear. Do not enable mipmaps.
- Store simulation state as the specified linear float format (`rgba16float` or `rgba32float`), never sRGB/8-bit. On builds with color management, set Working Color Space = Passthrough for raw-RGB comparison; configure custom color uniforms on **Vectors**, not the color-managed Colors page. The final display can use RGBA 8-bit fixed (`rgba8fixed`).

## Buffers
- `vel`: 2 channels, 50% of the preview resolution, RGBA 16-bit float, linear sampling. Intermediate/read-only buffer; no cross-frame Feedback TOP required.
- `trail`: 4 channels, 50% of the preview resolution, RGBA 16-bit float, linear sampling. Feedback TOP required: `feedback_trail`; initialization input = `glsl_seed_trail`; Target TOP = final `glsl_advect` output.

## Initialization (once on load, resize or reset)
1. **seedTrail**: `glsl_seed_trail` seeds `trail` with `seedTrail.glsl`; inputs: none.

For buffers marked as feedback, connect the seed TOP to the Feedback TOP input. Enable Reset while initializing, then release Reset. Read-only initialized buffers (for example L-system structure) connect directly from their initialization shader; they do not need a Feedback TOP. For buffers without an explicit seed, use a zero-valued Constant TOP of the same size and floating-point format. Reset again after resizing or changing kernels.


## Per-frame pass order and exact input connections
1. **field**: `glsl_field` (GLSL TOP) → `vel`; no inputs; Num Passes = 1. Kernel: `field.glsl`.
2. **advect**: `glsl_advect` (GLSL TOP) → `trail`; Input 0 = feedback_trail (previous frame); Input 1 = glsl_field; Num Passes = 1. Kernel: `advect.glsl`.

Then **display**: `glsl_display` (GLSL TOP, `display.glsl`) uses Input 0 = glsl_advect; Input 1 = glsl_field and outputs to screen.

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
  uNoiseScale  float  3.5  (噪声尺度)
  uStrength  float  1.2  (噪声强度)
  uEvolution  float  0.7  (演变速度)
  uDecay  float  1.2  (拖尾衰减)
  uShowArrows  float  1  (方向箭头)
```
`uResolution` / `uTexel` come from each TOP's own output info.
A Mouse In CHOP can drive position/button. A Slope CHOP produces velocity per second: multiply by dt to approximate UV displacement, and add decay if you want to match the browser's input response. The browser clamps simulation dt to 1/30 second for stability.

The shared pass cores match the browser exactly; frame timing, input sampling and Feedback scheduling must also be configured to compare motion.

No source TOP required. vel is an intermediate field; trail uses cross-frame feedback. Use the same frame time in WebGL and TD.


References: [Feedback TOP](https://derivative.ca/UserGuide/Feedback_TOP), [GLSL TOP](https://derivative.ca/UserGuide/GLSL_TOP), [GLSL Multi TOP](https://derivative.ca/UserGuide/GLSL_Multi_TOP), [Write a GLSL TOP](https://derivative.ca/UserGuide/Write_a_GLSL_TOP), [2022 Vulkan baseline](https://derivative.ca/release/202224200/66252).

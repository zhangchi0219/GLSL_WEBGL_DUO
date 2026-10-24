# Verification — 2026-10-25: TD compatibility and naming audit

- API target is now explicit: TouchDesigner 2022.24200+ Vulkan branches, GLSL 4.60, Vertex/Pixel. The local installation directory is TouchDesigner.2025.31310, an Experimental build; its existence is not treated as proof that the exports ran natively.
- Fixed a real network compatibility issue: ordinary GLSL TOP has three wired inputs. Space Colonization `propose`, Physarum `deposit`, and DLA `aggregate` are now explicitly documented as GLSL Multi TOP operators in headers, operator tables and per-frame wiring. Their shared shader cores did not change.
- Generated node mappings use unique ASCII snake_case names and separate `base_`, `glsl_` / `glslmulti_`, `shader_`, `feedback_` and `constant_` prefixes. Registry IDs, public uniform names and existing filenames remain stable. Normalization collisions get deterministic numeric suffixes. Export rejects case-insensitive Windows filename collisions and invalid Pass filename stems. Parameter validation reserves TD built-in `uTD*` names.
- Documented sampling/format settings: Hold for CLAMP_TO_EDGE, Input Smoothness versus Viewer Smoothness, no global resolution multiplier on fixed buffers, RGBA16F/RGBA32F state storage, no mipmaps, and raw RGB/Passthrough on builds with color management.
- Independently compiled all **148 generated GLSL files** to Vulkan SPIR-V with glslang (`@webgpu/glslang@0.0.15`): **148 passed, 0 failed**. For this check, TD texture/output/pass built-ins are stubbed and standalone uniform declarations are packed into an anonymous uniform block. Shader computations are unchanged. This validates desktop GLSL 4.60 syntax/type compatibility, not TouchDesigner's runtime, injected header implementation or Feedback scheduling.
- The temporary compiler and compilation harness are isolated under ignored `artifacts/`; project dependencies were not changed. Detailed results: `artifacts/td-compat/compilation.json`.
- TypeScript, production build, **10 unit/data tests**, TD generation, and **4 targeted browser tests** covering custom parameters, multi-pass exports, Organic Growth ZIP downloads and code examples all passed. `git diff --check` passed.
- References checked: [GLSL TOP](https://derivative.ca/UserGuide/GLSL_TOP), [GLSL Multi TOP](https://derivative.ca/UserGuide/GLSL_Multi_TOP), [Write a GLSL TOP](https://derivative.ca/UserGuide/Write_a_GLSL_TOP), [2022 Vulkan/GLSL 4.60 baseline](https://derivative.ca/release/202224200/66252), [2025.31310 Experimental](https://derivative.ca/release/experimental-202531310/72993).
- Native TouchDesigner execution remains unverified. Prior browser/GPU verification is retained below.

---

# Verification — 2026-10-25: Organic Growth

- Added six source-free GPU simulations in the separate Organic Growth group: Space Colonization, L-system, Reaction–Diffusion, Physarum, DLA and Phyllotaxis. Total: 37 presets (22 filters, 15 simulations).
- TypeScript and production build passed. No dependencies were added for this change.
- Unit/data tests: 9 passed, including all 37 parameter schemas, six complete TD networks, fixed buffer formats, iteration mapping, immutable L-system structure wiring, all 15 simulation ZIP round trips, and existing import/diagnostic behavior.
- Full Playwright regression: 12 passed. All 37 presets compiled on Chromium/SwiftShader; existing editing, atomic compilation, context recovery, source import, export, persistence and responsive layout checks passed. After the final TD wiring correction, both Organic Growth browser tests passed again with additional input checks.
- New GPU checks: all six evolve visibly, keep finite state at maximum parameter settings, preserve state while paused and on display resize, replay identically from the same seed/time steps, and restart after seed changes. Space Colonization parent IDs precede children and attraction points are consumed. L-system emits the expected grammar segment count. Spatial indices remain sorted. Reaction–Diffusion retains a pattern after 240 frames with default parameters. DLA is monotone and new aggregate pixels touch the previous cluster. Phyllotaxis positions follow the Vogel radius. All GL error codes were zero.
- Parameter response checks use matching-time controls for all six. Pointer injection checks passed for Reaction–Diffusion, Physarum and DLA.
- Visual QA: inspected all six desktop workbench screenshots, six 240-frame pattern captures, and the 390px layout. Reaction–Diffusion defaults were adjusted to avoid early seed extinction. DLA launches replacement walkers just outside the current aggregate.
- TD generator passed: 22 filter exports, 15 simulation networks and gradient source; existing family aliases retained. New networks include exact shared cores, current values, RGBA32F/nearest state textures, fixed dimensions, uTDPass iteration mapping and precise feedback connections. L-system immutable structure connects directly from its grammar initializer.
- Native TouchDesigner compilation and runtime comparison were not performed. Export structure/core checks are separate from software-side verification.
- Screenshots, GPU assertions and browser reports are under `artifacts/verification/`. Previous verification is retained below.

---

# Verification — 2026-10-15

Validated on Windows with Chromium through Playwright.

- TypeScript: `tsc --noEmit` passed.
- Production build: `npm run build` passed. Editor is lazy-loaded in a separate chunk; fonts are local assets.
- Unit/data tests: 8 passed. Covers all 31 parameter schemas, the separate four-item Simulation Examples group, exact shared cores and TD values, source-free feedback wiring, all nine simulation project ZIP round trips, corrupt imports and diagnostic mapping.
- Browser tests: 10 passed. Covers all 31 preset GPU compilations and the previous authoring, layout, source-image, project/TD export, atomic compilation, context recovery, split sizing, history, copy and animated-gradient checks. New example checks cover search, pointer interaction, exact parameter values, edited-pass persistence, independent refresh recovery, current-value TD exports and mobile drawers.
- Simulation GPU checks: all four examples produce visible changing pixels, respond to pointer input and parameter changes against matching-time controls, and remain pixel-identical while paused. Zero wind/noise strength or gravity removes its driving force. The physics top row stays fixed while the remaining nodes fall; the wave obstacle contains no wave state. Float-buffer readback stays finite and within limits after 180-frame stress runs at maximum force/stiffness, low damping, and both landscape and portrait buffer sizes. All GL error codes are zero.
- Visual QA: inspected the four new example screenshots at 1440px and Boundary preview/parameters at 390px, alongside the workbench layout screenshots at 1920, 1440, 1024 and 390px. No document horizontal overflow; narrow layouts expose sidebars as drawers. Physics uses a logical material grid to keep its pinned edge continuous.
- Generator: 22 filter files, 9 distinct simulation networks and a standalone gradient source generated; existing family aliases retained. New networks are example-wind, example-noise, example-boundary and example-physics.
- Dependencies unchanged; the previous audit reported 0 vulnerabilities.
- `git diff --check`: passed. Git reports expected LF/CRLF conversion notices on Windows.

Screenshots and Playwright JSON report are in `artifacts/verification/` (ignored by Git). Local preview server: http://127.0.0.1:5173/.

## TouchDesigner boundary

TD exports contain the exact shared cores, current parameter values and initialization / per-pass wiring instructions. Documentation follows Derivative's GLSL TOP and Feedback TOP interfaces. TouchDesigner 2025.31310 was found in the standard installation directory; this session did not run the exported shaders or networks inside TD. Software-side compilation and frame-by-frame motion matching remain unverified.

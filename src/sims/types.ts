// Stateful, multi-pass simulation modules (water ripple, fluid). Unlike a
// FilterModule, a SimModule keeps ping-pong buffers and runs an ordered list of
// passes per frame, then a display pass. Pass cores keep the SAME entry as
// filters — renderMain(uv,res,time) reading INPUT0..N — so one wrapper convention
// covers both; sim cores just read extra uniforms (uDt, uTexel, uMouseVel,
// uMouseDown) and bind multiple inputs.

import type { FilterMeta, ParamDef } from "../filters/types";

export interface SimBufferDef {
  name: string;
  components: 1 | 2 | 4; // stored as RGBA16F regardless; documents intent
  scale?: number;        // fraction of canvas resolution (default 1.0)
}

// Special input names: "source" = uploaded image, "self" = the out buffer's
// previous (ping-pong) state, otherwise another buffer's latest state.
export interface SimPassDef {
  name: string;
  core: string;          // GLSL, entry renderMain(uv,res,time)
  out: string;           // target buffer name, or "screen" for the display pass
  inputs: string[];      // bound to INPUT0, INPUT1, … in order
  iterations?: number;   // run this pass N times (e.g. pressure Jacobi)
}

export interface SimModule {
  meta: FilterMeta;
  params: ParamDef[];
  buffers: SimBufferDef[];
  init?: SimPassDef[];   // run once on (re)load to seed/clear buffers
  step: SimPassDef[];    // run in order every frame
  display: SimPassDef;   // writes to the screen
  needsSource?: boolean; // bind the uploaded image as the "source" input
}

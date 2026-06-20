// Generate td/<id>_td.glsl for every filter, wrapping the SAME core string the
// webapp compiles. Run with: npm run gen:td  (tsx executes TS directly).
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { wrapTD } from "../src/td/wrapper";
import type { FilterModule } from "../src/filters/types";

const here = dirname(fileURLToPath(import.meta.url));
const filtersDir = join(here, "..", "src", "filters");
const outDir = join(here, "..", "td");
mkdirSync(outDir, { recursive: true });

const skip = new Set(["types.ts", "registry.ts"]);
const files = readdirSync(filtersDir).filter((f) => f.endsWith(".ts") && !skip.has(f));

let n = 0;
for (const f of files) {
  const m = (await import(pathToFileURL(join(filtersDir, f)).href)) as Partial<FilterModule>;
  if (!m.meta || !m.core || !m.params) {
    console.warn(`skip ${f}: not a filter module`);
    continue;
  }
  const out = join(outDir, `${m.meta.id}_td.glsl`);
  writeFileSync(out, wrapTD({ meta: m.meta, params: m.params, core: m.core }));
  console.log(`wrote td/${m.meta.id}_td.glsl`);
  n++;
}
console.log(`\n${n} TouchDesigner files generated.`);

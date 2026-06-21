// Generate TouchDesigner exports for every module, wrapping the SAME core
// strings the web app compiles. Run with: npm run gen:td (tsx executes TS).
//   - filters → td/<id>_td.glsl (single drop-in GLSL TOP)
//   - sims    → td/sims/<id>/<pass>.glsl + NETWORK.md (a Feedback-TOP network)
import { readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { wrapTD, simTDFiles } from "../src/td/wrapper";
import type { FilterModule } from "../src/filters/types";
import type { SimModule } from "../src/sims/types";
import { registry } from "../src/filters/registry";

const here = dirname(fileURLToPath(import.meta.url));
const filtersDir = join(here, "..", "src", "filters");
const tdDir = join(here, "..", "td");
mkdirSync(tdDir, { recursive: true });

// --- filters: one .glsl per filter module file ---
const skip = new Set(["types.ts", "registry.ts"]);
const files = readdirSync(filtersDir).filter((fn) => fn.endsWith(".ts") && !skip.has(fn));
let nFilters = 0;
for (const fn of files) {
  const m = (await import(pathToFileURL(join(filtersDir, fn)).href)) as Partial<FilterModule>;
  if (!m.meta || !m.core || !m.params) continue;
  writeFileSync(join(tdDir, `${m.meta.id}_td.glsl`), wrapTD({ meta: m.meta, params: m.params, core: m.core }));
  console.log(`wrote td/${m.meta.id}_td.glsl`);
  nFilters++;
}

// --- sims: a folder of kernels + NETWORK.md per unique sim (by meta.id) ---
const simsRoot = join(tdDir, "sims");
rmSync(simsRoot, { recursive: true, force: true });
const doneSims = new Set<string>();
let nSims = 0;
for (const entry of registry) {
  if (entry.kind !== "sim") continue;
  const mod = (await entry.load()) as SimModule;
  if (doneSims.has(mod.meta.id)) continue;
  doneSims.add(mod.meta.id);
  const outDir = join(simsRoot, mod.meta.id);
  mkdirSync(outDir, { recursive: true });
  for (const file of simTDFiles(mod)) writeFileSync(join(outDir, file.name), file.text);
  console.log(`wrote td/sims/${mod.meta.id}/ (${simTDFiles(mod).length} files)`);
  nSims++;
}

console.log(`\n${nFilters} filter files + ${nSims} sim networks generated.`);

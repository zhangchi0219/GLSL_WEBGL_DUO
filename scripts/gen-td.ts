// Generate platform wrappers from the exact shared cores used by WebGL.
// Registry IDs keep simulation variants and their parameter defaults distinct.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../src/filters/registry";
import { isFilter } from "../src/workspace/model";
import { wrapTD, simTDFiles } from "../src/td/wrapper";
import { fluidGradientModule } from "../src/gl/fluidGradient";
const tdDir = join(dirname(fileURLToPath(import.meta.url)), "..", "td");
mkdirSync(tdDir, { recursive: true });
writeFileSync(join(tdDir, "gradient_source_td.glsl"), wrapTD(fluidGradientModule, { sourceRequired: false }));
const legacyAliases = new Set<string>();
let nFilters = 0, nSims = 0;
for (const entry of registry) {
  const module = await entry.load();
  if (isFilter(module)) {
    writeFileSync(join(tdDir, `${module.meta.id}_td.glsl`), wrapTD(module));
    nFilters++;
  } else {
    const outDir = join(tdDir, "sims", entry.id);
    mkdirSync(outDir, { recursive: true });
    for (const file of simTDFiles(module, { exportId: entry.id })) writeFileSync(join(outDir, file.name), file.text);
    // Retain old family paths for projects that already reference them.
    if (module.meta.id !== entry.id && !legacyAliases.has(module.meta.id)) {
      legacyAliases.add(module.meta.id);
      const alias = join(tdDir, "sims", module.meta.id);
      mkdirSync(alias, { recursive: true });
      for (const file of simTDFiles(module)) writeFileSync(join(alias, file.name), file.text);
    }
    nSims++;
  }
}
console.log(`${nFilters} filter files + ${nSims} distinct simulation networks + gradient source generated; existing family aliases retained.`);

import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8, unzipSync, strFromU8 } from "fflate";
import { registry, GROUP_ORDER } from "../src/filters/registry";
import { defaultState } from "../src/filters/types";
import { clone, makeProject, reconcileValues, validateParams, hasChanges, isFilter, passes } from "../src/workspace/model";
import { exportProject, importProject, exportTD } from "../src/workspace/files";
import { wrapTD, simTDFiles } from "../src/td/wrapper";
import { diagnosticsFromLog } from "../src/gl/program";
import { stepPrecision } from "../src/components/Controls";
import { tdIdentifier, tdNames, tdOperator } from "../src/td/naming";

test("all 37 presets have valid parameter defaults", async () => {
  assert.equal(registry.length, 37);
  assert.equal(new Set(registry.map((entry) => entry.id)).size, registry.length);
  for (const entry of registry) {
    const module = await entry.load();
    assert.equal(validateParams(module.params), null, entry.id);
  }
});

test("simulation examples form a separate group and export source-free feedback networks", async () => {
  assert.ok(GROUP_ORDER.indexOf("Simulation Examples") > GROUP_ORDER.indexOf("Simulation"));
  assert.equal(registry.filter((entry) => entry.group === "Simulation").length, 5);
  const examples = registry.filter((entry) => entry.group === "Simulation Examples");
  assert.deepEqual(examples.map((entry) => entry.name), ["Wind", "Noise", "Boundary", "Physics"]);
  for (const entry of examples) {
    const module = await entry.load();
    assert.ok(!isFilter(module));
    assert.equal(entry.kind, "sim");
    assert.equal(module.meta.id, entry.id);
    assert.equal(module.needsSource, false);
    const buffers = new Set(module.buffers.map((buffer) => buffer.name));
    assert.equal(new Set(passes(module).map((pass) => pass.name)).size, passes(module).length);
    for (const pass of passes(module)) {
      assert.ok(pass.out === "screen" || buffers.has(pass.out));
      for (const input of pass.inputs) assert.ok(input === "self" || buffers.has(input));
    }
    const files = simTDFiles(module, { exportId: entry.id });
    const network = files.find((file) => file.name === "NETWORK.md")!.text;
    assert.match(network, /No source TOP required/);
    assert.match(network, /Feedback TOP required/);
    assert.ok(network.includes(module.meta.tdNote!));
    for (const pass of passes(module)) assert.ok(files.find((file) => file.name === `${pass.name}.glsl`)!.text.includes(pass.core));
  }
});
test("organic growth exports fixed precision, iteration indices and all six editable networks", async () => {
  assert.equal(GROUP_ORDER.at(-1), "Organic Growth");
  const entries = registry.filter((entry) => entry.group === "Organic Growth");
  assert.equal(entries.length, 6);
  for (const entry of entries) {
    const mod = await entry.load(); assert.ok(!isFilter(mod));
    assert.equal(mod.needsSource, false);
    assert.equal(mod.meta.id, entry.id);
    assert.ok(mod.resetOnParams?.includes("uSeed"));
    const buffers = new Set(mod.buffers.map((b) => b.name));
    assert.equal(new Set(passes(mod).map((p) => p.name)).size, passes(mod).length);
    for (const pass of passes(mod)) {
      assert.ok(pass.inputs.length <= 4);
      assert.ok(pass.out === "screen" || buffers.has(pass.out));
      for (const input of pass.inputs) assert.ok(input === "self" || buffers.has(input));
      if ((pass.iterations ?? 1) > 1) assert.equal(pass.inputs[0], "self");
    }
    const files = simTDFiles(mod, { state: { ...defaultState(mod.params), uSeed: 73 } });
    const guide = files.find((f) => f.name === "NETWORK.md")!.text;
    assert.match(guide, /fixed 384 x 384/); assert.match(guide, /RGBA 32-bit float, nearest/);
    assert.match(guide, /uSeed\s+float\s+73\.0/); assert.match(guide, /uCanvasResolution/);
    if (entry.id === "organic-l-system") {
      assert.match(guide, /Input 0 = glsl_grammar; Input 1 = glsl_clock/);
      assert.doesNotMatch(guide, /structure_fb/);
    }
    for (const pass of passes(mod)) {
      const shader = files.find((f) => f.name === `${pass.name}.glsl`)!.text;
      assert.ok(shader.includes(pass.core)); assert.match(shader, /#define uIteration float\(uTDPass\)/);
    }
  }
  assert.match(validateParams([{ name: "uIteration", label: "reserved", type: "float", value: 0 }])!, /冲突/);
});
test("TD version target, operator types and names are explicit and collision-free", async () => {
  assert.equal(tdIdentifier("organic-space-colonization"), "organic_space_colonization");
  assert.equal(tdIdentifier("seedPos"), "seed_pos");
  assert.equal(tdIdentifier("42 / 叶脉"), "op_42");
  for (const entry of registry.filter((e) => e.kind === "sim")) {
    const mod = await entry.load(); assert.ok(!isFilter(mod));
    const names = tdNames(mod, entry.id), guide = simTDFiles(mod, { exportId: entry.id }).find((f) => f.name === "NETWORK.md")!.text;
    const all = [names.component, names.source, ...names.top.values(), ...names.dat.values(), ...names.feedback.values(), ...names.constant.values()];
    assert.equal(new Set(all).size, all.length);
    for (const name of all) assert.match(name, /^[a-z_][a-z0-9_]*$/);
    assert.match(guide, /2022\.24200\+ \(Vulkan\), GLSL 4\.60/);
    assert.match(guide, /Input Smoothness/); assert.match(guide, /resmult = 0/); assert.match(guide, /CLAMP_TO_EDGE/);
    for (const pass of passes(mod)) {
      assert.ok(guide.includes(names.top.get(pass.name)!));
      assert.equal(tdOperator(pass), pass.inputs.length > 3 ? "GLSL Multi TOP" : "GLSL TOP");
      if (pass.inputs.length > 3) {
        assert.ok(names.top.get(pass.name)!.startsWith("glslmulti_"));
        const shader = simTDFiles(mod).find((f) => f.name === `${pass.name}.glsl`)!.text;
        assert.match(shader, /GLSL Multi TOP kernel/); assert.match(shader, /ordinary GLSL TOP has only three wired inputs/);
      }
    }
  }
  const mod = await registry.find((e) => e.id === "organic-l-system")!.load(); assert.ok(!isFilter(mod));
  const clash = clone(mod); clash.step[0].name = "seedPos"; clash.step[1].name = "seed_pos";
  const names = tdNames(clash);
  assert.notEqual(names.top.get("seedPos"), names.top.get("seed_pos"));
  assert.notEqual(names.dat.get("seedPos"), names.dat.get("seed_pos"));
  clash.step[1].name = "SeedPos";
  assert.throws(() => simTDFiles(clash), /Windows 上重名/);
  clash.step[1].name = "../bad";
  assert.throws(() => simTDFiles(clash), /文件名无效/);
  for (const name of ["uTDPass", "uTDOutputInfo", "uTD2DInfos"]) assert.match(validateParams([{ name, label: "reserved", type: "float", value: 0 }])!, /冲突/);
});
test("new schema preserves matching values and resets changed types", () => {
  const before = [{ name: "uA", type: "float" as const, value: 0.5, label: "A" }];
  const after = [...before, { name: "uB", type: "bool" as const, value: true, label: "B" }];
  assert.deepEqual(reconcileValues(after, { uA: 0.8 }, before), { uA: 0.8, uB: true });
  assert.deepEqual(reconcileValues([{ ...before[0], type: "bool", value: false }], { uA: 0.8 }, before), { uA: false });
  assert.match(validateParams([...before, ...before])!, /重复/);
  assert.match(validateParams([{ ...before[0], name: "uTime" }])!, /冲突/);
  assert.match(validateParams([{ ...before[0], min: 2, max: 1 }])!, /无效/);
  assert.equal(stepPrecision(0.001), 3);
  assert.equal(stepPrecision(0.005), 3);
  assert.equal(stepPrecision(0.25), 2);
  assert.deepEqual(reconcileValues([{ ...before[0], max: 0.6 }], { uA: 0.8 }, before), { uA: 0.6 });
});
test("TD filter exports the exact edited core and current float, vector, color, bool values", async () => {
  const entry = registry.find((e) => e.id === "mosaic")!;
  const mod = clone(await entry.load());
  assert.ok(isFilter(mod));
  mod.core += "\n// edited shared core";
  const text = wrapTD(mod, { state: { uBlock: 37, uRound: 0.22, uBg: [0.1, 0.2, 0.3] }, exportId: "my-project" });
  assert.ok(text.includes(mod.core));
  assert.match(text, /uBlock\s+float\s+37\.0/);
  assert.match(text, /uBg\s+vec3\s+0\.1 0\.2 0\.3/);
  assert.match(text, /#define uResolution/);
  assert.match(text, /uniform vec2 uMouse/);
  const cloth = await registry.find((e) => e.id === "cloth-banner")!.load();
  assert.ok(!isFilter(cloth));
  const files = simTDFiles(cloth, { state: { ...defaultState(cloth.params), uPinTop: false, uClothCenter: [0.2, 0.7] }, exportId: "cloth-banner" });
  const network = files.find((f) => f.name === "NETWORK.md")!.text;
  assert.match(network, /uPinTop\s+float\s+0/);
  assert.match(network, /uClothCenter\s+vec2\s+0\.2 0\.7/);
  assert.match(network, /Initialization/);
  assert.match(network, /seedPos/);
  for (const pass of [...(cloth.init ?? []), ...cloth.step, cloth.display]) assert.ok(files.find((f) => f.name === pass.name + ".glsl")!.text.includes(pass.core));
});
test("project ZIP round trip preserves failed drafts and last successful source", async () => {
  const entry = registry[0], module = await entry.load();
  const project = makeProject(entry.id, entry.kind, module);
  project.compiled = clone(module);
  assert.ok(isFilter(project.draft));
  project.draft.core = "invalid shader draft";
  const archive = await exportProject(project);
  const restored = await importProject(new Uint8Array(await archive.arrayBuffer()));
  assert.notEqual(restored.id, project.id);
  assert.deepEqual(restored.draft, project.draft);
  assert.deepEqual(restored.compiled, project.compiled);
  assert.ok(hasChanges(restored));
  await assert.rejects(exportTD(restored), /先成功运行/);
});
test("simulation variants retain independent values and export real ZIP files", async () => {
  for (const id of registry.filter((entry) => entry.kind === "sim").map((entry) => entry.id)) {
    const entry = registry.find((e) => e.id === id)!, module = await entry.load();
    const project = makeProject(id, entry.kind, module); project.compiled = clone(module);
    const restored = await importProject(new Uint8Array(await (await exportProject(project)).arrayBuffer()));
    assert.equal(restored.originId, id);
    assert.deepEqual(restored.values, project.values);
    const td = await exportTD(project);
    const files = unzipSync(new Uint8Array(await td.blob.arrayBuffer()));
    assert.ok(files["display.glsl"]);
    assert.ok(strFromU8(files["NETWORK.md"]).includes(id));
  }
});
test("invalid versions, definitions and simulation topology are rejected", async () => {
  const entry = registry.find((e) => e.id === "fluid")!;
  const p = makeProject(entry.id, entry.kind, await entry.load());
  const pack = (value: unknown) => zipSync({ "project.json": strToU8(JSON.stringify(value)) });
  await assert.rejects(importProject(new Uint8Array([1, 2, 3])), /损坏/);
  await assert.rejects(importProject(pack({ ...p, version: 99 })), /版本/);
  const bad = clone(p); bad.draft.params[0].name = "uTime";
  await assert.rejects(importProject(pack(bad)), /冲突/);
  assert.ok(!isFilter(p.draft));
  p.draft.step[0].inputs = ["not-a-buffer"];
  await assert.rejects(importProject(pack(p)), /拓扑/);
});
test("driver diagnostic formats map wrapper lines back to shared core", () => {
  assert.equal(diagnosticsFromLog("ERROR: 0:18: unexpected token", 10, "display")[0].line, 8);
  assert.equal(diagnosticsFromLog("0(22) : error C0000", 10)[0].line, 12);
  assert.equal(diagnosticsFromLog("link failed")[0].line, undefined);
});

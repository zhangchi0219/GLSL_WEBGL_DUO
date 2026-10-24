import { test, expect } from "@playwright/test";
import { unzipSync, strFromU8 } from "fflate";
import { readFile, writeFile, mkdir } from "node:fs/promises";

test("organic growth UI supports six presets, seed resets, persistence, export and narrow layout", async ({ page }) => {
  test.setTimeout(240000);
  await page.goto("/");
  await expect(page.locator(".compile-state")).toHaveText("编译成功");
  const group = page.locator(".nav-group").filter({ has: page.getByText("Organic Growth", { exact: true }) });
  await expect(group.locator(".nav-item")).toHaveCount(6);
  await page.getByLabel("搜索效果").fill("physarum");
  await expect(group.locator(".nav-item")).toHaveCount(1);
  await page.getByLabel("搜索效果").fill("");
  await page.getByLabel("预览质量").selectOption("low");
  for (const id of ["space-colonization", "l-system", "reaction-diffusion", "physarum", "dla", "phyllotaxis"]) {
    await page.locator(`[data-module-id="organic-${id}"]`).click();
    await expect(page.locator(".compile-state")).toHaveText("编译成功");
    await expect(page.getByRole("button", { name: "导入图片", exact: true })).toBeDisabled();
    await expect(page.locator(".stage-error")).toHaveCount(0);
    await page.getByRole("button", { name: "打开参数面板" }).click();
    await page.getByLabel("随机种子 · 重新生长 数值", { exact: true }).fill("73");
    await page.getByLabel("随机种子 · 重新生长 数值", { exact: true }).press("Enter");
    await page.getByRole("button", { name: "关闭参数面板" }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `artifacts/verification/organic-${id}-1440.png` });
  }
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 TD", exact: true }).click();
  const download = await downloadPromise;
  const files = unzipSync(await readFile((await download.path())!));
  expect(strFromU8(files["NETWORK.md"])).toContain("uSeed  float  73.0");
  expect(strFromU8(files["sort.glsl"])).toContain("#define uIteration float(uTDPass)");
  await expect(page.locator(".statusbar")).toContainText("已保存到本机");
  await page.reload();
  await expect(page.getByLabel("项目名称")).toHaveValue("Phyllotaxis");
  await page.getByRole("button", { name: "打开参数面板" }).click();
  await expect(page.getByLabel("随机种子 · 重新生长 数值", { exact: true })).toHaveValue("73");
  await page.getByRole("button", { name: "关闭参数面板" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "打开效果库" }).click();
  await page.locator('[data-module-id="organic-reaction-diffusion"]').click();
  await expect(page.getByLabel("模拟画布")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/verification/organic-390.png" });
});

test("organic GPU states follow their algorithms, replay deterministically and survive display resize", async ({ page }) => {
  test.setTimeout(300000);
  await page.goto("/");
  await expect(page.locator(".compile-state")).toHaveText("编译成功");
  await page.getByRole("button", { name: "暂停预览" }).click();
  const results = await page.evaluate(async () => {
    const { SimRenderer } = await import("/src/gl/simRenderer.ts");
    const { registry } = await import("/src/filters/registry.ts");
    const { defaultState } = await import("/src/filters/types.ts");
    const originalNow = performance.now.bind(performance); let now = 0;
    Object.defineProperty(performance, "now", { configurable: true, value: () => now });
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;left:-1000px;width:192px;height:192px"; document.body.append(canvas);
    const renderer = new SimRenderer(canvas), gl = renderer.gl;
    type Slot = { w: number; h: number; idx: number; tex: WebGLTexture[]; fbo: WebGLFramebuffer[] };
    const slots = () => (renderer as unknown as { bufs: Map<string, Slot> }).bufs;
    const read = (name: string) => {
      const slot = slots().get(name)!; const pixels = new Float32Array(slot.w * slot.h * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.fbo[slot.idx]);
      gl.readPixels(0, 0, slot.w, slot.h, gl.RGBA, gl.FLOAT, pixels); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return pixels;
    };
    const same = (a: Float32Array, b: Float32Array) => a.length === b.length && a.every((v, i) => v === b[i]);
    const results = [];
    try {
      for (const entry of registry.filter((e) => e.group === "Organic Growth")) {
        const mod = await entry.load(); if ("core" in mod) throw new Error("Expected simulation");
        const state = defaultState(mod.params), pointer = { pos: [0.5, 0.5] as [number, number], vel: [0, 0] as [number, number], down: false };
        const tick = (frames = 1, paused = false) => { for (let k = 0; k < frames; k++) { now += 1000 / 60; renderer.render(now / 1000, state, pointer, paused); } };
        renderer.compileModule(mod); tick(1, true);
        const field = entry.id.endsWith("reaction-diffusion") ? "chemicals" : entry.id.endsWith("dla") ? "aggregate" : "field";
        const initial = read(field); tick(32); const evolved = read(field);
        let mechanics = true;
        if (entry.id.endsWith("space-colonization")) {
          const count = read("count")[0], nodes = read("nodes"), attractors = read("attractors");
          mechanics = count > 1 && count <= 1024;
          for (let i = 1; i < count; i++) mechanics &&= nodes[i * 4 + 2] >= 0 && nodes[i * 4 + 2] < i;
          mechanics &&= attractors.some((v, i) => i % 4 === 3 && v === 0);
        }
        if (entry.id.endsWith("l-system")) {
          const structure = read("structure"); let count = 0;
          for (let i = 0; i < structure.length; i += 4) if (structure[i] >= 0) count++;
          mechanics = count === 5 ** Number(state.uDepth);
        }
        if (entry.id.endsWith("reaction-diffusion")) mechanics = evolved.every((v) => v >= 0 && v <= 1);
        if (entry.id.endsWith("physarum")) mechanics = read("agents").every((v, i) => i % 4 > 1 || (v >= 0.019 && v <= 0.981)) && evolved.every((v) => v >= 0 && v <= 8);
        if (entry.id.endsWith("dla")) mechanics = initial.every((v, i) => i % 4 !== 0 || evolved[i] >= v);
        if (entry.id.endsWith("phyllotaxis")) {
          const geometry = read("geometry"), expectedRadius = 0.435 * Number(state.uSpacing) / Math.sqrt(Number(state.uCount) - 1);
          mechanics = Math.abs(Math.hypot(geometry[4] - 0.5, geometry[5] - 0.5) - expectedRadius) < 1e-5;
        }
        const indices = slots().has("indices") ? read("indices") : null;
        let sorted = true;
        if (indices) for (let i = 4; i < indices.length; i += 4) sorted &&= indices[i] >= indices[i - 4];
        tick(3, true); const paused = same(evolved, read(field));
        const texture = slots().get(field)!.tex[0]; canvas.style.width = "128px"; canvas.style.height = "224px"; tick(1, true);
        const resized = same(evolved, read(field)) && texture === slots().get(field)!.tex[0];
        canvas.style.width = "192px"; canvas.style.height = "192px";
        tick(208);
        const mature = read(field);
        let retainedPattern = true;
        if (entry.id.endsWith("reaction-diffusion")) retainedPattern = mature.some((v, i) => i % 4 === 1 && v > 0.2);
        if (entry.id.endsWith("dla")) {
          const before = read(field); tick(); const after = read(field);
          for (let i = 0; i < 384 * 384; i++) if (after[i * 4] > 0.5 && before[i * 4] < 0.5) {
            mechanics &&= [i - 1, i + 1, i - 384, i + 384].some((neighbor) => before[neighbor * 4] > 0.5);
          }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        const rgba = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
        const flipped = new Uint8ClampedArray(rgba.length);
        for (let y = 0; y < canvas.height; y++) flipped.set(rgba.subarray(y * canvas.width * 4, (y + 1) * canvas.width * 4), (canvas.height - 1 - y) * canvas.width * 4);
        const capture = document.createElement("canvas"); capture.width = canvas.width; capture.height = canvas.height;
        capture.getContext("2d")!.putImageData(new ImageData(flipped, canvas.width, canvas.height), 0, 0);
        const screenshot = capture.toDataURL("image/png").split(",")[1];
        const replayStart = now; renderer.reset(); tick(1, true); tick(32); const replay = same(evolved, read(field));
        let interactive = true;
        if (["organic-reaction-diffusion", "organic-physarum", "organic-dla"].includes(entry.id)) {
          tick(2); const control = read(field);
          renderer.reset(); tick(1, true); tick(32);
          pointer.pos = [0.78, 0.72]; pointer.down = true; tick(2);
          interactive = !same(control, read(field)); pointer.down = false; pointer.pos = [0.5, 0.5];
        }
        const parameterName = entry.id.endsWith("space-colonization") || entry.id.endsWith("l-system") ? "uWidth" : entry.id.endsWith("reaction-diffusion") ? "uFeed" : entry.id.endsWith("physarum") ? "uDecay" : entry.id.endsWith("dla") ? "uStick" : "uPointSize";
        const parameter = mod.params.find((p) => p.name === parameterName)!;
        renderer.reset(); tick(1, true); tick(40); const parameterControl = read(field);
        renderer.reset(); tick(1, true); tick(32);
        state[parameterName] = parameterName === "uStick" ? parameter.min! : parameter.max!; tick(8);
        const adjusted = !same(parameterControl, read(field)); state[parameterName] = parameter.value;
        state.uSeed = 74; tick(1, true); const seedReset = read("clock")[0] === 0;
        state.uSeed = 42; renderer.reset(); now = replayStart; tick(1, true);
        state.uSpeed = 2;
        for (const p of mod.params) if (p.type === "float" && !["uSeed", "uSpeed"].includes(p.name)) state[p.name] = p.max!;
        tick(24);
        let finite = true; for (const name of slots().keys()) finite &&= read(name).every(Number.isFinite);
        results.push({ id: entry.id, changed: !same(initial, evolved), mechanics, sorted, paused, resized, replay, seedReset, retainedPattern, interactive, adjusted, finite, error: gl.getError(), screenshot });
      }
    } finally { renderer.dispose(); canvas.remove(); Object.defineProperty(performance, "now", { configurable: true, value: originalNow }); }
    return results;
  });
  await mkdir("artifacts/verification", { recursive: true });
  for (const result of results) await writeFile(`artifacts/verification/${result.id}-mature.png`, Buffer.from(result.screenshot, "base64"));
  const report = results.map(({ screenshot: _screenshot, ...result }) => result);
  await writeFile("artifacts/verification/organic-gpu.json", JSON.stringify(report, null, 2));
  console.log("Organic GPU checks", JSON.stringify(report));
  expect(results).toHaveLength(6);
  for (const result of results) {
    expect(result, result.id).toEqual(expect.objectContaining({ changed: true, mechanics: true, sorted: true, paused: true, resized: true, replay: true, seedReset: true, retainedPattern: true, interactive: true, adjusted: true, finite: true, error: 0 }));
  }
});

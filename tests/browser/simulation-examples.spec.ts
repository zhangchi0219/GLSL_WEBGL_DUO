import { test, expect } from "@playwright/test";
import { unzipSync, strFromU8 } from "fflate";
import { readFile } from "node:fs/promises";

const examples = [
  { id: "example-wind", name: "Wind", label: "风力 数值", value: "2.1", uniform: "uStrength" },
  { id: "example-noise", name: "Noise", label: "噪声强度 数值", value: "2.3", uniform: "uStrength" },
  { id: "example-boundary", name: "Boundary", label: "障碍物半径 数值", value: "0.18", uniform: "uRadius" },
  { id: "example-physics", name: "Physics", label: "重力 数值", value: "0.6", uniform: "uGravity" },
];

test("simulation examples support search, edits, independent persistence, TD export and mobile drawers", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await expect(page.locator(".compile-state")).toHaveText("编译成功");
  const group = page.locator(".nav-group").filter({ has: page.getByText("Simulation Examples", { exact: true }) });
  await expect(group.locator(".nav-item")).toHaveCount(4);
  await page.getByLabel("搜索效果").fill("wind");
  await expect(group.locator(".nav-item")).toHaveCount(1);
  await page.getByLabel("搜索效果").fill("");
  await page.getByLabel("预览质量").selectOption("low");
  for (const example of examples) {
    await page.locator(`[data-module-id="${example.id}"]`).click();
    await expect(page.locator(".compile-state")).toHaveText("编译成功");
    await expect(page.getByLabel("模拟画布")).toBeVisible();
    await expect(page.getByRole("button", { name: "导入图片", exact: true })).toBeDisabled();
    await expect(page.locator(".source-info")).toContainText("程序生成");
    await page.getByRole("button", { name: "打开参数面板" }).click();
    await page.getByLabel(example.label, { exact: true }).fill(example.value);
    await page.getByLabel(example.label, { exact: true }).press("Enter");
    await page.getByRole("button", { name: "关闭参数面板" }).click();
    const rect = (await page.getByLabel("模拟画布").boundingBox())!;
    await page.mouse.move(rect.x + rect.width * 0.35, rect.y + rect.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.6, rect.y + rect.height * 0.45, { steps: 10 });
    await page.mouse.up();
    await page.evaluate(() => new Promise<void>((resolve) => {
      let frames = 40;
      const tick = () => --frames ? requestAnimationFrame(tick) : resolve();
      requestAnimationFrame(tick);
    }));
    await expect(page.locator(".stage-error")).toHaveCount(0);
    await page.screenshot({ path: `artifacts/verification/${example.id}-1440.png` });
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出 TD", exact: true }).click();
    const file = await downloaded;
    const files = unzipSync(await readFile((await file.path())!));
    expect(files["display.glsl"]).toBeDefined();
    const guide = strFromU8(files["NETWORK.md"]);
    expect(guide).toContain(example.id);
    expect(guide).toContain("No source TOP required");
    expect(guide).toMatch(new RegExp(`${example.uniform}\\s+float\\s+${Number(example.value)}`));
  }
  await page.getByLabel("模拟 Pass").selectOption("display");
  const editor = page.getByRole("textbox", { name: "GLSL 源码编辑器" });
  await editor.press("Control+End");
  await editor.press("End");
  await editor.press("Enter");
  await editor.pressSequentially("// saved example edit");
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.locator(".compile-state")).toHaveText("编译成功");
  await expect(page.locator(".statusbar")).toContainText("已保存到本机");
  await page.reload();
  await expect(page.getByLabel("项目名称")).toHaveValue("Physics");
  await editor.press("Control+End");
  await expect(page.locator(".cm-content")).toContainText("saved example edit");
  for (const example of examples) {
    await page.locator(`[data-module-id="${example.id}"]`).click();
    await expect(page.locator(".compile-state")).toHaveText("编译成功");
    await page.getByRole("button", { name: "打开参数面板" }).click();
    expect(Number(await page.getByLabel(example.label, { exact: true }).inputValue())).toBe(Number(example.value));
    await page.getByRole("button", { name: "关闭参数面板" }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "打开效果库" }).click();
  await page.getByLabel("搜索效果").fill("boundary");
  await expect(group.locator(".nav-item")).toHaveCount(1);
  await page.locator('[data-module-id="example-boundary"]').click();
  await expect(page.getByLabel("模拟画布")).toBeVisible();
  await page.getByRole("button", { name: "打开参数面板" }).click();
  await expect(page.getByLabel("障碍物半径 数值")).toHaveValue("0.180");
  await expect.poll(async () => {
    const bounds = (await page.getByRole("complementary", { name: "参数面板" }).boundingBox())!;
    return bounds.x >= 0 && bounds.x + bounds.width <= 391;
  }).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/verification/example-boundary-390-params.png", animations: "disabled" });
  await page.getByRole("button", { name: "关闭参数面板" }).click();
  await page.screenshot({ path: "artifacts/verification/example-boundary-390.png" });
});

test("example GPU states animate, react, pause exactly and remain finite at extreme settings", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/");
  await expect(page.locator(".compile-state")).toHaveText("编译成功");
  await page.getByRole("button", { name: "暂停预览" }).click();
  const results = await page.evaluate(async () => {
    const { SimRenderer } = await import("/src/gl/simRenderer.ts");
    const { registry } = await import("/src/filters/registry.ts");
    const { defaultState } = await import("/src/filters/types.ts");
    const modules = await Promise.all(registry.filter((entry) => entry.group === "Simulation Examples").map((entry) => entry.load()));
    const originalNow = performance.now.bind(performance);
    let clock = 0;
    Object.defineProperty(performance, "now", { configurable: true, value: () => clock });
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;left:-1000px;width:256px;height:192px";
    document.body.append(canvas);
    const renderer = new SimRenderer(canvas), gl = renderer.gl;
    type Slot = { w: number; h: number; idx: number; fbo: WebGLFramebuffer[] };
    const slots = () => (renderer as unknown as { bufs: Map<string, Slot> }).bufs;
    const image = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels;
    };
    const readSlot = (slot: Slot) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, slot.fbo[slot.idx]);
      const pixels = new Float32Array(slot.w * slot.h * 4);
      gl.readPixels(0, 0, slot.w, slot.h, gl.RGBA, gl.FLOAT, pixels);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return pixels;
    };
    const difference = (a: Uint8Array, b: Uint8Array) => a.reduce((sum, value, i) => sum + Number(value !== b[i]), 0);
    const results = [];
    try {
      for (const module of modules) {
        if ("core" in module) throw new Error("Expected simulation module");
        const state = defaultState(module.params);
        const pointer = { pos: [0.5, 0.5] as [number, number], vel: [0, 0] as [number, number], down: false };
        const tick = (frames: number, paused = false, interact = false) => {
          for (let frame = 0; frame < frames; frame++) {
            clock += 1000 / 60;
            if (interact) { pointer.pos = [0.45 + Math.sin(frame * 0.1) * 0.15, 0.48]; pointer.down = true; }
            renderer.render(clock / 1000, state, pointer, paused);
          }
          pointer.down = false;
        };
        const startTime = clock;
        renderer.compileModule(module);
        tick(1, true);
        const initial = image();
        tick(120);
        const active = image();
        let lit = 0;
        for (let i = 0; i < active.length; i += 4) if (Math.max(active[i], active[i + 1], active[i + 2]) > 50) lit++;
        let mechanics = true;
        if (module.meta.id === "example-physics") {
          const slot = slots().get("pos")!, pixels = readSlot(slot);
          const top = ((slot.h - 1) * slot.w + Math.floor(slot.w * 0.5)) * 4;
          mechanics = pixels[top] === 0 && pixels[top + 1] === 0 && pixels.some((v, i) => i % 4 === 1 && v < -0.01);
        }
        if (module.meta.id === "example-boundary") {
          const slot = slots().get("h")!, pixels = readSlot(slot);
          const center = (Math.floor(0.53 * slot.h) * slot.w + Math.floor(0.63 * slot.w)) * 4;
          mechanics = pixels[center] === 0 && pixels[center + 1] === 0 && pixels.some((v, i) => i % 4 === 0 && Math.abs(v) > 0.01);
        }
        tick(30, true);
        const pausedDifference = difference(active, image());
        const key = module.meta.id === "example-wind" ? "uDirection" : module.meta.id === "example-noise" ? "uNoiseScale" : module.meta.id === "example-boundary" ? "uRadius" : "uGravity";
        // 同一时钟、相同初始状态的对照，区分输入响应和单纯随时间运动。
        const replay = (interact: boolean, change: boolean) => {
          clock = startTime;
          Object.assign(state, defaultState(module.params));
          renderer.compileModule(module);
          tick(1, true); tick(120); tick(45, false, interact);
          if (change) state[key] = module.params.find((param) => param.name === key)!.max!;
          tick(60);
          return image();
        };
        const control = replay(false, false);
        const interacted = replay(true, false);
        const adjusted = replay(false, true);
        let zeroForce = true;
        if (module.meta.id !== "example-boundary") {
          Object.assign(state, defaultState(module.params));
          state[module.meta.id === "example-physics" ? "uGravity" : "uStrength"] = 0;
          renderer.compileModule(module); tick(60);
          const data = readSlot(slots().get(module.meta.id === "example-physics" ? "pos" : "vel")!);
          zeroForce = data.every((value, i) => i % 4 > 1 || value === 0);
        }
        let finite = true, peak = 0;
        for (const dimensions of [[256, 192], [96, 256]]) {
          canvas.style.width = `${dimensions[0]}px`; canvas.style.height = `${dimensions[1]}px`;
          for (const param of module.params) if (param.type === "float") state[param.name] = param.name === "uDamping" ? param.min! : param.max!;
          renderer.reset(); tick(180, false, true);
          for (const slot of slots().values()) {
            const data = readSlot(slot);
            finite &&= data.every(Number.isFinite);
            for (const value of data) peak = Math.max(peak, Math.abs(value));
          }
        }
        results.push({ id: module.meta.id, lit, animated: difference(initial, active), pausedDifference, interactive: difference(control, interacted), adjusted: difference(control, adjusted), mechanics, zeroForce, finite, peak, error: gl.getError() });
        canvas.style.width = "256px"; canvas.style.height = "192px";
      }
    } finally {
      renderer.dispose(); canvas.remove();
      Object.defineProperty(performance, "now", { configurable: true, value: originalNow });
    }
    return results;
  });
  console.log("Simulation GPU checks", JSON.stringify(results));
  expect(results).toHaveLength(4);
  for (const result of results) {
    expect(result.lit, result.id).toBeGreaterThan(100);
    expect(result.animated, result.id).toBeGreaterThan(128);
    expect(result.pausedDifference, result.id).toBe(0);
    expect(result.interactive, result.id).toBeGreaterThan(128);
    expect(result.adjusted, result.id).toBeGreaterThan(128);
    expect(result.mechanics, result.id).toBe(true);
    expect(result.zeroForce, result.id).toBe(true);
    expect(result.finite, result.id).toBe(true);
    expect(result.peak, result.id).toBeLessThanOrEqual(4);
    expect(result.error, result.id).toBe(0);
  }
});

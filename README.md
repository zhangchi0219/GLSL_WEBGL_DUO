# GLSL / Workbench

黑色极简 GLSL 工作台：编写共享 GLSL、实时调参，在 WebGL2 预览，再导出到 TouchDesigner。

现有 **22 个单通道滤镜 + 15 个多通道模拟预设**，共 37 个预设。浏览器与 TD 使用同一份 core；平台差异集中在 wrapper。

## 启动与验证

```bash
npm ci
npm run dev
npm run typecheck
npm run test
npm run test:browser     # 首次需要 npx playwright install chromium
npm run build
npm run gen:td
```

开发地址默认为 http://localhost:5173。生产结果位于 `dist/`，相对资源路径支持静态部署和子目录。字体随构建打包，无外部字体请求。浏览器验证截图与报告写入被 Git 忽略的 `artifacts/verification/`。

## 工作区

- 顶部：图片导入、项目操作、运行和 TD 导出。
- 左侧：可搜索的效果库，以及自定义／导入项目。
- 中间：全高 Shader 预览，画布铺满区域。默认源图是 GPU 实时生成的 Gradient Fluid 液态渐变。
- 右侧：GLSL、TouchDesigner 包装和 Gradient 底图代码示例。GLSL 可编辑，后两项只读；提供换行开关、复制反馈和示例下载。
- 预览与代码左右并列；竖向分隔条支持拖动和左右方向键，两区可分别放大。
- 参数通过顶部滑杆按钮打开抽屉，支持精确数值输入。小数位随 step 决定，0.001 步长显示三位。
- 小于 1200px 时效果库使用抽屉；小于 900px 时代码区通过顶部代码按钮打开抽屉。
- 预览提供暂停、低／标准／高质量；模拟另有重置按钮。标准质量为 DPR 1、长边最多 1280px，高质量最多 DPR 2、长边 2048px。模拟保留自身缓冲区缩放。

操作和说明使用中文；效果名称、uniform 和编程术语保留英文。

### Simulation Examples

效果库的独立 `Simulation Examples` 分类位于 `Simulation` 之后，展示四种基础机制：

| 示例 | 演示内容 | 主要调节项 |
| --- | --- | --- |
| Wind | 风场推动细线状示踪纹理，箭头显示流向 | 风向、风力、阵风强度、拖尾衰减 |
| Noise | 平滑分形噪声的 curl 驱动旋涡轨迹 | 噪声尺度、强度、演变速度、拖尾衰减 |
| Boundary | 波纹遇容器边缘和圆形障碍物发生反射 | 障碍物位置与半径、波速、波纹保留率 |
| Physics | 顶边固定的弹簧网格受重力下垂，颜色显示拉伸 | 重力、弹簧刚度、阻尼、拖拽力度 |

四个示例都无需源图片，进入后自动运行。拖动预览可施加扰动或抓取网格，支持暂停、重置、编辑各 Pass、独立保存、项目备份与 TD 网络导出。风场、噪声和波纹使用半分辨率缓冲区，物理网格使用四分之一分辨率。

Boundary 的波速是每次更新的 Courant 系数，最大 0.68；传播速度会随帧率和缓冲区尺寸变化。跨平台比较时需匹配分辨率、帧率和时间步长。四项是用于观察基础机制的实时示例。

### Organic Growth

独立的 `Organic Growth` 分类位于效果库末尾，包含六个无需图片的二维生成器：

| 预设 | 机制与主要参数 |
| --- | --- |
| Space Colonization | 512 个吸引点引导最多 1024 个节点生长；调节影响距离、到达距离和步长 |
| L-system | 文法 `F → F[+F]F[-F]F`，最多五代；调节分枝角、长度和随机量 |
| Reaction–Diffusion | Gray–Scott 双物质反应扩散；调节 Feed、Kill 和扩散比例；拖动注入种子 |
| Physarum | 4096 个粒子感知、沉积、扩散轨迹；调节感知角、距离、转向和衰减；拖动加入吸引轨迹 |
| DLA | 1024 个随机游走粒子接触聚集体后黏附，在聚集体外围重新投放；调节黏附概率，拖动添加种子 |
| Phyllotaxis | 黄金角与平方根半径的叶序排列，最多 4096 点；调节发散角、数量、尺度和圆点大小 |

六项均提供速度、随机种子、前景色和背景色，支持暂停、重置、编辑各 Pass、项目备份与 TD 导出。标注「重新生长」的参数改变后自动初始化。生长结构达到上限后保留，反应扩散与黏菌持续演化；不同反应扩散参数也可能使种子消退。保存源码和参数，刷新后重新运行，不保存 GPU 当前帧。

逻辑画布为固定 384×384，居中等比显示。改变预览尺寸或质量会保留生长状态。数据纹理按各自固定尺寸使用 RGBA32F 与 nearest；显示场使用 RGBA16F。空间索引通过 GPU bitonic 排序与分区范围查询生成，无 JavaScript 几何模拟。

## 编写 GLSL

从已有预设开始，或在「项目 → 新建 Shader」创建单通道模板：

```glsl
uniform float uGain;

vec4 renderMain(vec2 uv, vec2 res, float time) {
    return texture(INPUT0, uv) * vec4(vec3(uGain), 1.0);
}
```

共享 core 不包含 `#version`、`main` 和输出声明；这些由 wrapper 提供。

滤镜内置 `uTime`、`uResolution`、`uMouse` 和 `INPUT0`。模拟额外提供 `uDt`、`uFrame`、`uTexel`、`uMouseVel`、`uMouseDown`、`uIteration` 和 `uCanvasResolution`，输入通过 `INPUT0–3` 访问。`uIteration` 是当前 Pass 内从零开始的迭代序号；`uCanvasResolution` 是最终预览尺寸，`uResolution` 是当前 Pass 的输出尺寸。每个模拟 Pass 的连接显示在源码上方。

「参数定义」显式配置 float、vec2、color、bool 控件、默认值、范围和步长。GLSL 中手动声明同名 uniform：color 对应 vec3；bool 控件对应 **float 0.0／1.0**。当前版本不支持数组、额外 sampler 或 int 参数。重复名称、内置变量冲突、无效范围和不匹配的活动 uniform 会报错。

点击「运行」或 **Ctrl／Cmd + Enter** 提交代码和参数定义。数值调整实时生效。编译失败保留上次成功预览，并提供 Pass 和源码行号；点击错误可跳转到对应位置。模拟成功提交新代码后重建状态；重复运行相同代码保留当前模拟。

模拟支持编辑现有初始化、更新和显示 Pass。缓冲区、输入连接和执行顺序由预设确定；本版本不提供新建模拟拓扑的节点编辑器。

「重置参数」只恢复当前定义的默认值。「项目 → 恢复预设代码」恢复原始模块和参数，并提供一次撤销。

## 保存与项目文件

工作区在修改后延迟 500ms 自动保存到 **IndexedDB**，包括每个效果的草稿、上次成功源码、参数值和原图。刷新恢复最后选中的项目；不同模拟变体独立保存。

「导出项目与原图」下载 `.glslproj.zip`：
- `project.json`：版本 1 的项目数据。
- `assets/source`：上传的原图；渐变底图只记录内置生成器。

项目备份允许包含编译失败的草稿。导入作为新项目加入，不覆盖现有内容；会验证文件版本、参数、图片和模拟拓扑。图片与项目文件限 64 MB，图片长边最多 16384px，实际上传还受 GPU 的纹理上限约束。

保存状态显示在底栏。本地存储失败时编辑内容仍留在内存中，可以导出项目备份。浏览器清除站点数据会清除本机项目，因此需要长期保留的作品应导出备份。

## TouchDesigner 迁移

TD 导出仅在当前源码成功运行后可用，配置说明包含 **当前调节值**。

兼容目标为 **TouchDesigner 2022.24200 及以上的 Vulkan 分支，GLSL 4.60、Vertex/Pixel 模式**；2023 / 2025 延续相同的 Pixel Shader 接口，未使用 POP 或新 Compute API。这里的 4.60 指 GLSL 语言版本。TD 2021 及更早版本不在本导出目标内。原生 TD 中的编译与运行仍需单独实测。

命名分为三层：界面名称保留英文显示名，项目 ID / 目录保留原名以兼容旧项目，TD 网络节点采用 ASCII `snake_case`。例如 `organic-space-colonization` 放在 `base_organic_space_colonization` 内；GLSL TOP 为 `glsl_clock`，代码 DAT 为 `shader_clock`，反馈为 `feedback_clock`。四路输入使用 `glslmulti_propose` 等 GLSL Multi TOP。每份 `NETWORK.md` 都列出无冲突的完整映射，`.glsl` 文件名保持兼容；uniform 保持原来的 `uCamelCase`，禁止占用 TD 内置的 `uTD*` 名称。

### 单通道

1. 点击「导出 TD」得到 `<name>_td.glsl`。
2. 创建 GLSL TOP，选择 GLSL **4.60**，把文件放入 Pixel Shader DAT。
3. 源图片 TOP 接 Input 0；输出尺寸与浏览器底栏显示的渲染尺寸一致。
4. 按文件中的 SETUP 配置 Vectors uniform。时间由 `absTime.seconds` 驱动；鼠标为 0–1、y-up。
5. 使用 8-bit fixed RGBA 比较预览。wrapper 已处理 `TDOutputSwizzle`。

### 渐变底图

在右侧「Gradient 底图」标签下载 `gradient_source_td.glsl`，放入独立 GLSL TOP 的 Pixel Shader DAT，无需输入 TOP。设置输出分辨率，并让 `uTime` 使用 `absTime.seconds`。将其输出连接到滤镜 Input 0 或模拟网络的 source TOP，即可使用与浏览器相同的渐变 core。

### 多通道模拟

导出为真正的 ZIP：每个初始化／更新／显示 Pass 一份 `.glsl`，另有 `NETWORK.md`。**普通 GLSL TOP 最多三个有线输入，四路 Pass 必须使用 GLSL Multi TOP**，两者都选 Vertex/Pixel；所需节点类型会逐项标明。

网络说明包含：
- 缓冲区分辨率、浮点像素格式和需要跨帧反馈的缓冲区。
- 初始化方式，以及每个 Pass 的精确输入连接。
- 同帧多次写入后的最新状态连接。
- Feedback TOP 的 **Target TOP**，及压力求解的 **Num Passes**。
- 当前参数值、时间和鼠标 uniform。

固定尺寸状态纹理需关闭 **Use Global Res Multiplier**，输入边界设为 **Hold**，对应浏览器 CLAMP_TO_EDGE。**Input Smoothness** 决定 Shader 采样，**Viewer Smoothness** 仅影响查看器；不要用后者代替前者。节点索引通过 `texelFetch` 读取，连续场使用 linear；DLA 聚集场使用 nearest。状态使用说明中的 `rgba16float` / `rgba32float`；有颜色管理的版本需使用 Passthrough，颜色参数填 Vectors 页面，避免 Colors 页进行额外转换。

Fluid 默认半分辨率、25 次 Jacobi 压力求解。重滤镜及高分辨率模拟可降低预览质量或缩小 TD 分辨率。

`npm run gen:td` 使用预设默认值批量生成 `td/*_td.glsl`、独立渐变底图和十五个模拟目录：
`ripple-rain`、`ripple-pointer`、`fluid`、`cloth-veil`、`cloth-banner`、
`example-wind`、`example-noise`、`example-boundary`、`example-physics`。
新增六个目录为 `organic-space-colonization`、`organic-l-system`、`organic-reaction-diffusion`、`organic-physarum`、`organic-dla`、`organic-phyllotaxis`。
原有 `waterRipple`、`cloth` 家族目录继续保留，分别对应雨滴和 Sheer Veil 默认预设。

共享 core 一致；跨平台运动比较还需要一致的帧时间、鼠标采样、浮点格式和 Feedback 调度。仓库自动化覆盖 WebGL GPU 编译、导出内容和浏览器行为；TD 软件内运行需要单独验证。

参考：[Write a GLSL TOP](https://derivative.ca/UserGuide/Write_a_GLSL_TOP)、[Feedback TOP](https://derivative.ca/UserGuide/Feedback_TOP)、[GLSL TOP](https://derivative.ca/UserGuide/GLSL_TOP)、[GLSL Multi TOP](https://derivative.ca/UserGuide/GLSL_Multi_TOP)、[2022 Vulkan 与 GLSL 4.60](https://derivative.ca/release/202224200/66252)。

## 代码结构

```text
src/filters/             单通道共享 core、参数和元数据；registry 是预设入口
src/sims/                多通道模拟 core 与固定调度
src/gl/                  GPU 程序构建、滤镜／模拟渲染器和流体渐变源
src/hooks/useWorkspaceRenderer.ts  当前引擎生命周期、暂停和上下文恢复
src/workspace/           项目模型、IndexedDB、ZIP 导入导出
src/td/wrapper.ts        WebGL → TD 平台包装与网络说明
src/components/          工作台、CodeMirror 编辑器和参数控件
src/styles/              黑灰设计变量、基础样式和响应式布局
tests/                   数据／导出单元测试和 Playwright 浏览器验证
```

新增滤镜：添加导出 meta、params、core 的模块，再加入 registry。新增模拟：实现 SimModule，加入 registry。两种平台均消费同一份共享 GLSL。

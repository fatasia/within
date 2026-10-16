# 樱谷行舟：上游复用与验证

场景复用 Sakura Fantasy 的原始树木、扫描贴图、完整篷舟和绑定人物，在入画中提供进度同步跟拍与乘舟第一视角。

## 来源与许可

- 上游：https://github.com/billpwchan/sakura-fantasy，参考提交 `9f2093e8e61d2f4c7eafe92b8d52464ceb11439b`。
- `sakuraVendor/trees.js`、`geo.js`、`math.js` 保留原始樱花与杉木生成器；`figures.js` 保留人物材质、双骨骼 IK 与头部转向。
- `public/assets/sakura/LICENSE`、`UPSTREAM-CREDITS.md` 保留 MIT 许可及完整署名。舟体、服饰与和伞为上游自制；人物基于 MPFB2 / MakeHuman 的 CC0 人体，植物扫描来自 ffish.asia / floraZia，木材等素材来源见原署名。
- 舟体、船夫、乘客、和伞的四个 GLB 与 Basis 转码器均本地加载，无外站运行时依赖。

## 渲染与动画

花卡使用原始图集、法线和枝条风动，修复镜像背面黑绿斑。三种樱花种子保持完整花簇，42 米外只减少细枝；远近批次分别针对主镜头与反射镜头筛选。背景杉木复用针叶扫描，不使用实心圆锥。

原始木舟保留木纹、板缝、竹篷、货物和灯笼。船夫沿原船桨握点执行双臂 IK，身体重心与划桨周期同步；乘客头部、和伞缓动。人物皮肤、靛蓝衣料、纹样与纸伞材质适配当前光照，水面反光补光避免人物成为黑影。

`prepareAssets(renderer)` 每场景只加载一次，显式 `sakuraAssetsReady` 可供截图等待。加载失败保留程序化备选舟体并记录 `sakuraAssetError`；场景先销毁时，后到达的模型只释放、不挂载；转码器在加载结束后销毁。

## 航线与乘舟

`sampleSakuraVoyage(progress, elapsed)` 返回船位、Euler 旋转及跟拍 `eye/target`。路线由 z=20 到 z=-94，依次经过拱桥、町屋与湖上鸟居。进度驱动路线，时间仅驱动起伏；播放、拖动与离线影片使用相同采样。

跟拍在船后 14 米、侧移 1.1 米、常态眼高约 6.7 米；桥区平滑降至 3.05 米，从桥下通过。视线瞄准舟体附近，避免船尾被底部控制面板遮挡。

`sampleSakuraPassengerView(progress, elapsed, yaw, pitch)` 提供乘客眼位与相对视线。默认朝向船头，两岸可转头查看，不进行地面行走。`setPassengerView(true)` 缩小乘客自身头部并隐藏其伞，保留船体、身体与另一位船夫。

水面使用主线共享河流材质。按原模型 36 个截面宽度与完整船体逆变换剔除船舱内的水片，保持正常吃水，不通过整体抬高船体隐藏漏水。

## 验证

```sh
npx tsc --noEmit
npx vitest run src/engine/sakuraGrove.test.ts src/engine/sakuraVoyage.test.ts src/engine/sakuraBoat.test.ts
node scripts/review-sakura.mjs
node scripts/review-sakura-voyage.mjs
node scripts/review-sakura-passenger.mjs
node scripts/review-sakura-ui.mjs
```

15 项测试覆盖树木 LOD、法线与纹理释放、路线确定性、桥下净空、第一视角，以及资源幂等、失败回退和销毁后到达。最新 TypeScript 与相关 ESLint 检查通过。

截图分别输出到 `artifacts/sakura-review/`、`sakura-voyage/`、`sakura-passenger/`、`sakura-ui/`。已查看船内俯视、前向乘舟、两帧划桨和 1440×900 带 UI 的跟拍/乘舟截图；船内木地板干燥、头部无穿模，浏览器错误列表为空。

帧时采样为 1600×1000、RTX 4060 Laptop、Chromium D3D11，包含反射与单像素强制读回，不包含 UI 合成或 rAF 等待。数值见各目录 `performance.json`，不换算为真实交互 FPS；手机与集显尚未实测。

## 与完整上游的区别

树木、完整舟体、人物绑定与主要材质直接复用上游。河谷布局、桥与町屋、共享水面、UI 和相机由入画维护；未移植上游完整四季天气系统，不等同于上游整站逐像素复刻。


## 入口性能（2026-10-16）

递归树枝/花簇生成转入 module Worker，以 transferable buffer 回传。三档画质只减少细枝距离和飘落粒子，不删原扫描花簇。原模型纹理逐张上传，场景与 GLB 的 canvas/反射 shader 分别预热；多个加载器共享同一 program 的初始化 Promise，避免提前挂载尚未 ready 的模型。光源在加载开始前固定，避免 GLB 到达时全场 shader 重编译。Three r186 使用 PCFShadowMap，避免已移除的 PCFSoft 模式在首帧被替换。

实际 App、1440×900、Chromium D3D11、本机 RTX 4060 Laptop 的冷启动及两次返回/进入记录：最大主线程长任务由 9870 ms 降至 643 ms，长任务总时长由 16220 ms 降至 1909 ms。最新页面 ready 约 5.09 秒；这是本机单次诊断，后测开启 CPU profiler，不能代表手机或所有设备。原始记录在 `artifacts/sakura-loading/before.json` 与 `after-shared-prewarm.json`。进入后的计时包含脚本固定 2 秒等待，不作为加载延迟指标。

环境声默认关闭，进入不创建 AudioContext；右上角按钮显式开启，离线影片音轨不受影响。此机首次打开系统音频约 2 秒，已从场景入口关键路径移除。加载/失败返回/两次进场与桌面、手机音频控制共 8 项 E2E 通过，生产构建通过。资源失败保留备选舟体，乘舟时隐藏其贴近眼位的临时灯笼。

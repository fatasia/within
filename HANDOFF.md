# 清明网页版写实路线 · 2026-10-17 晚

用户已选“保留手机网页版，按写实标准重建”。本轮调整弯曲街市、五开间两层商宅、共享材质贴图与局部阴影，保留手机时间轴和昼夜动作。235项单元测试及手机E2E通过；详情 docs/qingming-web-rebuild-2026-10-17.md。仍未完成全卷逐物还原，人物/建筑精度未达到用户要求，不能宣布整项完成。CloudBase默认域名返回attachment，已询问是否只更新文件，腾讯轻量和Pages已更新至78a0e69并复核新入口；CloudBase未更新。新版21秒片在 artifacts/qingming-rebuild-film-2026-10-17/，已全解码验证。

---

# 清明手机镜头与灯火 · 2026-10-17

本轮已完成手机近景、72盏灯笼/55处室内光/11处炊烟、船工划桨及桥市村人动效、院落用品和人物重叠修正。232项测试及手机E2E、lint/build通过。详情 docs/qingming-mobile-life-2026-10-17.md；日夜截图 artifacts/qingming-living。全卷逐物对应仍未完成，不得称为完整1:1复原。

---

# 清明空间补充 · 2026-10-17

最新一轮增加11组院落/33栋配屋、全卷开场和中段/卷尾俯瞰，删去贯穿乡野的直线城市铺路。228项测试及构建通过；详情 docs/qingming-panorama-2026-10-17.md。仍未完成原作逐户、逐人物对应，不得称为1:1全图复原。上一轮Roadster空中车流已部署，详情 docs/roadster-sky-traffic.md。

---

# 手机端界面更新 · 2026-10-17

保留原 MiniMap 山水时间轴、章节刻度与拖动定位；手机端改为顶部导航和底部薄面板。次要操作进入更多菜单，提供纯净画面切换，驾驶触控保留。日景纸色墨字、夜景深色浅字，细边框与轻量选中态。桌面原控件不变。

验证：225 项单元测试、lint、类型检查和生产构建通过；11 项触控/横竖屏/配乐 E2E 分组复跑通过。截图在 artifacts/mobile-hud-2026-10-17。新入口 index-DMAQccaD.js。部署结果见 docs/mobile-release-2026-10-17.md。

清明全景仍未完成用户验收：局部商铺密度不能替代完整画卷空间布局。已确认故宫名画记原作页面及 Commons 38414×1800 全卷；下一步按全卷重排城郊、汴河、虹桥与城内，而非继续局部堆模型。

---

# 最新交接状态 · 2026-10-16

本节覆盖下方历史记录中的旧状态、旧测试计数与排序；历史用户需求保留，不能把历史的“未做”当作当前实现状态，也不能据此宣称整项已完成。

## 19:55 清明细节追加

清明新增 49 处开放铺面（8 行业）、驮货骆驼队与顾客、码头货场、修船架、井栏农圃、后院低屋。新增近景镜头及卷尾补光。225 项测试、lint/build 通过；511,622 三角形 / 25 Mesh。21 秒独立片已完成，详情见 docs/qingming-detail-release-2026-10-16.md，视频目录见 docs/video-directory.md。仍非逐细节 1:1 全图复原。

## 本轮已落地与验证

- **清明上河图优先修复**：屋顶瓦垄与支撑穿模已修，人物、车马、舟船动效已接入；20 项相关测试通过，有屋檐特写与动态场景复检。当前不是整幅《清明上河图》的 1:1 完整复原，模型密度与全卷细节仍须按用户标准验收。
- **樱谷行舟**（原“樱花河谷”）：复用 Sakura Fantasy 原樱花/杉木生成器、扫描贴图、完整 GLB 篷舟与绑定人物。船夫双臂 IK 跟随船桨，服饰/皮肤材质、乘客头部与和伞缓动已接入；进度同步跟船与乘舟第一视角已接入。水面按原舟体截面剔除船内水片，维持正常吃水。15 项树木/航线/资源生命周期与并发预热测试通过，1440×900 与 390×844 乘舟 UI E2E 通过：播放与拖动不退出乘舟、进度推进、无地面摇杆、无水平溢出。截图已查看船内干燥及两帧划桨；详情见 `docs/sakura-reference.md`。
- **七景首页图**：北极、敦煌、黄山、西湖、喀纳斯、深海、樱谷各生成 1200×800 海报及 960×480 `-thumb.webp`，逐张查看非空、对应真实场景。樱谷构图后移，保留篷舟、樱岸与山景。`scripts/render-previews.mjs` 显式等待模型加载。
- **北极新版**：冰川、雪地、浮冰、动物及玩耍动效已更新，首页图已重绘；真实效果与互动仍待用户验收。企鹅按用户要求出现，资料说明保留其并非北极原生动物。

- **樱谷入口卡顿**：树生成转 Worker、逐张纹理上传、canvas/反射双变体预热与共享初始化 Promise 已落地；本机真实 App 最大长任务 9870→643 ms（非跨设备保证）。环境声改为独立按钮显式开启，进场不创建 AudioContext；8 项加载/音频 E2E 通过，production build 通过。
- **车顶舞蹈**：胸背白色 MUSK 几何字样、8 段侧步/屈膝/摆胯/抬臂/肩抖动作已实现；300 个采样足底不穿车顶。用户提供的 Vadoka Bayan 已剪为 138 BPM / 64 拍高潮循环；Roadster 入场直接播放，离场暂停，舞蹈随音频时钟。浏览器受限时用右上角声音按钮重试。

## 本轮交付与保留事项

- **Roadster**：主动驾驶、车内视角、冷气跃升、换漆、五检查点计时、MUSK 车顶舞蹈已实现；Neon Zenith 街景资源和归属声明已接入。集合现为 18 景，最新排序为 Roadster 第 1、清明第 2、东湖第 3，其余以当前 `paintings.ts` 为准。
- **演示视频**：12 景各 3 秒的 36 秒合集已完成，保留用户必选九景并追加敦煌、富春、桂林；1080p/30fps、1080 帧。另有 Roadster 55.7 秒独立配乐片，1670 帧。两片全解码通过，路径见 `docs/showreel-delivery-2026-10-16.md` 与 `docs/roadster-film-2026-10-16.md`。
- **集合图片检查**：新增全集合图片 E2E 已在 1440 与 390 像素宽度逐卡验证全部 18 景图片/画布，Roadster 缩略图补齐后重跑通过。另 5 项展示/乘舟测试通过。
- **字体**：最终文案重新子集化；1141 个中文字符覆盖检查通过。
- **性能**：已做本机 RTX 4060 Laptop 渲染检查；不把离线帧时当交互 FPS，手机/集显尚无真实设备性能结论。保持批次、细枝 LOD、局部模型懒加载及销毁清理。

最近复跑：全量 55 个文件、221 项测试通过，lint/typecheck/build 通过；北极桌面与手机角色点击、原彩蛋拖拽/右键/触摸回归通过。西湖白蛇盘尾、法海僧服与地面分层近景已查看；喀纳斯低岸地形和相机已修。配乐桌面/手机入场最终 E2E 通过，三处部署均已完成；地址与复核见 `docs/release-evening-2026-10-16.md`。Roadster 55.7 秒独立配乐片已完成；精选合集已扩为十二景并完成。下方旧测试数字是历史快照。

---

# 历史交接记录（原文保留）
# 交接文档：七大场景重制 + 樱花河谷集成（未完成，接手必读）

> 写给下一个接手的模型/开发者。当前仓库 **tsc 零错误、vitest 158/158 全绿**，dev server 可直接
> `npm run dev` 后访问 http://localhost:5173/ 验证。**用户已叫停的未解问题是「清明上河图屋顶瓦片瑕疵」，
> 见 §1（最高优先级）。** 所有用户口头需求原文都收录在 §6，不要凭本文件的转述自行发挥。

---

## 0. 项目背景与本次任务

- 项目：`D:\Documents\ChatGPT\3DPaint`，three.js + TypeScript + Vite + React 的「沉浸式水墨画境画廊」（入画 · WITHIN）。
  17 个可漫游 3D 画境（名画 + 自然景观），支持 展卷(scroll) / 漫游(orbit) / 步行(walk) 三种模式、配音轨、影片导出、彩蛋人物。
- 用户原始任务：
  1. 重制六个新增场景（北极/敦煌/黄山/西湖/喀纳斯/深海），要求模型精度、光影、动效、意境极致，"按照真实世界还原"；
  2. 将 https://github.com/billpwchan/sakura-fantasy （three.js 日本河谷行船：樱并木、朱红太鼓桥、五重塔街町、千本鸟居、湖上大鸟居、四季/昼夜/天气）以**原生风格复刻集成**为第 17 个场景「樱花河谷·泛舟」，与其它场景无缝一致。
- 中途追加（详见 §6）：清明房盖加高（已做）、清明瓦片修复（**未解决**）、清明人物车马要动（未做）、
  西湖人物站位（白娘子+许仙同伞在桥上、法海在远处）、北极大幅返工清单、莫高窟查真实资料还原、
  深海提亮/动感/梦幻（已做一轮待复查）、"不设文件行数上限"、"别再发 agent"（账号限流 1302，用户明确不要再派子代理）。

## 1. ⚠️ 未解问题（用户两次反馈仍未修好）：清明上河屋顶瓦片瑕疵

**现象**（用户截图：两栋临街商铺的屋檐特写）：屋檐口出现**一排等间距的小凸起/短柱状残缺**，
像"柱子穿模过房盖"。用户第一次反馈后修过一次，复检仍说"瓦片还是没修复好"。

**已尝试的修改**（都在 `src/engine/qingming.ts`）：
1. `house()` 内 `const roofHeight = w * 0.24` → `w * 0.34`（用户要求房盖加高，保留）。
2. `roof()` 内瓦垄线（curveRod）：采样点 5→9→7、末端缩进 `t*0.985`、上抬偏移 `+0.05→+0.028`、半径 `0.045→0.04`、
   curveDetail `6→8→6`。**用户复检仍未通过**。

**屋面几何原理**（`roof(g, w, d, y, h, detail)`，qingming.ts ~144 行）：
参数化曲面 `y + h*(1 - t + 0.23*t^4) + 0.13*(|x|/(w/2))^5`，t=0 是屋脊（z=0）、t=1 是檐口（z=±d/2）；
瓦垄是沿坡面的一组细杆。屋檐口的规则凸起最可能是：
- (a) 瓦垄杆在檐口的端头，坡度变陡后杆与曲面出现弦切偏差，杆身半埋/端头穿出；
- (b) 檐口角部上翘项 `0.13*(|x|/(w/2))^5` 与墙角柱（顶面 `h+0.39`）在抬坡后发生干涉；
- (c) 或根本不是瓦垄，而是檐口曲面本身的多边形/法线问题在特定光线下的碎面。
**尚未做的一步（关键）**：开浏览器把漫游相机怼到屋檐 3~5m 内逐个放大确认凸起物到底是哪类 mesh
（可在控制台用 `scene.traverse` 按 name 定位，瓦垄没有单独 name，可临时给 `curveRod` 产物加 name）。
**诊断建议**：临时给瓦垄/屋面/角柱分别用纯色高亮材质替换渲染一帧截图，一眼定位是谁穿模，再做针对性修复；
修复后必须屋檐特写截图复检，不能只跑测试。

**注意**：清明有几何预算测试 `src/engine/qingming.test.ts` 与 `qingmingBuild.test.ts`（三角形总数 < 450,000）。
瓦垄加密曾把总数顶到 465,348，当前参数（7 采样点 / detail 6:3 / 半径 0.04）刚好压回预算内。
**修改瓦垄参数后必须重跑这两个测试**。

## 2. 其余未完成任务（按用户反馈顺序）

| # | 任务 | 状态 | 备注 |
|---|---|---|---|
| 1 | 清明：人物车马动起来 | 未做 | 现在全场景静态，只有一个 morph 动画的停驻驴车（`livingActors.ts`，刻意克制）。用户明确要"人物车马应该在动"。建议新建 `qingmingLife.ts`：沿主街折线路径走 6~8 个简化行人（腿摆+起伏）、1~2 辆车沿街环路、1~2 船沿河漂（河道中心线 `qingmingRiver(x)`，从 `./cityLayout` 导入）。动画挂载可复用 Experience 的 `this.featured` 更新槽（见 §4b，该槽本质是"每场景更新函数"，qiming 也能用），或在 `loadPaintingSteps` 里 qingming 分支多加一个字段。 |
| 2 | 西湖场景整体未建 | **占位符** | `featuredXihu.ts` 目前是 9 行占位。**必须按用户指定站位**：白娘子与许仙（同撑油纸伞）在断桥上相依，法海在远处（建议南屏晚钟亭旁）。周边配套我已写好：`featuredScenes.ts` 数据、`cinematography.ts` 的 xihu 关键帧（断桥三人 0.24、雷峰塔影 0.58 等，注意"三人"镜头需改成两人+远处法海）、`viewpoints.WALK_STARTS.xihu`、地形行走掩码 `terrain.ts FEATURED_GROUND.xihu`（南岸 z>10 ∪ 桥 x -16..-1/z 1..12 ∪ 岛 (0,-28) r21）、彩蛋 `EASTER_EGG_PROFILES.xihu (-62,14)`。湖面=全局 Reflector（见 §5 红线1）。 |
| 3 | 黄山场景整体未建 | **占位符** | `featuredHuangshan.ts` 是占位。数据/光照/运镜/视点/彩蛋均已接好（见 §4a 各表）。行走掩码 `huangshan: () => 0.6`（无水，平坦山顶步道）。设计意图：云海为底（多层漂移云面）、花岗岩柱状峰林、迎客松主角(x≈-20,z≈-6)、石阶+观景平台、远山剪影。 |
| 4 | 北极返工 | 未做 | 用户反馈：①已提亮（`sceneLighting.ts` arctic 表已调）；②"背后像城池不像冰川"——我写的 7 块方盒冰崖+白色压顶读作城墙，需改为不规则倾斜冰山体（错落 serac 块、深蓝裂缝、去掉压顶条）；③北极熊细节不够（耳/眼/爪/吻部两色、比例）；④"水和冰面、熊都要有动作"——浮冰逐块起伏（近景 8~10 块改独立 Mesh 带相位 bob，远景保留 instanced）、熊缓慢踱步+头部转动、海豹翻动；⑤**用户明确要企鹅**（虽然北极真实没有企鹅，用户要求优先于真实还原）。场景代码 `featuredArctic.ts`（我写），行走地面 `snowHeight` 已导出并接入 terrain。 |
| 5 | 莫高窟还原度 | 未做 | 用户要求"去网上找资料和图片"还原真实莫高窟。现由子代理按我任务书实现（九层楼 x=-14,z=-36.5、可进入窟室 x=15 栈道、藻井、飞天飘带、驼队、星河）。需对照真实九层楼（窟檐层数/比例/配色：木构红褐、灰瓦、土黄崖体）与洞窟壁画（土红底、石青石绿赭石、千佛格、说法图）校色与调整体块。注意九层楼檐顶现在是"斗四檐顶+倾斜翘角件 instanced"，层数 9。 |
| 6 | 深海复查 | 做了一轮 | 用户反馈"太暗/蓝眼泪出不来/光效不够/动感不够/梦幻不够"。已做：`sceneLighting` deepsea 表提亮+雾推远（nightSky #062036, fog 70..320）、蓝眼泪改成连续发光河（ribbon shader）+4240→更密粒子+光斑 Sprite 呼吸、光柱 6 道加亮、水流程线条、bokeh 光斑、灯 2.6/2.2。**未复检**，用户可能还有意见。 |
| 7 | 樱花河谷 | 已建待验收 | 用户三次强调"完全 copy sakura-fantasy 的模型和动效"。现 `featuredSakura.ts`（子代理写，385 行）：两岸樱并木各26株+三色花冠、花瓣雨1600+水面漂瓣、太鼓桥、街町4栋+五重塔、千本鸟居9座+石灯笼、湖上大鸟居(z=-85)、富士山(z=-135)、舟+船夫篙、夜景（灯笼/狐火/天灯）。**未做浏览器验收**；用户曾见占位版说"丑+闪"，闪的根源（内部 Reflector 与全局共面）已修。是否还要更贴近原项目（如 Kelvin 尾迹、更多季节）需问用户。 |
| 8 | 喀纳斯 | 已建已修 | 子代理交付（木屋/白桦/湖雾/炊烟，质量好）。已修：全局 Reflector 共面闪烁（删内部水面）、行走地面接入 `kanasGroundY`、彩蛋落水（profile 改 (-57,13)）、标题换行 CSS。**未复检**。 |

## 3. 全部改动的文件（git status 实录）

修改：`src/types.ts`（PaintingId + 'sakura'）、`src/data/featuredScenes.ts`（+sakura 数据、喀纳斯水色调乳青）、
`src/data/paintings.ts`（featuredOrder + sakura=10）、`src/data/chapters.test.ts`、`src/engine/Experience.ts`、
`audioScore.ts`（+sakura 音轨）、`sceneLighting.ts`（+sakura 表、arctic/deepsea 提亮）、`cinematography.ts`
（六景+樱花各自定制关键帧，替换原先六景共用的泛用镜头）、`viewpoints.ts`、`filmTimeline.ts`、`easterEgg.ts`、
`terrain.ts`（FEATURED_GROUND 委托各场景地面函数）、`qingming.ts`（房盖 0.34 + 瓦垄两次修）、`styles.css`
（experience-title h1 加 nowrap）、`math.test.ts`、`audio.test.ts`、`easterEgg.test.ts`、`cinematography.test.ts`（16→17）。

新增：`src/engine/featuredShared.ts`（共享工具层）、`featuredWorlds.ts`（注册表）、
`featuredArctic.ts`（自写）、`featuredDunhuang.ts`（代理）、`featuredKanas.ts`（代理）、`featuredDeepsea.ts`（代理+我提亮）、
`featuredSakura.ts`（代理）、`featuredXihu.ts`（**占位**）、`featuredHuangshan.ts`（**占位**）。

## 4. 架构与契约（改场景前必读）

### a. 新增/修改一个场景要动 ALL 这些表（漏一个就是运行时/测试错误）
`types.ts PaintingId` → `data/featuredScenes.ts`（5 章节，25~45 汉字、句号结尾、subtitle /^[A-Z ]+$/、全库描述唯一）→
`data/paintings.ts featuredOrder` → `engine/sceneLighting.ts SCENE_LIGHTING` → `engine/audioScore.ts SOUND_PALETTES`
（field 只能取 audio.ts 里存在的预设：'oar'/'bird'/'drip'/'chime'/'wood'/'insect'）→ `engine/cinematography.ts`
（≥8 关键帧、首尾 progress 0/1、≥1 个 detail 且距离<65、全部镜头距离>10）→ `engine/viewpoints.ts WALK_STARTS` →
`engine/filmTimeline.ts detailShots` → `engine/easterEgg.ts`（PROFILES + ENCOUNTER_TEXT 50~90 汉字）→
测试计数：`chapters.test.ts`（17/85）、`audio.test.ts`（17）、`math.test.ts`（17 + featured 跳过 peak 断言）、
`easterEgg.test.ts`（17）。`easterEgg.test.ts` 还断言**每个彩蛋落点 groundHeight > 0.35**（见 §5 红线4）。

### b. Experience 集成点（`src/engine/Experience.ts`）
- `loadPaintingSteps()`：`isFeaturedWorld(painting)` → `buildFeaturedWorld` 加入 content，并把
  `featuredUpdate(world)`（读 `group.userData.update`）存入 `this.featured`；每帧 `tick()` 与逐帧渲染
  `renderOfflineFrame()` 里调用 `this.featured?.(this.elapsed, this.night)`。**这个槽是通用的"每场景更新函数"**，
  清明人物车马也可以挂进来（非 featured 场景该槽为 null）。
- `rebuildRiver()`：全局水面 Reflector（y=0.04，1800×1800，带实时反射）跳过清单：starry/winter/**dunhuang/huangshan/deepsea**。
  arctic/xihu/kanas/sakura 有全局水面。
- `walk()`：wadeable 清单 arctic/dunhuang/huangshan/deepsea 不做 `ground>0.15` 阻挡（无水场景全程可走地形起伏）。
- `SceneBundle` 缓存含 `featured` 更新函数，场景切换/缓存复用自动跟随。

### c. terrain.ts 行走地面（关键机制，防"人站水里/悬空"）
`FEATURED_GROUND` 表把每个 featured 场景的**行走碰撞高度委托给场景自己导出的视觉地形函数**：
arctic→`snowHeight`（z>-26 才可走，下限 0.36）、dunhuang→`duneHeight`（下限 0.36）、kanas→`kanasGroundY`（>0.5 才可走）、
deepsea→`bedHeight`、sakura→`bankHeight`（>0.4 才可走）、xihu/huangshan→解析式。
**给场景加任何地形/建筑时必须继续满足：props 落点函数 === FEATURED_GROUND 委托的函数**，否则又会出现"人站水里/悬空"。
彩蛋人物、步行模式、`findEasterEggPlacement` 全部走这条路。

### d. featuredShared.ts API（新场景的积木）
`mat(color, opts)` / `addMesh(parent, geo, mat, pos, scale)` / `canvasTexture(w,h,paint,repeat)`（种子确定）/
`glowTexture()` / `registerUpdate(root, (elapsed, night)=>{})` + `featuredUpdate(root)` /
`particleField({count,area,origin,color,size,map,additive,opacity,fall,sway,twinkle,sizeJitter})`（雪/尘/荧光，单 draw call，
**uTime 需在 registerUpdate 里手动喂**） / `petalField({...})`（billboard 花瓣/落叶，自带 uTime 但也要喂）/
`scatterInstanced(parent, geo, mat, placements[])` / `ribbonGeometry(curve, segments, width, profile?)`（飘带/极光）。
约定：ShaderMaterial 的 fragment 末尾必须 `#include <tonemapping_fragment>` + `#include <colorspace_fragment>`；
additive 效果控制亮度防全屏泛白；组内点光 ≤3~4；无模块级状态（Experience 会 traverse 整组释放）。

## 5. 红线（踩过的坑，务必遵守）
1. **禁止在场景内部再加水面 mesh**：全局 Reflector 在 y=0.04，任何共面自建水面（普通片或 Reflector）都会逐帧 z-fight 闪烁。
   喀纳斯与樱花都踩过，已删。场景需要的水色变化用 palette.water 或光照表表达。
2. **子代理已停用**：并行 7 个 agent 5 个被账号限流(1302)打死，用户明说"别发 agent 了"。剩余工作直接手写。
3. **测试是守门员**：chapters/audio/math/easterEgg 的数量与落点断言、qingming 三角形预算 450k、
   cinematography 的镜头距离规则——改完必跑 `npx vitest run src`。
4. **彩蛋选址**：`EASTER_EGG_PROFILES` 的 (x,z) 必须让对应场景 groundHeight > 0.35。沙丘/海床类场景先用 scratch vitest
   数值探测（写个临时 test 打印 duneHeight/bedHeight，跑完删）再定坐标，别猜。
5. **清明任何几何改动**都要同时看：预算测试（§1）+ 屋檐特写截图。
6. `npx tsc --noEmit` 全绿是底线；tsconfig 有 noUnusedLocals/noUnusedParameters/verbatimModuleSyntax
   （type 导入必须 `import type`）。

## 6. 用户需求原文记录（按时间序，勿转述失真）
1. "优化新增的六个场景，按照真实世界还原，光影 效果 意境达到极致，现在太差了。https://github.com/billpwchan/sakura-fantasy 这个也集成进去"
2. "要合适的集成复刻，感觉不出来和其他场景区别。那六个场景模型精度细节效果都要很好"
3. "模型 动画 动效 意境 都要到极致"
4. "多路并行 快一点"
5. "你先启动下，我看下深海"
6. "1、清明上河的房盖要高一些。2、深海 太暗了，并且体现不出来蓝眼泪，光效不够。动感不懂，梦幻不够"
7. "清明上河的还是有部分柱子穿模过房盖了，要检查修复"（附截图：屋檐一排小凸起）
8. "西湖： 白娘子和许仙在一起， 法海在远处"
9. "不设文件行数上线，快速推进"
10. "瓦片还是没修复好。而且清明上河图 人物车马应该在动啊。现在都是静态的"
11. "樱花河谷你可以完全copy 模型和动效。https://github.com/billpwchan/sakura-fantasy ，现在太丑了，而且画面闪"
12. "文字显示不对，而且人不应该在水面上"（喀纳斯截图：标题断行 + 彩蛋人物站水面——两者均已修）
13. "樱花河谷 你可以copy引入复用。"
14. "冰川太暗，而且背后像城池不像冰川。 北极熊细节不够，并且水和冰面、熊都要有动作。 还要有企鹅。"
15. "莫高窟你要还原真实的场景，去网上找资料和图片"
16. "清明上河图没有修好。停下任务吧。写交接文档，我用其他模型做"

## 7. 如何验证（视觉闭环）
- `npm run dev` → http://localhost:5173/ 。首页收藏区点卡片选场景 → 「走进画中」→ 顶部 展卷/漫游/步行。
- 本会话已有一个打开的 in-app browser 标签（停在清明画境），但 node_repl 内核不跨调用存活；
  接手后用 control-browser skill 重新 bootstrap，`browser.tabs.list()` 找 localhost:5173 标签复用。
  注意：Playwright locator 点击收藏卡片会超时（点击探针拿不到点击点），**用 `tab.dom_cua.get_visible_dom()`
  拿 ref 后 `tab.dom_cua.click({node_id})`**。
- 截图用 `nodeRepl.emitImage(await tab.screenshot())`，与调用同 cell。
- 每个场景至少：overview 一图 + hero 特写一图 + 步行模式走两步确认不悬空/不穿模。

## 8. 建议的接手顺序
1. 修清明瓦片（§1，浏览器放大定位 → 修 → 特写复检 → 预算测试）；
2. 清明人物车马（§2.1，挂 this.featured 槽）；
3. 写 xihu（§2.2，注意人物站位是用户点名要求）；
4. 写 huangshan（§2.3）；
5. 北极返工五项（§2.4）；
6. 莫高窟查资料校色（§2.5）；
7. 七景逐个浏览器截图闭环 + 深海/樱花/喀纳斯复检，10 维打分；
8. 全绿后交付总结（含未验证项诚实声明）。




# 入画 · WITHIN 项目说明

## 结构

| 目录                          | 职责                                           |
| ----------------------------- | ---------------------------------------------- |
| `src/data`                    | 画作来源、原作图像、颜色、山峰、路线、章节配置 |
| `src/engine/terrain.ts`       | 确定性山体高度场，渲染与步行共用               |
| `src/engine/props.ts`         | 树、舟、桥、亭、村落与时代建筑                 |
| `src/engine/details.ts`       | 近景岩石、草叶、芦苇及地面细节                 |
| `src/engine/modelGeometry.ts` | 枝干、弯曲构件、双坡屋顶和松冠几何             |
| `src/engine/winter.ts`        | 北欧雪地、冬树、覆雪岩块与微星天空             |
| `src/engine/materials.ts`     | 水纹、薄雾与星夜天空着色器                     |
| `src/engine/atmosphere.ts`    | 渐变天空、日月与夜间窗灯光晕                   |
| `src/engine/Experience.ts`    | 生命周期、相机、输入、渲染、影片               |
| `src/engine/resources.ts`     | 几何合批及 GPU 资源释放                        |
| `src/components`              | 对话框、预览、小地图                           |
| `src/state.ts`                | 状态默认值与本地偏好校验                       |
| `tests`                       | 桌面与手机端集成测试                           |

连续渲染由 requestAnimationFrame 驱动，React 仅接收低频状态。切换世界时释放旧几何、材质和纹理。静态建筑与通用舟船按材质合批，合并几何保留索引，树林、岩石与草叶使用 InstancedMesh。关闭引擎时释放阴影资源。

电脑与手机每次进入均使用最高画质，不读取旧的画质偏好；本次访问仍可手动切换。最高、均衡、流畅三档像素比上限分别为 1.75、1.25、0.8；流畅档关闭薄雾，最高档启用 2048 像素方向光软阴影。武汉远景枝叶与花瓣数量随档位变化，近景焦点位置保持一致。

## 画面与模型

十个世界共享控制器。青绿山体、水墨丘陵、巨峰细瀑、星夜村庄、时代城邦、北欧雪岭、汴京市井、武陵峰林、漓江与东湖桂园分别配置构图和路线。部分场景仍共用树木与建筑构件，原作逐物对应尚未完成。

近景构件包括屋顶瓦垄、窗棂、船体与桥栏、分枝松冠、苔石、草叶和芦苇。山中冬夜使用独立冬树与覆雪岩块，中心留出远望雪峰的空间。细节来自程序化几何，不是贴在地形上的照片。

日落与夜景改变天空、主光、环境光、水色和雾色；夜间暖色窗灯与冷色山影分开处理。薄雾是透明着色器层与距离雾的组合，不是体积光线追踪。阴影仅高画质开启，手机可切换均衡或流畅档。

原作识别特征、近景取舍和演绎范围见 [美术方向](ART-DIRECTION.md)。逐项缺口见 [山水三卷核对](restoration-paintings.md)与[清明上河图核对](restoration-qingming.md)；有同类模型不等于已经还原原画对应物体。

### 武汉：秋雨桂园

场景以东湖秋季桂花为主题，包含对生叶片、腋生四瓣小花、疏落花瓣、湿石接缝与雨滴水纹；小片硫华菊花境作为季节补充。桂花季节依据[武汉市政府的东湖秋景报道](https://www.wuhan.gov.cn/zjwh/whly/202410/t20241012_2467368.shtml)，花境种类参考[东湖四季赏花菜单](https://wlj.wuhan.gov.cn/zwgk_27/zwdt/xydt/202602/t20260209_2726280.shtml)。这些资料说明区域季相，不证明模型中的花木在同一地点、同一天共同盛开。

园路、亭子、岸线和植物位置为场景编排，不是桂园测绘复原。香气通过花簇、落花、雨声与文字联想表达，网页不产生实际气味。近景仍为程序化模型，材质、山形及原画逐物对应继续按核对清单修订。

### 性能与设备范围

最高画质优先呈现细节，不等于所有手机都能稳定流畅；当前不自动降档。需要降低负载时，在画境设置中切换均衡或流畅。浏览器模拟手机尺寸只验证布局和交互，不能替代真机功耗、温升与持续帧率测试。

`scripts/profile-scenes.mjs` 可记录固定视点的帧间隔、渲染调用和重复切景资源计数，结果写入已忽略的 `artifacts/performance/report.json`。它使用开发服务器，统计为 JS/驱动墙钟时间及 WebGL 计数，不是独立 GPU 时间或完整显存字节；软件 WebGL 数据不作为 60 fps 保证。运行诊断时不要并行截图或录制视频。

## 操作

进入画境后，顶部箭头切换上一景、下一景，点击当前标题打开全部十景列表，不必退回首页。切景保留播放状态、画质、声音开关与两层音量，从新景的展卷起点、首个时期开始；录制时暂不允许切景。

展卷：滚轮、左右拖动、左右方向键；空格自动游览；1—5 跳转章节。Ctrl + 滚轮、加减号或双指捏合调整远近。

漫游：左键平移，右键旋转，滚轮缩放；手机单指平移、双指缩放与旋转。

步行：WASD 或方向键，Shift 加速，点击画面锁定鼠标，Esc 退出锁定。移动端左侧摇杆移动、右侧拖动观察。地形检查限制水面和陡坡通行，当前没有完整的建筑碰撞。

V 切换视角，T 切换天色，Q 切换画质，F 全屏，H 操作说明。星月夜与山中冬夜保持夜景色调。

配乐与场景音效每次访问默认开启，首次点击或 Enter / 空格操作后启动 Web Audio；浏览器未解锁音频前不会自动出声。声音按钮可关闭两层，设置中可分别调音。选画、薄雾、速度与时代可恢复；旧本地存储键保留兼容。画质每次重置为最高，不自动恢复游览播放。

## 原作查看

七个绘画场景可打开原作查看器，支持适屏、1—8 倍放大及滚动浏览。帝国包含五个时期的五幅作品；千里、富春、清明目前提供局部，不标作完整长卷。武汉、桂林、张家界只显示实景资料来源，没有虚构的对应原画。

复制图只用于二维原作查看器，不是三维场景的贴图或建模扫描。图像延迟到查看时加载，静态站需发布 `public/originals/` 对应构建文件；图像来源、范围和许可见 [原作图像](ORIGINALS.md)。

## 配乐与场景音效

每个世界有独立旋律、速度、音色和环境声配置，定义在 `audioScore.ts`；`audio.ts` 同时供实时播放和离线影片生成使用。音色与环境声均为程序合成，不是乐器实录、实地采样或现成歌曲。

| 场景       | 声音方向                             |
| ---------- | ------------------------------------ |
| 千里江山   | 疏朗拨弦、山风、江水、远鸟与船桨     |
| 富春山居   | 慢速拨弦、江水、船桨、鸟鸣与滴水     |
| 溪山行旅   | 箫笛感长音、山风、水流、远鸟与铃声   |
| 星月夜     | 柔和键音、微风、夜虫与远铃           |
| 帝国的进程 | 低音和弦、海风、水声、木响与钟声     |
| 山中冬夜   | 稀疏钟音、寒风、木响；无流水底声     |
| 清明上河   | 轻快拨弦、低声市集、河水、船桨与木响 |
| 张家界     | 留白长音、峡谷风、水声、远鸟与滴水   |
| 桂林       | 舒缓笛音、江水、船桨、远鸟与滴水     |
| 武汉东湖   | 轻柔键音、细雨、湖水、微风与滴水     |

画境设置中可分别调节「背景音乐」与「场景音效」，任一调至 0 即静音该层。切景交叉淡出，页面隐藏时暂停，退出时关闭音频上下文。环境事件带左右声像，目前不是绑定模型位置的三维声源，也没有同步步伐的脚步声。

影片使用独立预设混音，不受网页静音按钮与音量滑块影响；导出前会明确显示这一点。离线生成的 WAV 为 48 kHz 双声道，MP4 使用 AAC，实时 WebM 使用 Opus。音频测试检查各景非静音、峰值余量、片尾淡出和上下文生命周期。

## 验证

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npx playwright test
```

集成测试需要先运行开发服务器（默认 5173）。覆盖十个世界、章节、设置、时代、模式、对话框、移动端溢出与浏览器错误。截图写入 `artifacts/screenshots`。单元测试还检查地形连续性、状态校验以及冬景实例几何的确定性与数值有效性。

### 录制与交付视频

本轮目标为 **10 个场景单片 + 1 条合集，共 11 片**，当前待交付。实际文件、探测结果和检查结论由最终交付记录补充，见 [本轮记录](RELEASE-2026-10-16.md)。

离线逐帧渲染使用开发服务器，不依赖实时帧率。需要 FFmpeg / ffprobe 在 PATH 中，或通过 `FFMPEG`、`FFPROBE` 指定路径：

```powershell
$env:OUTPUT_DIR = 'artifacts/delivery'
node scripts/render-films.mjs
node scripts/compose-films.mjs
```

`render-films.mjs` 当前默认最高画质、1920×1080、30 fps、每景 10 秒，共 300 个独立帧；可用 `PAINTINGS` 选择十景中的子集，`PORTRAIT=1` 改为 1080×1920。`DURATION`、`FPS`、`QUALITY`、`PREVIEW_URL` 可覆盖默认值，默认开发服务地址为 `http://127.0.0.1:5173`。原始帧、联系表、音轨和 `.probe.json` 写入输出目录，生成过程不与浏览器截图测试并行。

`compose-films.mjs` 只接受已验证的十个 10 秒、1080p / 30 fps 单片，每景取 3 秒，生成 30 秒合集。单片参数改变后，不能直接沿用该合集脚本的固定验收条件。

网页上的实时 WebM 导出独立保留，目标时长 24 秒，帧率取决于设备。历史脚本 `record-films.mjs` 与 `convert-films.ps1` 仍仅列出原九景，不用于本轮十景交付。MP4 编码为 H.264 / yuv420p，声音为 AAC；容器帧率不等于原始运动质量，验收仍需播放成片、查看镜头和音轨。

## 字体

标题与衬线正文使用自托管的 Noto Serif SC 字符子集，文件为 `public/fonts/landscape-serif.woff2`，CSS 字体名为 `Landscape Serif`。无需请求 Google Fonts 或其他远程字体服务。源字体来自 [Google Fonts 的 Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc)，按 SIL Open Font License 1.1 分发；完整许可证保留在 `public/fonts/OFL.txt`。

修改中文文案后，重新生成子集，避免新增字符回退到系统字体：

1. 从上述源目录下载 `NotoSerifSC[wght].ttf`，保存为 `artifacts/font-source/NotoSerifSC.ttf`。
2. 安装 Python 构建依赖并执行脚本：

```sh
python -m pip install fonttools brotli
python scripts/subset-font.py
npm run build
```

脚本收集 `src` 下 `.ts`、`.tsx`、`.css` 内的字符和基础拉丁字符，输出 WOFF2。提交新字体时保留 OFL 文件；原始大字体放在已忽略的 `artifacts`，不必提交。

## 发布

前端是静态应用，不需要服务端或 GPU 服务器。Vite 使用相对资源路径，可部署到子目录。

发布入口（本轮变更发布前需重新验证）：

- [GitHub Pages](https://fatasia.github.io/within/) 是持续发布入口，`main` 提交通过检查后由 Actions 更新。具体在线版本以仓库最新成功的 Pages 工作流为准。
- 仓库已由 `fatasia/shanshui-atlas` 重命名为 [`fatasia/within`](https://github.com/fatasia/within)，保留原提交历史。新 Pages 路径 `/within/` 返回 200；旧 `/shanshui-atlas/` 实测返回 404，不提供自动跳转。
- CloudBase 使用 `/within/`，旧 `/shanshui/` 预览保留，根目录不修改。默认测试域名会显示平台访问提示，普通 HTTP 请求带 `Content-Disposition: attachment`。本轮包含新增原作图，发布时必须随构建上传。
- 当前发布为预览更新，不代表原画细节或视觉效果已获验收。

GitHub Pages：工作流 `.github/workflows/pages.yml` 在 `main` 提交后运行检查并发布 `dist`。仓库 Pages 来源选择 GitHub Actions。

CloudBase：目标环境 `local-d8gckl1vx0d145939`，发布子目录 `/within/`，不修改根站点。需要已登录并开通静态托管：

```sh
npm exec --yes --package=@cloudbase/cli@3.8.7 -- tcb hosting deploy ./dist within -e local-d8gckl1vx0d145939 --safe --verify --json
```

CLI 3.8.7 的 `--verify` 对带前导斜杠的路径存在 manifest 键不一致问题，命令使用 `within`，实际 URL 为 `/within/`。只上传构建完成的 `dist`，不使用 `--prune`，不修改托管根目录。项目路径为 `https://local-d8gckl1vx0d145939-1321978125.tcloudbaseapp.com/within/`。

默认域名的提示页与附件响应属于[平台访问规则](https://docs.cloudbase.net/service/alias)；正式对外使用应另行配置自定义域名。当前未绑定或修改任何自定义域名。

不要把凭证、参考视频、录制产物或 node_modules 提交到仓库。无需将 CloudBase SDK 注入前端。

发布后分别检查首页、JavaScript、WOFF2 的 HTTP 状态和 MIME 类型，并在实际子目录打开十个世界。首页返回 200 不等于资源路径、字体和 WebGL 场景正常。

## 原作来源与演绎范围

- [千里江山图 · 故宫博物院](https://www.dpm.org.cn/collection/paint/228354.html)
- [富春山居图 · 台北故宫](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000975)
- [溪山行旅图 · 台北故宫](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000959)
- [星月夜 · MoMA](https://www.moma.org/collection/works/79802)
- [帝国的进程 · The New York Historical](https://emuseum.nyhistory.org/objects/56323/the-course-of-empire-the-arcadian-or-pastoral-state)
- [山中冬夜 · 挪威国家博物馆](https://www.nasjonalmuseet.no/en/collection/object/NG.M.01185)

游览路线与地理空间为创作性重建。水路、亭桥和村落用于构建体验，不主张每件物体均一一对应原画。星月夜天空为程序化笔触演绎；帝国各时代用建筑、残柱与碎石表达变化，不含完整战争人物动画。山中冬夜保留雪岭、冬树与微星，不加入极光或城镇。水面使用平面场景反射，不是路径追踪。人物与动物动态为预设循环，不含完整城市人群仿真；当前没有在线生成模型服务。

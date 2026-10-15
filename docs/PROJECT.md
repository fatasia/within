# 项目说明

## 结构

| 目录                          | 职责                                 |
| ----------------------------- | ------------------------------------ |
| `src/data`                    | 画作来源、颜色、山峰、路线、章节配置 |
| `src/engine/terrain.ts`       | 确定性山体高度场，渲染与步行共用     |
| `src/engine/props.ts`         | 树、舟、桥、亭、村落与时代建筑       |
| `src/engine/details.ts`       | 近景岩石、草叶、芦苇及地面细节       |
| `src/engine/modelGeometry.ts` | 枝干、弯曲构件、双坡屋顶和松冠几何   |
| `src/engine/winter.ts`        | 北欧雪地、冬树、覆雪岩块与微星天空   |
| `src/engine/materials.ts`     | 水纹、薄雾与星夜天空着色器           |
| `src/engine/atmosphere.ts`    | 渐变天空、日月与夜间窗灯光晕         |
| `src/engine/Experience.ts`    | 生命周期、相机、输入、渲染、影片     |
| `src/engine/resources.ts`     | 几何合批及 GPU 资源释放              |
| `src/components`              | 对话框、预览、小地图                 |
| `src/state.ts`                | 状态默认值与本地偏好校验             |
| `tests`                       | 桌面与手机端集成测试                 |

连续渲染由 requestAnimationFrame 驱动，React 仅接收低频状态。切换世界时释放旧几何、材质和纹理。静态建筑按材质合批，树林、岩石与草叶使用 InstancedMesh。画质控制像素比，流畅档关闭薄雾；高画质启用 2048 像素方向光软阴影。

## 画面与模型

十个世界共享控制器。青绿山体、水墨丘陵、巨峰细瀑、星夜村庄、时代城邦、北欧雪岭、汴京市井、武陵峰林、漓江与东湖桂园分别配置构图和路线。部分场景仍共用树木与建筑构件，原作逐物对应尚未完成。

近景构件包括屋顶瓦垄、窗棂、船体与桥栏、分枝松冠、苔石、草叶和芦苇。山中冬夜使用独立冬树与覆雪岩块，中心留出远望雪峰的空间。细节来自程序化几何，不是贴在地形上的照片。

日落与夜景改变天空、主光、环境光、水色和雾色；夜间暖色窗灯与冷色山影分开处理。薄雾是透明着色器层与距离雾的组合，不是体积光线追踪。阴影仅高画质开启，手机可切换均衡或流畅档。

原作识别特征、近景取舍和演绎范围见 [美术方向](ART-DIRECTION.md)。逐项缺口见 [山水三卷核对](restoration-paintings.md)与[清明上河图核对](restoration-qingming.md)；有同类模型不等于已经还原原画对应物体。

## 操作

展卷：滚轮、左右拖动、左右方向键；空格自动游览；1—5 跳转章节。Ctrl + 滚轮、加减号或双指捏合调整远近。

漫游：左键平移，右键旋转，滚轮缩放；手机单指平移、双指缩放与旋转。

步行：WASD 或方向键，Shift 加速，点击画面锁定鼠标，Esc 退出锁定。移动端左侧摇杆移动、右侧拖动观察。地形检查限制水面和陡坡通行，当前没有完整的建筑碰撞。

V 切换视角，T 切换天色，Q 切换画质，F 全屏，H 操作说明。星月夜与山中冬夜保持夜景色调。

声音在用户点击后启动，通过 Web Audio 本地合成。偏好只存储选画、画质、薄雾、速度与时代，不自动恢复声音或播放。

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

**当前暂停视频制作，待画面获确认后再录制。** 下列命令仅保留使用说明；现有批量脚本只覆盖原九景，尚未加入武汉，不代表十景影片已经生成或验收。

先启动开发服务器，再运行以下命令。录制时不要同时运行浏览器截图测试，避免争用 GPU。

最终交付使用离线逐帧渲染，不依赖机器实时帧率：

```powershell
node scripts/render-films.mjs
```

默认每幅 24 秒、24 fps，共渲染 576 个独立 JPEG，再与 48 kHz 双声道场景音轨合成为 H.264 / AAC MP4。时间与相机进度按帧推进，渲染慢只会延长生成时间，不会丢帧。脚本在独立空白页面运行一个引擎，包含字体加载、逐帧有效性检查、最终 ffprobe 核验与六帧联系表。源 JPEG 保留在 `artifacts/videos/frames`，可重新编码。

`PAINTINGS`、`QUALITY`、`PORTRAIT`、`OUTPUT_DIR`、`PREVIEW_URL` 同样适用于离线脚本；另可设置 `DURATION` 和 `FPS`。例如 `$env:PAINTINGS='winter'; $env:FPS='30'; node scripts/render-films.mjs`。默认链接为本地开发服务，线上静态站不提供 `/src` 模块，不能代替开发服务。

页面上的实时导出保留给交互录屏：

```powershell
node scripts/record-films.mjs
./scripts/convert-films.ps1
```

录制脚本通过页面按钮依次导出九段目标时长 24 秒的 WebM；转码脚本生成 H.264、yuv420p、30 fps、faststart MP4，同时用 ffprobe 检查实际时长、分辨率和编码。每段输出六帧联系表和 `.probe.json`，保存在 `artifacts/videos`。WebM 包含场景配乐和音效，转码保留为 AAC 音轨。

只重录指定画作，或输出手机竖屏：

```powershell
$env:PAINTINGS = 'qianli,winter'
$env:PORTRAIT = '1'
$env:QUALITY = 'balanced'
node scripts/record-films.mjs
./scripts/convert-films.ps1 -Paintings qianli,winter -Portrait
Remove-Item Env:PAINTINGS, Env:PORTRAIT, Env:QUALITY
```

`PAINTINGS` 支持 `qianli,fuchun,xishan,starry,empire,winter,qingming,zhangjiajie,guilin`；`PORTRAIT=1` 生成 `-portrait` 文件，不覆盖横屏。`QUALITY` 可选 `high`、`balanced`、`low`，默认均衡。`PREVIEW_URL` 可指定预览站，`OUTPUT_DIR` 可指定录制目录；转码另有 `-InputDirectory`、`-OutputDirectory` 参数。

MediaRecorder 的真实采样率取决于设备。`.probe.json` 同时保留源帧数、源平均帧率及转码帧率；低于 20 fps 会给出重录提示。转为 30 fps 不会把低帧率素材变流畅。验收应检查联系表的构图，再实际播放 MP4 检查运动，不能只看容器帧率。

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

发布状态（2026-10-16）：

- [GitHub Pages](https://fatasia.github.io/shanshui-atlas/) 是持续发布入口，`main` 提交通过检查后由 Actions 更新。具体在线版本以仓库最新成功的 Pages 工作流为准。
- CloudBase 已上传本轮十景预览至 `/shanshui/`，9 个构建文件一致性校验通过；首页、JS、CSS、WOFF2 均返回 200，MIME 正确。默认测试域名会显示平台访问提示，普通 HTTP 请求带 `Content-Disposition: attachment`。实际浏览器点击“确定访问”后已验证十景选择页与武汉近景加载。
- 下一次发布为预览更新，不代表原画细节或视觉效果已获验收。

GitHub Pages：工作流 `.github/workflows/pages.yml` 在 `main` 提交后运行检查并发布 `dist`。仓库 Pages 来源选择 GitHub Actions。

CloudBase：目标环境 `local-d8gckl1vx0d145939`，发布子目录 `/shanshui/`，不修改根站点。需要已登录并开通静态托管：

```sh
npm exec --yes --package=@cloudbase/cli@3.8.7 -- tcb hosting deploy ./dist shanshui -e local-d8gckl1vx0d145939 --safe --verify --json
```

CLI 3.8.7 的 `--verify` 对带前导斜杠的路径存在 manifest 键不一致问题，命令使用 `shanshui`，实际 URL 仍为 `/shanshui/`。只上传构建完成的 `dist`，不使用 `--prune`，不修改托管根目录。项目路径为 `https://local-d8gckl1vx0d145939-1321978125.tcloudbaseapp.com/shanshui/`。

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

游览路线与地理空间为创作性重建。水路、亭桥和村落用于构建体验，不主张每件物体均一一对应原画。星月夜天空为程序化笔触演绎；帝国各时代用建筑、残柱与碎石表达变化，不含完整战争人物动画。山中冬夜保留雪岭、冬树与微星，不加入极光或城镇。水面使用平面场景反射，不是路径追踪。当前不包含复杂人物行为或在线生成模型服务。

# Roadster · 赛博雨夜试场

已接入的第 18 个场景，收藏顺序为 Roadster、清明上河图、桂雨东湖，冰川之后依次为樱花、深海、西湖，其余保留相对顺序。

## 来源与范围

车身依据用户提供的 2026 款官方正侧、前后 3/4 与座舱截图重建，参考入口为 [Tesla 中国 Roadster](https://www.tesla.cn/roadster/reserve#payment)。采用低楔形车身、黑色贯穿灯带、双座玻璃舱、真实留空轮拱及五辐轮毂，不使用旧版红色原型车轮廓。程序化模型不是官方 CAD。

按用户后续要求，场景改为虚构的霓虹雨夜试场；冷气短跃为幻想互动，不是量产能力或实测性能。

## 操作

- PC：W/↑ 油门，S 倒车，A/D 或 ←/→ 转向，Shift/↓ 刹车。
- 手机：方向、油门、刹车、倒车按钮可按住；转向与油门支持同时触控。
- 五种车漆即时更换；冷气跃升在 2.2 秒内升起落地，吸附按钮短时改变转向响应并驱动尾翼与贴地薄雾。
- 跟车、环视、驾驶席三种视角；时间轴仍可播放编排路线。主动驾驶输入接管路线，拖动时间轴恢复路线演示。
- 重置视角返回起点；失焦、切场景或退出时释放输入。车轮按累计路程转动，试场边界停车，车底不低于路面。

## Neon Zenith 街谷

实看并研究 [Neon Zenith](https://github.com/billpwchan/neon-zenith) 的 market/canyon 效果、env/facadekit/shopkit/runs 源码和许可。已复用其香港商铺与低模立面模块：凹窗、门框、空调、店内货架与招牌均为实际几何/材质，不是新增几根灯条。远景采用有层次的退台体块和照片立面，近景增加电缆、中文悬挑招牌。完整素材归属与改动见 [资源署名](../public/assets/neon/README.md)。

MIT HDR 霓虹环境生成器适配为 WebGL PMREM，供金属漆、玻璃和湿路面使用。未移植整套 WebGPU 渲染器或约 57 万三角的整街资产；远景 atlas 缩为 512×4096，近处立面/商铺静态合批。

新增五道检查点的顺序计时冲刺，支持重开和本次场景最佳纪录；车顶马斯克玩偶可切换舞蹈并随车跃升，脚底高于玻璃顶面。人物是戏仿玩偶。

## 实现与预算

`roadsterModel.ts` 的车体为 18,322 三角形、33 个 Mesh；同材质静态零件与各车轮分别合批。漆面使用金属度、清漆层和 PMREM 环境反射，不用自发光代替漆面。

雨线与路面光带使用简单 shader；没有 SSR、全屏泛光或多重后期。低档减少雨线并关闭两盏局部点光；三档沿用应用分辨率与阴影设置。环境贴图随场景释放。

## 已运行检查

- `npm run typecheck` 通过；全 src 单测 49 文件、198 项通过（2026-10-16 本轮检查）。
- Roadster 6 项专用单测通过（新增车顶舞蹈与顺序计时冲刺）：几何与预算、路线连续、主动驾驶/刹车/边界、短跃落地/输入释放。
- `scripts/review-roadster.mjs` 六个实际渲染角度无浏览器错误；Neon 版本完整高档约 10.8 万渲染三角形、98–114 draw call（含阴影，模型精修前）；开启舞蹈约 11.6 万三角形。
- `scripts/check-roadster-ui.mjs` 验证 390×844 与 1440×900：按住油门可加速、换漆和短跃可触发；没有横向溢出或 JS 错误；新增交互按钮均至少 44px。截图与数据在 `artifacts/roadster-review/`。
- `tests/collection-order.spec.ts` 桌面与手机顺序检查通过。实际帧率受设备影响，本轮没有跨设备 60fps 实测结论。

## 统一视频接口

先等待 `await Promise.all(e.content.children.map(o=>o.userData.ready))` 完成街景加载，然后调用 `renderOfflineFrame(0, 0, view)`，再 `triggerRoadster('boost')`，随后按 `time=frame/30` 渲染 3 秒即可包含升起和落地。

推荐固定镜头：`eye=[-5.6,3.3,-7.4]`，`target=[0,2,0]`。普通路线镜头由 `sampleRoadsterMotion(progress,time)` 返回；`setRoadsterPaint(hex)` 可在录制前指定颜色。

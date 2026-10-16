# 极地与深海视觉复核 · 2026-10-16

本轮修复的是光照、连续形体、动态和镜头可见性；动物仍为轻量程序化模型，不等同于扫描模型。

## 已改

- 北极熊：连续躯干与颈部放样、加宽短吻、压扁鼻、缩小圆耳、增加眼眶；保持四肢/脚掌独立关节。皮毛噪点缩小并加 mipmap，避免近景棋盘状毛皮。
- 动物互动：24 秒循环，企鹅靠近、熊俯首抬前掌、企鹅扑翅小跳退开，然后停歇。两只企鹅参与互动，其余三只摇摆踱步。它们是用户指定的南北极意象组合，不是野外共生复原。
- 冰面：连续内陆冰盖接入破裂终碛前缘，38 块不等高斜顶冰体替代 63 根近似等高冰柱；浮冰独立升降/侧倾，浮冰上的熊和海豹继承整体姿态。已着地的冰川不整体漂浮。
- 极光：四条不同宽度的折返曲线，三维多频摆动、不等距噪声射线、上缘淡出；第四条在冰川后方地平线以上。雪分成远景 1300 粒和近景 250 粒。
- 深海：鲸从方头加圆锥改成连续头尾放样，海床扩大到 400×300，光带首尾淡出；水母使用连续周期升降，水流线按绝对时间取样，导出不再依赖调用次数。

## 核对依据

- [Polar Bears International：形态与适应](https://www.polarbearsinternational.org/polar-bears/polar-bear-facts/adaptations-characteristics/)：长颈、厚实躯干、小圆耳、短尾、宽大足掌；参考由主任务核对。
- [NASA 极光图解](https://pwg.gsfc.nasa.gov/polar/SenRev2003/graphics/EPO/aur_final.pdf)：有射线的弧与折叠光带；参考由主任务核对。

## 验证

运行：

```powershell
node node_modules/vitest/vitest.mjs run src/engine/polarScenes.test.ts
node node_modules/typescript/bin/tsc --noEmit
node scripts/review-polar.mjs
node scripts/review-polar-ui.mjs
```

4 项测试验证循环连续、独立骨架、浮冰动态、第四条极光、鲸几何有限值、深海动画绝对时间重放。TypeScript 与修改文件 ESLint 通过。

截图在 `artifacts/polar-review/`：含 0/9/12/18 秒极光与动物互动对照，以及真实首页和入画 UI。真实 UI 发现时间轴遮动物后，重新调整 overview 下视角与主体横向位置；主任务负责把镜头参数接入数据。

1600×1000、Chrome D3D11、逐帧 gl.finish GPU 同步的离屏样本（7 次，含反射；北极每帧更新阴影）为北极全景 median 16.5ms / max 21.7ms，互动 14.4ms / 16.3ms；深海宽景 14.6ms / 17ms，鲸近景 13.8ms / 14.9ms。该数值不等于浏览器交互 FPS，不代表移动设备性能。完整数据为 `artifacts/polar-review/metrics.json`。

## 镜头

- 北极首页：eye `[-4,11,48]`，target `[-9,7,-30]`，让动物避开底部时间轴。
- 北极互动/3 秒片段：eye `[-3,5.3,27]`，target `[-11,1.6,12]`，elapsed 8→11。
- 深海鲸鱼/3 秒片段：eye `[52,23,50]`，target `[37,14,-3]`，elapsed 10→13。
- 深海宽景：eye `[15,25,94]`，target `[20,12,-20]`。

## 追加：追逐、踢球、打雪仗

48 秒动物循环的后半段加入分离椭圆追逐：熊横向移动超过 8 米，企鹅先领跑，路径反向后由企鹅追熊。前三者轨迹在采样测试中始终保留熊/企鹅 >3 米、企鹅间 >0.8 米的中心间距。

两只企鹅按 8 秒节奏左右踢球，脚伸出与球离脚时刻一致，球转角按位移/半径计算。第 5 只企鹅交替投出雪球；雪球从鳍肢末端起飞、沿抛物线落在对方侧前方，接球者后撤低头，18 个实例化碎雪粒落地散开。投掷没有伤害表现。

新增 `arcticGames.ts`，纯动画采样放在 `arcticPlay.ts`。`polarScenes.test.ts` 共 6 项测试通过；新增测试每 0.05 秒采样 48 秒轨迹，检查间距和位移连续，另测脚球时序、雪球抛物线与落地状态。TypeScript 与相关文件 ESLint 通过。

实际验证：`node scripts/review-polar-games.mjs`，输出到 `artifacts/polar-games/`，11 张关键帧、无浏览器错误、12 秒 WebM。录像前 4 秒是踢球/投球实时速度，后 8 秒是追逐 2 倍速度，便于看完整角色互换。

- 踢球/投球镜头：eye `[8,4.4,24]`，target `[6.5,1.2,13]`，elapsed 0→4。
- 追逐镜头：eye `[-3,6.5,31]`，target `[-13,1.5,15]`，elapsed 27→43。

后续集成已修复 Roadster 并行接口错误；Roadster 车壳与 Arctic 交互根回归合计 14 项通过，全局 TypeScript 检查通过。


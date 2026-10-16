# 精选合集与预览验收

## 最终版本：十二景 36 秒

用户确认九景是必留、非总数限制后，新增 **敦煌莫高窟、富春山居、桂林漓江**，其余九段保持原片。未加入近景表现较重复的黄山/张家界。

最终文件：`artifacts/showreel-2026-10-16/within-selected-36s.mp4`，约 **36.3 MB**。12 景各 90 帧 / 3 秒，ffprobe 实测 **1080 帧**、30fps、1920×1080；容器时长 **36.021333 秒**，AAC 尾部填充 0.021333 秒。完整解码无错误，新增三景首中末检查通过。最终接触表为 `final-contact-sheet-12.jpg`，`delivery.json` 对应此 36 秒版。

脚本现在要求九个指定场景必有，允许加入其他有效场景，拒绝重复或未知 ID；每段仍强制 90 帧。

## 保留版本：九景 27 秒

成片：`artifacts/showreel-2026-10-16/within-selected-27s.mp4`。九景各 90 帧 / 3 秒，1920×1080、30fps、H.264 / AAC，文件约 33.1 MB。

顺序：Roadster、清明上河、桂雨东湖、星月夜、山中冬夜、北极冰川、樱谷行舟、深海蓝眼泪、西湖雨后。

- Roadster 使用新车壳、霓虹街谷与 MUSK 车顶舞蹈。舞蹈与用户提供的 Vadoka Bayan 高潮均从第 6 拍（2.608696 秒）开始，节奏 138 BPM；没有沿用旧合成配乐。
- 北极选 33–36 秒追逐段，熊与企鹅均在画面内；樱花保留跟船运动，将视频镜头后移以同时容纳桥、树冠和倒影。
- 清明使用最新虹桥—城门布局；西湖用修复后的连续白蛇尾和抬高铺路石，近景首、中、末未见原条纹闪。
- 18 个场景预览全部重新渲染，共 26 张 WebP（含 8 张独立横版缩略图）；生成过程等待异步资源，无浏览器错误。

## 验证结果

逐片 `ffprobe -count_frames` 均为 90 帧、3.000000 秒。成片为 **810 帧**，视频时间 27 秒；容器时长 **27.021333 秒**，差值是 AAC 尾部填充。完整 FFmpeg 解码无错误。逐景首/中/末帧及九宫格已目视检查，见 `*-filmstrip.jpg`、`final-contact-sheet.jpg`，机器记录见 `delivery.json`。

画面仍是轻量三维场景，程序化人物和地貌不是摄影级资产。此片检查构图、主体完整性、动作可见性与文件有效性，不等同于真实设备全量性能验收。

## 复现

在 5173 开发服务启动后，修改 `artifacts/showreel-2026-10-16/selection.json` 选择镜头。

```powershell
$env:FFMPEG='D:/Soft/ffmpeg-8.0-essentials_build/bin/ffmpeg.exe'
$env:FFPROBE='D:/Soft/ffmpeg-8.0-essentials_build/bin/ffprobe.exe'
node scripts/render-showreel.mjs --audit
node scripts/render-showreel.mjs
node scripts/render-previews.mjs
```

分批渲染使用 `PAINTINGS='roadster,xihu'` 配合 `--clips-only`；清除该环境变量后 `--assemble-only` 合并所选片段，脚本强制检查九景必留与每段 90 帧。脚本等待 `ready` / `sakuraAssetsReady`，资源或 Shader 出错会中止。

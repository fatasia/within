# GitHub Pages Roadster 入场诊断

地址：<https://fatasia.github.io/within/>。本次只检查 Roadster，不修改产品或部署配置。

首次快速检查从默认千里江山切换 Roadster，等待 60 秒仍显示“正在展开”。随后按单次诊断方案，将本地偏好设为 Roadster 后直接访问：约 7.0 秒进入试场，9.0 秒记录结果。此前超时未复现，当前证据不足以归因为代码、网络或 GPU 竞争。

- Experience 动态 chunk：HTTP 200，4.80 秒完成。
- `shops.glb` / `kit_proc.glb`：HTTP 200，约 6.45 秒完成。
- 音乐：HTTP 206，正常媒体 Range 响应，不是 404。
- 页面错误和失败请求：均无；只有 D3D shader 浮点精度警告，无 shader 编译失败。
- 9 秒截图中车体和驾驶 UI 已显示，城市贴图仍加载，不能用该图确认完整街景。当时 `facade_albedo.webp` 已返回 200、传输尚未完成；其后 curl 同 URL 返回 200，836,204 字节，用时 2.016 秒。

完整请求与 console 记录：`artifacts/deployment/github-roadster-diagnostic.json`。
截图：`artifacts/deployment/github-roadster-diagnostic.png`。
可重跑诊断：`node scripts/diagnose-github-roadster.mjs`。

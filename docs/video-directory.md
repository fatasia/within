# 视频录制

README 的四个视频使用 GitHub 原生附件，可直接播放。为控制附件体积，合集和清明预览为 1080p，Roadster 为 720p，东湖为 540p；全部保留完整时长与声音。1080p 原始成片保存在 [Releases](https://github.com/fatasia/within/releases)。

## 准备

安装 FFmpeg / ffprobe 并加入 PATH，执行 `npm ci`、`npx playwright install chromium`，再启动 `npm run dev`。

脚本通过 `PREVIEW_URL` 连接开发服务器。PowerShell 示例：

```powershell
$env:PREVIEW_URL = 'http://127.0.0.1:5173'
$env:OUTPUT_DIR = 'artifacts/films'
```

## 脚本

| 目标 | 命令 |
| --- | --- |
| 通用单景 | `node scripts/render-films.mjs` |
| 清明晴昼暮夜 | 设置 `LIGHTING=1`，执行 `node scripts/render-qingming-film.mjs` |
| Roadster | `node scripts/render-roadster-film.mjs` |
| 东湖完整游览 | `node scripts/render-wuhan-film.mjs` |
| 东湖短片 | `node scripts/render-wuhan-film.mjs --short` |
| 精选合集 | `node scripts/render-showreel.mjs --audit`，在输出目录的 `selection.json` 中选择镜头，再执行不带 `--audit` 的命令 |

可通过 `FFMPEG`、`FFPROBE` 指定可执行文件。各脚本的输出目录可用 `OUTPUT_DIR` 覆盖。录制产物留在 `artifacts/`，不提交原始帧、音轨、中间文件或验收报告。

离线渲染逐帧推进引擎，不代表设备实时帧率。发布前检查视频尺寸、帧数、音轨和首中末画面，并完整解码一次。网页实时 WebM 导出独立保留。

## 更新 README 视频

将压缩后的 MP4 上传到 GitHub Markdown 编辑器，复制生成的 `github.com/user-attachments/assets/…` 地址，单独放在 README 的一个段落中。不要用图片链接代替播放器。

附件与仓库中的 MP4 独立存储；重新录制后需重新上传附件。发布后逐个确认播放器能够播放、时长正确，并执行 `node scripts/check-showcase.mjs`。

# Roadster 独立演示片

文件：`artifacts/roadster-film-2026-10-16/roadster-full.mp4`，55.667 秒、1920×1080、30fps、1670 帧，H.264 / AAC，约 53.7 MB。

八段镜头依次展示环视、三色换漆、油门驾驶、车内视角、抓地转向、冷气短跃、MUSK 舞蹈和城市拉远。车辆由实际输入与场景更新函数推进；短跃是场景中的幻想演示，不是车辆实测性能。

配乐使用用户提供的 Vadoka Bayan 高潮，138 BPM 的 64 拍循环两次；舞蹈跟随同一音频时间。浏览器无错误，ffprobe 计帧和 FFmpeg 全片解码通过，实际成片首、中、末帧已检查。

复现：开发服务在 5173 运行，FFmpeg / ffprobe 在 PATH 后运行 `node scripts/render-roadster-film.mjs`。`--audit` 只输出关键帧与驾驶轨迹记录，不编码全片。

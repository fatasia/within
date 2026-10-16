# Roadster 音乐

仅 Roadster 使用用户提供的《Vadoka Bayan (Vodka Fisa)》高潮片段；进入场景播放，离开暂停，其他场景音轨不变。

## 素材与裁剪

- 来源：用户本地 `D:/Download/121246/Lesi Ortestral - Vadoka Bayan (Vodka Fisa).mp3`，320 kbps、44.1 kHz、双声道，原长 298.492517 秒。
- 输出：`public/audio/roadster-vadoka-chorus.mp3`，192 kbps、669,691 字节；从 44.1585 秒强拍起裁取 64 拍，实测时长 27.826077 秒。响度目标 −16 LUFS / −1.5 dBTP。
- 节奏：138 BPM，低频瞬态包络的连续频率搜索峰值为 138.00 BPM；舞蹈以音频当前时间为时钟，不能另开计时器。
- 参考：[用户指定的马斯克舞蹈视频](https://www.bilibili.com/video/BV1me411V7nA/)。页面曲目标注为 `Vadoka Bayan(Vodka Fisa) (Pettinanza Extended)`；本地同名 `.flac` 的内嵌标签也有该版本名，但实际容器是 Ogg/Vorbis，不是无损 FLAC。未取得参考视频的可比对音轨，最终按用户指示使用本地 MP3。

截取点按整拍长度保留，首尾仅做 8 / 10 毫秒去点击淡变，不交叠整拍。循环文件依靠 MP3 gapless 元数据，不把编码器填充当作节拍时长。素材来自用户，不归入项目代码许可证；公开发布时须自行确认音乐使用权。

## 接口

`src/engine/roadsterMusic.ts` 的 `createRoadsterMusic()` 构建时不发声、不预载。场景入场点击中直接调用 `play()`，它在第一个 `await` 之前请求浏览器播放；若返回 `blocked`，显示一键开启按钮。

- `state`：`idle / loading / playing / paused / blocked / error / disposed`。
- `play()` 返回 `{ state, error? }`；`pause()` 保留当前位置；`dispose()` 暂停并释放媒体来源，卸载时调用。
- `currentTime` / `getBeat()`：媒体秒数 / 拍数；舞蹈更新直接使用 `currentTime`。
- `setVolume(0…1)`：默认 0.48；不改变其他场景的声音状态。

录像若以舞蹈 `elapsed = 2.9…5.9` 秒渲染，配乐也应截本循环的 `2.9…5.9` 秒，以保持相位一致。

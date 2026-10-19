# Roadster 音乐

Roadster 使用《Vadoka Bayan (Vodka Fisa)》的剪辑片段，文件为 `public/audio/roadster-vadoka-chorus.mp3`。该音乐不是项目原创，不包含在代码的 MIT 授权中；再分发或其他用途需单独核实音乐权利。

音频为 192 kbps MP3，时长约 27.826 秒，节奏为 138 BPM。进入 Roadster 后尝试播放，离开场景暂停，其他场景使用各自的合成音轨。

`RoadsterMusic` 管理播放、音量和循环。舞蹈使用音频 `currentTime` 对齐节拍；离线录制应按相同时间段截取音轨，避免动作与音乐错位。

# 入画 · Living Landscapes

一座用 Three.js 实时生成的风景画馆，在电脑和手机上游览十个绘画与实景世界。

- 七个绘画世界，加上张家界、桂林与武汉东湖，各有地形、配色和章节。
- 展卷、自由轨道漫游、陆地步行；章节导航、小地图、远近景自动游览和触控摇杆。
- 冷暖夜景、流动薄雾、近景模型、高画质阴影与自托管中文宋体。
- 帝国的五个时代切换会改变建筑，不只是改变画面颜色。
- 每景独立配乐与场景音效、分轨调音，取景保存和带声音的 24 秒 WebM 导出。

## 启动

需要 Node.js 22.12+。

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm test
npm run build
npm run preview
```

当前为开发预览，原画逐物对应仍在核对。所有模型和选择页预览均由程序生成；无馆藏图像贴图、无远程模型依赖、无分析跟踪。

原作核对与缺项见 [山水三卷](docs/restoration-paintings.md)和[清明上河图](docs/restoration-qingming.md)。视频交付暂停，待画面确认后再录制。

架构、操作、音频、字体再生成和部署见 [项目文档](docs/PROJECT.md)；场景取舍见 [美术方向](docs/ART-DIRECTION.md)。

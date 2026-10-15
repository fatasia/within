# 入画 · WITHIN

一座用 Three.js 实时生成的风景画馆，在电脑和手机上游览十个绘画与实景世界。

[打开预览](https://fatasia.github.io/within/)

- 十个场景：七幅绘画题材，以及张家界、桂林、武汉东湖。
- 展卷、漫游、步行适配电脑与手机；自动游览包含近景，场景内可直接切换上一景、下一景或全部列表。
- 每次进入默认最高画质，可手动降档；昼夜、薄雾与人物、草木动态按场景设置。
- 七画原作查看器，可放大对照；帝国五幅齐全，长卷局部明确标注。
- 配乐与场景音效默认开启，首次点击后发声；支持分别调音、静音和取景保存。

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

当前为开发预览，构图与模型是三维演绎，原画逐物对应仍在核对。三维模型和选择页预览由程序生成，不把馆藏照片贴成场景；原作查看器另载真实作品复制图，来源与许可见 [原作图像](docs/ORIGINALS.md)。

原作核对与缺项见 [山水三卷](docs/restoration-paintings.md)和[清明上河图](docs/restoration-qingming.md)。视频交付目标为十景单片与一条合集，共 11 片；当前交付状态见 [本轮记录](docs/RELEASE-2026-10-16.md)。

架构、操作、音频、字体再生成和部署见 [项目文档](docs/PROJECT.md)；场景取舍见 [美术方向](docs/ART-DIRECTION.md)。

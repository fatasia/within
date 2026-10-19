# 开发与部署

## 目录

| 路径 | 用途 |
| --- | --- |
| `src/data/` | 场景、原作、路线与章节配置 |
| `src/engine/` | 几何、材质、动画、音频与相机 |
| `src/components/` | 场景选择、设置、原作查看器与操作界面 |
| `src/state.ts` | 状态默认值与偏好校验 |
| `public/` | 本地模型、纹理、字体、原作图与视频 |
| `tests/` | 浏览器集成测试 |
| `scripts/` | 录制、预览生成、字体子集与性能检查 |

React 管理界面，Three.js 管理实时场景。静态几何按材质合并，重复树木和岩石使用实例化网格。场景切换时释放资源；视觉地形与步行高度使用相同计算。

## 检查

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

集成测试需先运行 `npm run dev`，再执行：

```sh
npx playwright install chromium
npm run test:e2e
```

视频与 README 检查：`node scripts/check-showcase.mjs`。性能检查：`node scripts/profile-scenes.mjs`。测试与录制输出写入 `artifacts/`，不提交到 Git。

## 发布

```sh
npm run build
npm run preview
```

将 `dist/` 部署到静态 HTTP 服务。Vite 使用相对资源路径，支持子目录部署。不要直接双击 HTML 文件。

GitHub Pages 使用 `.github/workflows/pages.yml`：`main` 推送后执行检查、构建和发布。腾讯云部署仅更新站点的 `/within/` 目录；先备份，先上传资源，再替换入口 HTML，保留旧 hash 资源供已打开的页面使用。

发布后检查首页、JavaScript、字体和媒体的状态码及 MIME 类型，并实际验证场景切换。视频服务应支持 HTTP Range 请求。

## 字体

标题使用 Noto Serif SC 的本地 WOFF2 子集，许可保存在 `public/fonts/OFL.txt`。修改中文界面文案后，重新生成子集：

1. 从 [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notoserifsc) 获取字体，保存为 `artifacts/font-source/NotoSerifSC.ttf`。
2. 安装 `fonttools`、`brotli` 后执行 `python scripts/subset-font.py`。
3. 检查新增字符与字体许可文件，提交生成的 WOFF2。

## 功能范围

水面使用平面反射，不是路径追踪；人物与动物使用预设动画。最高画质优先呈现细节，低性能设备可手动降档。浏览器移动端模拟只能检查布局，持续帧率与温升需真机测试。

[场景目录](SCENES.md) · [原作来源](ORIGINALS.md) · [视频录制](video-directory.md)

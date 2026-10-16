# 2026-10-16 发布记录

18 个可游览场景；Roadster、清明上河、桂雨东湖置前，北极之后依次为樱谷、深海、西湖。

- Roadster：驾驶、换漆、跃升、检查点计时与 MUSK 车顶舞蹈；入场播放用户提供的 Vadoka Bayan 高潮，离场暂停。
- 樱谷：原项目树木与舟船资产、划桨、乘舟视角与船内水面剔除；Worker 建树与 shader 预热减少入场阻塞。
- 北极：动物追逐与雪球互动、角色点击反馈；缩短底部控制栏，避免遮住近景动物。
- 修复：清明屋顶与沿河布局、喀纳斯近岸地形、西湖石路共面闪烁；白娘子盘尾、法海僧服和角色彩蛋。

## 访问地址

- [腾讯轻量服务器](http://106.55.242.154/within/)：仅更新 `/srv/web/within`；旧站备份 `/srv/within-backup-20261016-1823`，保留旧 hash 资源，没有修改其他站点与 nginx。
- [GitHub Pages](https://fatasia.github.io/within/)：提交 `953beb7`，CI 构建和部署成功；[工作流](https://github.com/fatasia/within/actions/runs/38887180585)。
- [CloudBase](https://local-d8gckl1vx0d145939-1321978125.tcloudbaseapp.com/within/)：80 个文件全部上传且校验通过。测试域首次访问需确认腾讯平台提示，确认后已实测进入 Roadster 并播放音乐。

三个入口脚本均为 `index-BTt8CZBO.js`，样式为 `index-BVH41NtS.css`。音乐、GLB、字体和缩略图的线上 HTTP 检查通过。轻量服务器还逐文件对比了 SHA256。

## 检查范围

55 个测试文件、221 项测试通过；lint、TypeScript 和 production build 通过。最终字体覆盖 1141 个中文字符。Roadster 音乐的桌面/手机入场、静音、恢复、回首页和切场停播 E2E 通过；北极点击与底栏、西湖人物与路面、喀纳斯开场已复查。GitHub Pages 直接进入 Roadster 实测约 7 秒就绪，模型和音乐正常；此前一次切场等待 60 秒超时未复现，诊断没有缺失资源或运行错误。

本机性能检查不能替代真机手机帧率测试。清明覆盖了郊野、汴河、虹桥与城内布局，仍是三维意境重建，不是原作全部人物与建筑的一比一复原。

## 视频

[12 景 / 36 秒合集](showreel-delivery-2026-10-16.md) 与 [Roadster / 55.7 秒独立配乐片](roadster-film-2026-10-16.md) 均已完成，1080p / 30fps，完整解码通过。成片不纳入 Git 仓库；可复现的渲染脚本保留在 `scripts/`。

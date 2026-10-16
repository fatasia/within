# Lighthouse 发布记录

地址：<http://106.55.242.154/within/>。

2026-10-16 发布 18:23 冻结构建，入口 `index-BTt8CZBO.js`，样式 `index-BVH41NtS.css`。

- 只更新 `/srv/web/within`，确认其真实路径一致、不是指向其他站点的符号链接。
- 更新前完整复制旧站至 `/srv/within-backup-20261016-1823`。
- 新资源先覆盖，入口 HTML 最后替换；保留旧 hash 文件，未修改 nginx 配置、容器或其他业务目录。
- 线上入口、JS、CSS、Vadoka 高潮 MP3、中文字体、樱花船/船夫 GLB、Neon 店铺 GLB 均返回 HTTP 200；下载后的 SHA-256 与本次 dist 逐文件一致。

校验结果保存在 `artifacts/lighthouse-deployment-20261016.json`。入口 HTML SHA-256：`8c5f1036b4f304b46022dc2fdee92d1bfb1dc9bdc2eb2008f7087a820ef383fb`。

SSH 仅使用已配置密钥路径作为认证参数；未读取或输出密钥内容。

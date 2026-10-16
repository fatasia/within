# CloudBase 发布记录 · 2026-10-16

最终构建已发布到现有环境 `local-d8gckl1vx0d145939` 的 `within/` 子目录。未删除旧文件，未修改根站点、域名、权限或托管配置。

- 地址：<https://local-d8gckl1vx0d145939-1321978125.tcloudbaseapp.com/within/>
- CLI：`@cloudbase/cli@3.8.7`；托管服务状态 `online`。
- 上传：80 / 80 文件成功，0 失败；CLI 远端校验 `verified: true`。
- 安全备份：`.cloudbase-backup/1792146219662/`。
- 入口：`assets/index-BTt8CZBO.js`、`assets/index-BVH41NtS.css`，远端 HTML 已确认引用新哈希。

## 执行命令

```powershell
npm.cmd exec --yes --package=@cloudbase/cli@3.8.7 -- tcb hosting deploy ./dist within -e local-d8gckl1vx0d145939 --safe --verify --json
```

没有使用 `--prune`。CLI 先上传 79 个资源，最后上传 `index.html`。

## 远端检查

以下路径均为普通 GET 请求、无缓存规避参数，返回 HTTP 200：

| 路径 | 字节数 | Content-Type |
| --- | ---: | --- |
| `index.html` | 853 | text/html |
| `assets/index-BTt8CZBO.js` | 511228 | application/javascript |
| `assets/index-BVH41NtS.css` | 43093 | text/css |
| `audio/roadster-vadoka-chorus.mp3` | 669691 | audio/mpeg |
| `assets/neon/models/shops.glb` | 243392 | model/gltf-binary |
| `assets/neon/models/kit_proc.glb` | 1181620 | model/gltf-binary |
| `fonts/landscape-serif.woff2` | 490604 | font/woff2 |

原始结果：`artifacts/deployment/cloudbase-2026-10-16.json`。部署后也执行 `tcb hosting list within`，清单位于 `artifacts/deployment/cloudbase-hosting-list-2026-10-16.json`。

## 测试域名的访问提示

实际 Chromium 首次打开显示腾讯 CloudBase 的“页面访问提示 / 风险提醒”，说明此域名仅供开发测试，并提供倒计时“确定访问”按钮。此次没有改变该平台提示或域名设置；不能把文件 HTTP 200 当作无提示的正式访问体验。截图：`artifacts/deployment/cloudbase-browser.png`。

普通 GET 的响应还带有 `Content-Disposition: attachment` 和 `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`。当前记录确认发布及文件完整性，不声称默认测试域名已达到正式域名的访问行为。

# Neon Zenith 街景资产

来源：[billpwchan/neon-zenith](https://github.com/billpwchan/neon-zenith)，提交 `27ad04ef04aa9e1e1366fccc63e15a379b999f01`。

本目录只分发 Roadster 夜街使用的资产，完整上游名单见 [CREDITS.md](CREDITS.md)。

- `shops.glb` / `shopkit_albedo.webp`：abhayexe 的 [Asian Shop Pack](https://sketchfab.com/models/2f603ad8d5c640f7b9794f6916f9fbdd)，CC BY 4.0。
- `kit_proc.glb` / `kit_proc_albedo.webp`：udayjeet 的 [Procedural Hong Kong building](https://sketchfab.com/models/528a732e84c44fd49c4726f341014a23)，CC BY 4.0。
- `facade_albedo.webp`：上述建筑及 abhayexe 的 [Hong Kong Buildings III](https://sketchfab.com/models/03a5255bb9624d4e82cb8e15e0070b70) 的立面采样，另含 ambientCG CC0 立面。逐项出处见上游 CREDITS。

修改：保留上游压缩资源；选用低模立面模块、合并为少量静态网格，将 TSL 材质改写为 WebGL atlas shader，重新排布街景。没有使用上游 Lotus 车身、整块 Temple Street 街区或字体文件。

CC BY 4.0：[许可证](https://creativecommons.org/licenses/by/4.0/)。代码复用位于 `src/engine/neonVendor`，保留 Bill Chan 的 MIT 许可。

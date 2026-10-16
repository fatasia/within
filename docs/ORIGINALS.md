# 原作图像与来源

原作查看器使用真实作品的数字复制图，不使用三维场景截图或生成图代替原画。图像仅在打开原作查看器后加载，地址位于 `public/originals/`；原始下载保留在已忽略的 `artifacts/originals/`，不随站点发布。

## 范围

| 文件                                                | 作品与范围                                                                 | 来源                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `starry.webp`                                       | 梵高《星月夜》，全幅                                                       | [MoMA 藏品](https://www.moma.org/collection/works/79802)；[Google Art Project / Commons 文件](https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg)                                                                                |
| `winter.webp`                                       | 索尔贝格《山中冬夜》，1914，NG.M.01185，全幅；不是其他版本或含画框游客照片 | [挪威国家博物馆](https://www.nasjonalmuseet.no/en/collection/object/NG.M.01185)；[馆方图像 / Commons 文件](https://commons.wikimedia.org/wiki/File:Harald_Sohlberg_-_Winter_Night_in_the_Mountains_-_NG.M.01185_-_National_Museum_of_Art,_Architecture_and_Design.jpg) |
| `qingming-full.webp`                                | 张择端北宋本完整画卷，16000×750，保留两端卷边；不是清院本                  | [故宫藏品](https://www.dpm.org.cn/collection/paint/228226.html)；[Commons 全卷文件](https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg)                                                                                                                |
| `qingming-section-1.webp`—`qingming-section-6.webp` | 同一北宋本全卷的六个连续阅读窗，从右向左排列；每片均标局部                 | 同上；原图38414×1800，分段边缘重叠48像素，不跳过中间内容                                                                                                                                                                                                               |
| `qingming-detail.webp`                              | 张择端《清明上河图》北宋本虹桥局部，**不是全卷**，不是清院本               | [故宫藏品](https://www.dpm.org.cn/collection/paint/228226.html)；[Commons 原本局部](<https://commons.wikimedia.org/wiki/File:Along_the_River_During_the_Qingming_Festival_(detail_of_original).jpg>)                                                                   |
| `qianli-detail.webp`                                | 王希孟《千里江山图》卷首局部与题跋，**不是全卷**                           | [故宫藏品](https://www.dpm.org.cn/collection/paint/228354.html)；[Commons 卷首局部](<https://commons.wikimedia.org/wiki/File:Wang_Ximeng_-_A_Thousand_Li_of_River_(Start).jpg>)                                                                                        |
| `fuchun-detail.webp`                                | 黄公望《富春山居图》无用师卷局部，**不是全卷**；不混用剩山图               | [台北故宫专题](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000975)；[Commons 无用师卷局部](https://commons.wikimedia.org/wiki/File:Huang_Gongwang._Dwelling_in_the_Fuchun_Mountains._detail._National_Palace_Museum,_Taipei.jpg)                             |
| `xishan.webp`                                       | 范宽《溪山行旅图》画心全幅，不含外部题签与装裱                             | [台北故宫专题](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000959)；[Google Art Project / Commons 文件](https://commons.wikimedia.org/wiki/File:Fan_Kuan_-_Travelers_Among_Mountains_and_Streams_-_Google_Art_Project.jpg)                                   |
| `empire-0.webp`                                     | 科尔《帝国的进程》第一幅：荒蛮状态                                         | [Commons 文件](https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Course_of_Empire_The_Savage_State_1836.jpg)                                                                                                                                                     |
| `empire-1.webp`                                     | 第二幅：田园状态                                                           | [Commons 文件](https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Course_of_Empire_The_Arcadian_or_Pastoral_State_1836.jpg)                                                                                                                                       |
| `empire-2.webp`                                     | 第三幅：帝国鼎盛                                                           | [Commons 文件](https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Consummation_The_Course_of_the_Empire_1836.jpg)                                                                                                                                                 |
| `empire-3.webp`                                     | 第四幅：毁灭                                                               | [Commons 文件](https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Course_of_Empire_Destruction_1836.jpg)                                                                                                                                                          |
| `empire-4.webp`                                     | 第五幅：荒凉                                                               | [Commons 文件](https://commons.wikimedia.org/wiki/File:Cole_Thomas_The_Course_of_Empire_Desolation_1836.jpg)                                                                                                                                                           |

《帝国的进程》五幅均藏于 The New York Historical。武汉、桂林、张家界是实景题材，没有对应的一幅原作；界面应提供场景既有资料来源，不展示其他画作冒充原作。

## 图像归属与处理

- 星月夜、清明局部、千里局部、富春局部、溪山、帝国五图：Commons 文件页标注公版作品的忠实复制图。保留具体文件来源，勿将 Commons 网站文字的许可与作品图像混为一谈。
- 山中冬夜：作品本身为公版；数字图像来源为 **National Museum of Art, Architecture and Design**，文件页给出 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。该复制图没有单列摄影者姓名，使用时保留馆方归属、文件页和许可链接。
- 千里、富春、溪山的发布文件均改用 Commons 明确标注 PD-Art / Public Domain Mark 的复制图；馆藏页保留为作品出处，不再发布此前直接下载的馆藏专题页文件。来源标识不代表馆方合作或授权建模。
- 除下述清明全卷阅读分段外，本地处理仅等比缩小和转为 WebP：长边最多 2400 像素、quality 87，不裁切、不补绘、不变色。`starry.webp` 使用 Commons 1280 像素版本；`qianli-detail.webp` 保留来源的 2349×1600 像素，`fuchun-detail.webp` 保留 2200×804 像素，`xishan.webp` 等比缩为 1197×2400 像素。显示中的数字压缩图不等于实物色彩或超高清扫描。

核对日期：2026-10-16。全幅与局部标识保存在 `src/data/originals.ts`，与实际文件匹配；帝国五时期按 0—4 编号。单元测试检查七幅覆盖、三个实景排除、十八图存在及全幅/局部说明。

## 本轮替换文件的下载地址

以下均从对应 Commons 文件页的 Original file 链接下载，页面归属标识为 [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/)，适用说明见各文件页的 PD-Art 段落。

- 千里：[原始 JPEG](https://upload.wikimedia.org/wikipedia/commons/5/59/Wang_Ximeng_-_A_Thousand_Li_of_River_%28Start%29.jpg)，卷首局部，2349×1600。
- 富春：[原始 JPEG](https://upload.wikimedia.org/wikipedia/commons/f/f9/Huang_Gongwang._Dwelling_in_the_Fuchun_Mountains._detail._National_Palace_Museum%2C_Taipei.jpg)，无用师卷局部，2200×804。
- 溪山：[原始 JPEG](https://upload.wikimedia.org/wikipedia/commons/c/c2/Fan_Kuan_-_Travelers_Among_Mountains_and_Streams_-_Google_Art_Project.jpg)，画心全幅，2809×5633。

## 清明全卷更新（2026-10-16）

完整画卷取自 [Commons 的 Alongtheriver QingMing.jpg](https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg)，原始文件为 [38414×1800 JPEG](https://upload.wikimedia.org/wikipedia/commons/8/86/Alongtheriver_QingMing.jpg)。文件页标明故宫博物院藏、北宋张择端本及 Public Domain / PD-Art；文件页列出的上游图像来源为 Baidu Tieba，因此它是有明确版本与公版标识的复制图，不表述为本项目直接获得的故宫官方高清扫描授权。作品信息与段落划分另对照[故宫藏品介绍](https://www.dpm.org.cn/collection/paint/228226.html)、[故宫名画记](https://minghuaji.dpm.org.cn/paint/detail?id=592d80e225aac624977fee2e19452c1f&topicType=12)及[故宫研究文章](https://www.dpm.org.cn/forum_detail/99722.html)。馆藏页本轮直接请求超时，检索摘要可读；没有绕过访问限制。

已查看卷首、舟运、虹桥、城门与卷尾图像，保留原图方向。全图右端是郊野，左端是城内；六段按这个阅读顺序编号，不对原画水平翻转。`qingming-full.webp` 等比缩至16000×750、quality87；六段由原图连续六等分，再向相邻片各扩48像素，长边等比缩至3840、quality88。分段裁切用于浏览，不补绘、不改变颜色。虹桥旧局部另保留且继续标“不是全卷”。长卷阅读按钮采用短标题，手机可横滑选择。

### 三维对应范围

全卷图像覆盖与三维逐物复原是两件事。当前三维按五区串连全卷叙事；不是全卷全部人物、店招、舟车和建筑的逐项复刻。X轴由郊野向城内递增，是项目的游览坐标，不是原画原始投影坐标。

| 阅读段     | 可核图像元素                 | 本轮实际模型 / 镜头                                                                                                    |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 郊野       | 低舍、疏枝树、篱院与道路     | 将九栋通用商铺模板替换为四户茅舍、窗棂/半开门、篱院、疏枝村树；镜头0、0.10                                             |
| 汴河       | 河岸店舍、舟运、河岸往来人物 | 保留七艘河船及既有栈台，补坡板、双方搬货接触与货包组；镜头0.20、0.27。具体搬货姿态是动态场景构图，不宣称对应原作同一人 |
| 虹桥       | 木拱桥、桥面人群、桥下舟船   | 保留已建木拱、卧桅船与船工；镜头0.36、0.44                                                                             |
| 城门       | 砖门楼、板筑土墙、交通       | 保留已建门楼/夯墙/驴车，补沿街入城的中景衔接；镜头0.56、0.65、0.72                                                     |
| 城内至卷尾 | 密集街屋、欢门、院墙、铺席   | 保留欢门邻铺，错开后排街屋，补卷尾院墙/门口/桌案器物与人物；镜头0.79、0.83、0.93、1.00                                 |

具体建筑比例、招牌文字、职业身份和所有人物数量尚未逐物核对；新茅舍、搬货组和巷院是取自原作元素类型的三维重组。原卷右端到左端各区均可浏览，但不据此声称“原画一物不漏”。

### 验证与性能

- 新 `qingmingScroll.test.ts` 验证茅舍屋面朝向、分区模型、镜头顺序与地面净空；`qingmingBuild.test.ts` 验证增量合批、五处中断清理、驴车四组形变与原实现一致。
- 新增 `buildQingmingSteps` 与增量合批/形变准备，原同步构建入口保留。CPU分片基准在当前本机单次约950ms总计算、1953步、最长约11.2ms；不是手机帧率或上线加载时间承诺。
- GPU截图使用真实 Experience、固定时间、RTX 4060：`artifacts/qingming-full/scene-*.png`。已发现并调整卷尾镜头旧眼位被店屋柱遮挡的问题。手机查看器实际加载全卷16000宽图与3840宽分段，浏览器未报错。

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

## 清明长卷

完整画卷取自 Commons 的 Alongtheriver QingMing.jpg，原始图像为 38414 × 1800。全图等比缩至 16000 × 750；六个连续阅读分段保留相邻 48 像素重叠，长边缩至 3840 像素。分段从原画右端郊野向左端城内排列，不翻转、不补绘。

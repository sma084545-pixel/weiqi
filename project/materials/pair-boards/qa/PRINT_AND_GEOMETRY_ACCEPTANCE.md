---
schemaVersion: 1
id: T19-PRINT-GEOMETRY-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T19 打印与几何验收记录

- baseVersion: `0.2.0`
- resultVersion: `0.2.0-t19.1`
- 检查日期: 2026-09-06
- 数字交付结论: 通过
- 实体制作结论: 未测，按任务要求留给后续实际打印、裁切和使用

## 自动检查

实际运行：

```sh
python3 materials/pair-boards/tools/generate_pair_boards.py
python3 materials/pair-boards/tools/verify_geometry.py
```

结果：`PASS: 44 geometry and document checks`。机器可读证据在 `geometry-report.json`。

逐页渲染使用 Poppler：

```sh
pdftoppm -png -r 120 INPUT.pdf OUTPUT_PREFIX
```

结果：28 个 PDF 共 44 页全部成功生成 PNG。`render-manifest.json` 记录每页像素尺寸；`rendered-pages/` 保留全部页面，`contact-sheets/` 保留彩色和灰度总览。

另用 `pypdf` 抽取 28 个 PDF 的全部文本，未发现 Unicode 替换字符；用 PyMuPDF 检查字体对象，确认 PDF 内含子集嵌入的 `ArialUnicodeMS` TrueType 字体。该检查证明文件携带本次使用的中文字体子集，不保证任意第三方编辑器都采用同一替代字体显示 SVG。

## 验收表

| 项目 | 状态 | 证据 |
|---|---|---|
| 9×9 A4 坐标/无坐标 SVG 与 PDF | 通过 | 9 横线、9 竖线；20 mm 格距；A4 210×297 mm |
| 9×9 A3 坐标/无坐标 SVG 与 PDF | 通过 | 9 横线、9 竖线；28 mm 格距；A3 420×297 mm |
| 13×13 A3 坐标/无坐标 SVG 与 PDF | 通过 | 13 横线、13 竖线；20 mm 格距；A3 420×297 mm |
| 可选 13×13 A4 小棋子版本 | 通过 | 13 横线、13 竖线；14 mm 格距；11-12 mm 棋子 |
| 显示坐标与程序方向一致 | 通过 | 列 A-H,J...；行上大下小；9×9 A9=`(0,0)`、J1=`(8,8)`；13×13 A13=`(0,0)`、N1=`(12,12)` |
| 无坐标版没有残留坐标 | 通过 | XML 类别检查：坐标文字计数为 0 |
| 棋子不盖相邻交点 | 通过（文件几何） | 每版标注最大棋子直径均比格距至少小 2 mm；实体手感未测 |
| 普通打印边距 | 通过（文件几何） | 棋盘面板和说明区均位于页面边缘内至少 10 mm；打印机实际不可打印区未测 |
| 100% 提示和校准尺 | 通过 | 所有打印页含纸张/棋子范围或“不限定”、100% 提示和 100 mm 校准尺 |
| A3 两页 A4 拼接 | 通过（数字） | 4 个两页 PDF；20 mm 重叠区；红线对应同一全局位置；缝不作为棋盘边界 |
| 18 mm 纸棋子 | 通过 | 每色 90 枚；圆直径与数量由 SVG XML 自动计数 |
| 12 mm 小纸棋子 | 通过 | 每色 169 枚；与可选 13×13 A4 配套 |
| 空盘点数和整局手数区别 | 通过 | README、纸棋子页与制作说明均明确可回收提子；未把 81/169 写成整局手数上限 |
| 面积分不重复加提子 | 通过 | 纸棋子页和 README 明确：提子数另记，不再次加入面积分 |
| 便携包与套数公式 | 通过 | 配置页、标签、借还清单、规则卡固定位置齐全；公式为向上取整(人数÷2)+教师填写备用 |
| “先圈气再落子”覆片 | 通过 | 4 个尺寸对应覆片；只有四角对位标记，无网格答案或候选着答案 |
| 彩色与灰度辨识 | 通过（渲染） | 全部页面生成彩色/灰度接触页；黑白棋子同时用明度、轮廓和文字区分 |
| 中文嵌入与可读性 | 通过（数字） | PDF 字体子集已嵌入；无替换字符；逐页未见方框、裁字或重叠 |
| 实际打印比例与裁切 | 未测 | 需要实体打印后测量 100 mm 校准尺与交叉点中心距 |
| 双面套准、拼接牢度、覆膜反光、可擦性、耐用性 | 未测 | 需要所选打印机、纸张、透明层、胶带和笔的实体测试 |
| 教师/学生使用体验 | 未测 | 没有虚构使用、评价、活动照片或实施效果 |

## 逐页视觉检查记录

本助手查看了 44 页彩色渲染和对应灰度总览，重点核对：棋盘边线完整；交叉点没有被装饰遮挡；坐标方向一致；A3 拼接两页的网格连续；校准尺没有越界；纸棋子的黑白轮廓在灰度中仍可区分；标签和清单无明显裁切、重叠、黑块或缺字；覆片保持透明书写区且没有印入答案。

这不是人类教师审核，也不替代真实打印。接触页：

- `contact-sheets/boards-color.png`、`boards-grayscale.png`
- `contact-sheets/overlays-color.png`、`overlays-grayscale.png`
- `contact-sheets/portable-kit-color.png`、`portable-kit-grayscale.png`
- `contact-sheets/print-packs-color.png`、`print-packs-grayscale.png`

## 已知限制

- SVG 使用常见中文字体回退链；PDF 已嵌入本机 Arial Unicode 字体子集。其他电脑编辑 SVG 时若无同字体，字宽可能变化，应重新检查说明区，不会改变棋盘毫米坐标。
- 导航点是原创定向辅助，不是官方小棋盘让子标准。
- 2 mm 是名义最小间隙；厚棋子、磁性棋子、手部动作和桌面平整度均未实测。
- 覆片 PDF 的白色区域在屏幕查看器中显示为白底；打印到透明介质时未绘制棋盘答案，只保留标记与文字。


T24备注（2026-10-09）：本页与旧render-manifest/页面图是T19 r1历史验收。13路A4覆片及派生打印包已从源修复为r2；当前44项几何报告为0.2.1-t19.2，全部现版页面检查见docs/t24/checks/render-report.json及visual-review.md。

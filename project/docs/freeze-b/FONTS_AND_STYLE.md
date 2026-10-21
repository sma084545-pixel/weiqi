---
schemaVersion: 1
id: FREEZE-B-FONTS-STYLE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 字体与样式引用

这些是被冻结材料的复用依据，不是新的最终题卡或 PPT 设计。

| 用途 | 字体引用 | 样式源 |
|---|---|---|
| T09 SVG / 阅读版 PDF | Arial Unicode MS；SVG 备用 PingFang SC / sans-serif | `content/tools/render_materials.py` 与 `content/artwork/*.svg` |
| T09 既有演示文稿 | Arial Unicode MS | `content/tools/build_deck.mjs`；`content/print/T09_教学演示_r1.pptx` |
| T20 PDF | STHeiti Light（所用字形已嵌入） | `materials/rule-cards/source/build_cards.py` |
| T20 可编辑 SVG | Heiti SC, Noto Sans CJK SC, sans-serif | `materials/rule-cards/source/*.svg` |
| 程序显示 | 继承 T15 样式 | 完整主线 `src/styles.css`、`src/components/Board.css` 与模块 CSS |

T20 主文字 #192E32、强调 #235B60、浅底 #EDF3F2、棋子黑 #151B1D / 白 #FFFFFF；T09 黑子 #20272A、主文字 #172A32、棋线 #78746A。黑实心与白空心、气环、三角目标、数字目标和中立 × 不只靠颜色区分。

T20 A5=148×210 mm，A6=105×148 mm；T09 现有打印件为 A4。真实棋盘尺寸和边界来自 JSON，不能从排版后的裁切边推断。坐标统一 row/col 从左上 0 开始，显示列 A–T 跳过 I、行从下到上。

系统字体文件不随包分发。T20 可用环境变量 `T20_FONT` 指定使用者合法持有、支持中文和嵌入的 TTF/TTC；T09 原生成器引用 `/Library/Fonts/Arial Unicode.ttf`。更换字体须重新生成并逐页检查换行和尺寸，不能声称替换后文件仍匹配旧冻结校验值。PDF 字体嵌入核查见 `evidence/font-embedding.json`。PPT/SVG 仍依赖阅读设备字体，未进行原生 Office/Keynote 复核。

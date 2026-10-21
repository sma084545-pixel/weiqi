---
schemaVersion: 1
id: T21-CHALLENGE-CARDS-README
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T21｜30 张纸质挑战卡与教师答案册

材料版本：`0.15.1-t21.1`。冻结输入：`GO-CLUB-FREEZE-B-20260919-01`。

## 先用哪些文件

- `output/T21_challenge_cards_front_A4.pdf`：卡片正面，15 页，每页两卡。
- `output/T21_challenge_cards_back_A4.pdf`：卡片背面，15 页，与正面同页码、同上下位置配对。
- `output/T21_teacher_answer_book.pdf`：33 页教师答案册，含 3 页使用说明/索引和 30 题逐题答案。
- `output/T21_duplex_test_page1.pdf`：正面第 1 页 + 背面第 1 页，用于先做一张纸的套准测试。
- `CARD_INDEX.json` / `CARD_INDEX.csv`：检查 ID、revision、配对页和答案册页码。
- `PRINT-AND-ACTIVITIES.md`：双面打印、裁切、材料和三种玩法。

六类别为 LIB、CAP、CON、LIFE、AREA、DISC，各 5 张，合计恰好 30 张。每张正面显示稳定 ID、revision、难度文字和图标、完整棋盘、谁先/轮次、任务及必要条件；背面含三层提示、答案或开放讨论方向、关键变化、常见错误和教师答案册页码。DISC 五题使用量规，不设唯一答案。

## 可编辑源与重生成

`editable/front/` 与 `editable/back/` 各含 30 个 SVG；文字、棋盘线、棋子与标记均为矢量对象。`source/build_cards.py` 是从冻结 JSON 重建 SVG 和 PDF 的唯一生成源。

在项目根目录运行：

```sh
python3 materials/challenge-cards/source/build_cards.py
python3 materials/challenge-cards/source/render_qa.py
```

生成器先核对 `handoff/CONTENT_FREEZE.json` 中 30 题 JSON 与 SVG 的 SHA-256、bundle 哈希、ID、revision、规则和 schema；任何不一致都会停止。随后把正式输入快照复制到 `frozen-input/`，不修改权威 `content/`。

依赖：Python 3、ReportLab、pypdf、Pillow、Poppler 的 `pdftoppm`。字体说明见 `source/FONTS.md`。

## 验证证据

- `validation/automated-checks.json`：数量、类别、ID、revision、开放题、正背映射、PDF 页数/尺寸/文本、SVG 和冻结快照核对。
- `validation/page-map.json`：每张卡正面、背面和答案册页码。
- `validation/render-qa.json`：63 页逐页 144 dpi 渲染尺寸、非空范围和联系表索引。
- `validation/font-embedding.json`：PDF 中文内容字体嵌入核查。
- `validation/VISUAL_QA.md`：逐页视觉复核结论、灰度复核和未测边界。
- `FILE_MANIFEST.json`、`SHA256SUMS.txt`：材料文件清单与哈希。

这是一套可制作的数字材料；未声称已实体印刷、由学生使用或经人类围棋教师审核。

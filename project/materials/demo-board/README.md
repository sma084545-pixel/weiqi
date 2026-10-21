---
schemaVersion: 1
id: T18-DEMO-BOARD-README
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T18 磁性演示棋盘与可操作标记

这是可制作的 9×9 站立演示盘文件包，不代表已经制造、采购、由学生使用或通过学校审批。默认对象与场地仍是可调整假设：中学生、约 45 分钟活动、可能使用教师设备/投影，也可能没有个人设备。

## 先用哪个文件

- 制作一整张 450 mm 方盘：`board-9x9-450mm.svg`（可编辑矢量）或 `board-9x9-450mm-1to1.pdf`（1:1 成品）。
- 普通 A4 打印机：`board-9x9-a4-tiled.pdf`，六页、100% 实际尺寸、带重叠区/套准标/页码/100 mm 标尺。
- 制作棋子与标记：`pieces-markers-a4.pdf`，配套可编辑源位于 `editable-sheets/`。
- 教师摆棋演示：`teaching-flows-a3.pdf`，可编辑源 `teaching-flows-a3.svg`，精确坐标数据 `teaching-setups.json`。
- 制作与使用：`assembly-guide.pdf`；可编辑文字源为 `assembly-guide.md`，材料规格另见 `materials-list.md`。
- 打印/实体试用记录：`trial-record.csv` 为空白表，不含虚构结果。

## 核心尺寸

9 条横线 × 9 条竖线，共 81 个交叉点。相邻线距 45 mm，8 个间隔为 360 mm；四周各 45 mm：

`总边长 = 2 × 45 + (9 - 1) × 45 = 450 mm`

棋子直径 38 mm，相邻棋子理论净间距 `45 - 38 = 7 mm`。完整参数与 A4 切片窗口见 `dimensions.json`。

## 打印纪律

1. PDF 打印选择“实际尺寸”或“100%”；关闭“适合页面”“缩放到可打印区域”。
2. 用页面上的 100 mm 标尺实测。建议误差不超过 1 mm；超出时不要继续裁切或拼接。
3. A4 拼接顺序：上排 1–3，下排 4–6。相邻页有 15 mm 横向重叠、20 mm 纵向重叠。
4. 拼接接缝位于网格线之间的带状区；不要沿网格线、星位、坐标或标尺切开。
5. PDF 是分发副本；修改尺寸、文字、颜色或数量时修改 SVG/JSON/Markdown 源并重新生成。

## 生成与验证

在本目录运行：

```sh
python3 generate_assets.py
python3 verify_assets.py
```

渲染逐页检查：

```sh
sh render_and_contact_sheet.sh
```

本包生成时使用的 Python 与系统 Poppler 路径记录在 `visual-check.md` 和 `qa/commands.log`。`verify_assets.py` 检查 SVG/PDF 几何、线数、交叉点、标尺、拼接连续性、页数/纸张、教学棋形气集合及必需文件；它不能替代实体打印、磁吸、耐用性或真实教室远距离测试。

## 文件身份与兼容性

- baseVersion: `0.2.0`（T01 完整归档）
- resultVersion: `0.2.0+t18.1`
- schemaVersion: `1`
- rulesetId: `GO-CLUB-AREA-1`
- 坐标：左上角 `(row:0,col:0)`；显示列 A–T 跳过 I，显示行从下往上。

T18 没有修改 `src/`、`schemas/`、正式 `content/`、依赖/锁文件、根 README/CHANGELOG 或全项目验收矩阵。

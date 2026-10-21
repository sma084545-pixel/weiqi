# 往返测试集

| 样例 | 覆盖 | 预期 |
|---|---|---|
| `TEST-T15-LIB-ROUNDTRIP.json` | Puzzle、ID/revision、轮次、提示、数字答案、验证字段 | 导入后重新导出仍通过共同 schema，关键字段相等 |
| `TEST-T15-two-branches.sgf` | 根摆子、KM、PL、中文、转义右括号/反斜线、停手、边角坐标、两个分支 | 预览保留树；两条路线分别经 T01 重放 |
| `TEST-T15-two-branches-roundtrip.sgf` | SGF AST 重新序列化 | 再解析仍有两条根到叶路线及原注释语义 |
| question SVG/PNG/PDF | 真实盘边、坐标、目标、ID/revision | 可打开；题面无答案；PDF 为 1 页 A4 |
| answer SVG | 答案预设 | 显式标记答案层，避免与题面混用 |
| batch ZIP + manifest | 四模板稳定命名 | ZIP 完整，清单逐项对应 ID/revision |

这些是开发样例，不是正式题库内容，也不把自动往返称为真人教学审查。


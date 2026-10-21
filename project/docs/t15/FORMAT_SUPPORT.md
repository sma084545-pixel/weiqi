# T15 格式支持范围

T15 的 JSON 是教学元数据权威格式；SGF 只承担可表达的棋谱语义。界面中的“GameRecord”仍序列化为共同 schema 的 `kind: "GameState"`，避免创建平行模型。

## JSON

支持独立 `Position`、`Puzzle`、`GameState`，以及包含这些文档的 `ContentBundle`。所有文档先经 schemaVersion=1、GO-CLUB-AREA-1、共同 JSON Schema 和跨字段校验；Puzzle 的变化树、GameState 的对局历史再由 T01 重放。

## SGF FF[4] 子集

2026-09-16 实际核对 [SGF FF[4] 主页](https://www.red-bean.com/sgf/)、[语法与游戏树](https://www.red-bean.com/sgf/sgf4.html)、[围棋坐标与停手](https://www.red-bean.com/sgf/go.html)和[属性清单](https://www.red-bean.com/sgf/properties.html)。实现支持：

- `GM[1]`、`FF[4]`、`CA[UTF-8]`，以及 5/9/13/19 路 `SZ`；
- 根节点 `AB`、`AW`、`AE`、`PL`、`KM`、`RU`；
- `B`、`W`、空值停手、19 路及以下的旧式 `tt` 停手；
- `C` 注释、反斜线和右方括号转义、完整游戏树与合法变化分支；
- SGF 左上原点：第一字符是从左到右的列，第二字符是从上到下的行，直接映射本项目 `row,col`。

根节点出现着法，或非根节点出现 `AB/AW/AE/PL`，会阻止“完整解释”式导入；原始 SGF 保留在输入框。未支持属性逐项列警告。`RU` 缺失标为源规则未知；与 GO-CLUB-AREA-1 不同则标为规则冲突，必须明确同意仅按本项目规则试导入。导入不会声称还原原比赛裁判。

完整树按原属性和值重新序列化；线性对局功能必须先选一条根到叶路线，并说明遗漏分支数。每一条路线都由 T01 从根 setup 重放。标准 SGF 无法表达本项目全部提示、验证记录、题型量规、终局确认与恢复等字段，导出时会列出损失警告；需要完整往返时使用 JSON。


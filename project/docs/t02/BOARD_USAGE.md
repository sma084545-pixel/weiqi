---
schemaVersion: 1
id: DOC-T02-BOARD-USAGE
revision: 2
rulesetId: GO-CLUB-AREA-1
---

# Board 组件使用说明

公开组件在 `src/components/Board.tsx`，公开视图类型在 `src/components/board.types.ts`，并与 `src/core/rules/contract.ts` 使用同一份定义。Board 是受控展示组件：它不改 `board`，不轮换 `toPlay`，不计算气、提子、自杀或超级劫，也不保存数据。页面可以先用 T01 `tryMove` 试下，展示其 `event`，再由控制器提交 `nextState`。

```tsx
<Board
  size={state.size}
  board={state.board}
  label="9×9完整对弈棋盘"
  mode="play"
  selected={trial?.event.placed ?? null}
  onSelect={setSelected}
  onPlay={(at) => attempt({type:'place', color:state.toPlay, at})}
  markers={viewMarkers}
  unavailablePoints={knownUnavailable}
  showCoordinates
  displayMode="standard"
  zoom={1}
/>
```

## 属性契约

| 属性 | 类型与默认 | 约定 |
|---|---|---|
| `size` | `5\|9\|13\|19` | 必须与完整 `board` 的行列数一致 |
| `board` | `BoardMatrix` | `B/W/null`；只读输入，Board 不改引用或内容 |
| `label` | `string` | 棋盘用途的可读名称；作为文本渲染，不执行 HTML |
| `mode` | `readonly/select/play/mark`，默认 `select` | `readonly` 无动作；`play` 只允许空且未禁用的点；其他可操作模式调用选点 |
| `selected` / `onSelect` | `Coord|null` / `(Coord)=>void` | 选择状态完全由父级持有；`readonly` 不回调 |
| `onPlay` | `(Coord)=>void` | `play` 模式的提交意图；合法性仍由 T01 引擎判断 |
| `focusPoint` / `onFocusChange` | 可选受控坐标 | 外部需要同步焦点时使用；组件内部仅保存未受控的漫游焦点 |
| `markers` | `BoardMarker[]` | 超界标记不显示，并给出可读状态；`markerId` 在当前棋盘内稳定且唯一 |
| `unavailablePoints` | `Coord[]` | 用叉号和文字“不可操作/不可落”表达，不只靠颜色 |
| `showCoordinates` | 默认 `true` | 显示列 A–T 跳过 I；行从下往上 1–N |
| `displayMode` | `standard/projector` | 投影模式放大交点下限、线条、棋子文字和状态文字 |
| `zoom` | 默认 `1` | 组件夹在 `0.75–1.5`；父级保存并提供按钮 |
| `resetViewKey` | 默认 `0` | 值变化时把棋盘局部滚动复位到左上；父级同时复位自身 zoom |

## 标记与叠放

从底到顶为：区域标签 `ownership`（1）→候选点 `candidate`（2）→棋子（3）→气环 `liberty`（4）→整块双线 `group`（5）→目标三角 `target`（6）→最后一手 `last-move`（7）→数字顺序 `sequence`（8）→不可用叉号（9）→选择框（10）→键盘焦点（11）。`group` 是 T04 增加的兼容视图标记，只表示父级已经选中的棋块，不参与求气或合法性。数字放在交点左上，气环沿外圈，目标和最后一手使用不同形状；黑白棋还有“黑/白”字和不同边框，所以灰度下仍可分。

内容模型的 `Marker` 先由功能控制器归一化为 `BoardMarker`。Board 不把未知内容字段解释成 HTML、链接或动作。区域 `owner` 只表示调用者提供的标签，不调用 `scoreArea`，也不声称是可靠终局结果。

## 操作与布局

每个交点是一个原生按钮并带 `role=gridcell`。同一棋盘只有一个 `tabIndex=0`：方向键上下左右移动，Home/End 到本行首尾，边界停止；Enter/Space 走浏览器原生按钮激活路径。点击和触摸共用一次 `click` 处理，不同时绑定 pointer/touch 回调。焦点边框、不可用叉号、棋色文字及 `aria-label` 一起给出状态。

棋盘线独立画在一个 SVG 层：第 `i` 条线的位置为 `(i+0.5)/N`，端点为半个交点单元，所以恰有 N 条横线、N 条竖线，棋子中心与线交点相同。外层 `.board-viewport` 负责局部滚动并限制页面横向溢出；每点标准下限 32px、投影下限 40px。调用者不要给棋盘外层添加拖拽手势，以免与落子冲突。

悬停预览只在 `(hover:hover) and (pointer:fine)` 生效。触屏不依赖悬停。`prefers-reduced-motion: reduce` 时预览、焦点和滚动过渡关闭；没有声音或闪烁动画。

四种开发示例位于 `src/features/home/Home.tsx`。其中“落子棋盘”调用共享 `rulesEngine.tryMove`；其他三个只验证显示和回调。`DEV-T02-*` 不是正式课程、题库或实施数据。

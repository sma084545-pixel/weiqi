---
schemaVersion: 1
id: DOC-T01-ENGINE-USAGE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 规则引擎 0.2.0 使用说明

此包是可以直接导入的纯 JavaScript ES 模块；没有对弈页面、棋力评估或自动死活裁判。无需 React、服务器、账号、网络或另行安装运行依赖。源码工程使用 TypeScript；声明入口为 types/rules/index.d.ts。集成前读完整源码包的 docs/INTERFACES.md、RULES.md、handoff/T01.md。

将以下内容保存为与 go-club-rules.mjs 同目录的 demo.mjs，然后运行 `node demo.mjs`：

```js
import {startGame, tryMove, RULE_ERROR_ZH} from './go-club-rules.mjs';
const position = {
  schemaVersion: 1, id: 'DEV-MY-POSITION', revision: 1,
  rulesetId: 'GO-CLUB-AREA-1', kind: 'Position', size: 9,
  stones: [], toPlay: 'B', historyPolicy: 'fresh-setup', history: null
};
const opened = startGame(position, {mode: 'full-game', komi: 0, gameId: 'DEV-MY-GAME'});
if (!opened.ok) throw new Error(RULE_ERROR_ZH[opened.error.code]);
let current = opened.value;
const base = current;
const trial = tryMove(base, {type: 'place', color: 'B', at: {row: 4, col: 4}});
if (trial.ok && current === base) {
  // 可以先用 trial.value.event 展示前后棋盘与提子，再由使用者提交。
  current = trial.value.nextState;
  console.log(current.board[4][4]); // B，显示坐标 E5
} else if (!trial.ok) {
  console.log(RULE_ERROR_ZH[trial.error.code], trial.error.field);
}
```

数据坐标左上(0,0)，row向下、col向右；B/W/null。fresh-setup表示起点以前的历史未知，必须向使用者说明。原始输入不改动，输出状态递归冻结。全部对弈状态操作通过同一引擎；不得在页面重新计算气、提子或计分。

`serializeGame`输出schemaVersion=1完整JSON；`restoreGame`按合法起点和每个事件重放，还核对undo/redo，拒绝伪造缓存。`createVerifiedGameStore(StoragePort)`复用原持久化服务并加入相同重放。读取/保存上限64,000,000 UTF-8字节；超过或存储配额不足会拒绝，不能截断历史。标准内容存储的默认2MB保持不变；本机localStorage实际配额通常低于此引擎处理上限，不能承诺可存任意长对局。

`scoreArea`默认仅预览；请求confirmed还必须带有效的confirmation对局状态、匹配原盘与贴目、双方相同死子及完整中立点确认。仅标签不能证明终局。`confirmScore`仅能在完整对弈两停后的scoring阶段生成area结果；死子是可撤回注释，不改历史棋盘。争议从scoring调用resumePlay；已确认终局先undo回确认阶段。认输和首提获胜不采用面积计分。

此包通过自动测试和独立手算向量核对，不代表所有可能围棋局面已被形式证明，不代表真人教师审核。原首页的浏览器视觉验收仍继承T00未测状态；本模块不依赖该界面。

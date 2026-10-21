---
schemaVersion: 1
id: DOC-T10-GRADING-CONTRACT
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 判题与未知分支约定

`catalog.ts` 只把 `developmentOnly=false`、schemaVersion=1、GO-CLUB-AREA-1，且 structure、moveLegality、solutionChecked 三项均为 passed 的 Puzzle 标成可用。格式错误、未通过发布检查、开发示例和播放器不支持的类型分别返回稳定恢复状态；页面不白屏。

`grading.ts` 负责答案模型比较，不实现围棋规则。数字、集合、区域和理由使用明确结构比较；开放文字只检查输入格式并返回 discussion。所有落子和作者回应分别调用 T01 `startGame`、`tryMove`、`applyPass`：

1. 规则拒绝返回 illegal 和 T01 稳定中文说明，输入 GameState 不变。
2. 合法着若匹配当前答案树子节点，才使用该节点的 outcome 和 explanation。
3. 多个子节点可以同时是 success，不能以单一作者坐标覆盖模型。
4. failure 只在内容节点明确标为 failure 时成立；有子节点时，仅播放题库写明且经引擎确认的合法反驳。
5. 合法但当前节点未覆盖时返回 unknown，不转成 failure、不计错误率，可进入自由试下或同伴讨论。
6. DISC 返回 discussion；不把示例考虑写成唯一答案。

T09 的 `content/tools/grade.mjs` 继续作为内容侧参考适配器和命令行验证工具。T10 浏览器实现直接调用当前主线 `src/core/rules`，避免把旧的已构建引擎复制进页面；两者由固定 T09 内容检查与 T10 明示向量共同约束。

反馈状态固定为 success、failure、illegal、unknown、discussion、invalid、continue。颜色之外同时提供图标、中文标题和解释。成功后可以重做；本设备完成标记只是自用导航，不构成资格或排名。

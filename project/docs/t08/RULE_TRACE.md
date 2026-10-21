---
schemaVersion: 1
id: DOC-T08-RULE-TRACE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T08 规则追踪

| 要求 | 实现 | 验证 |
|---|---|---|
| 9/13/19、默认9与贴目0、自由让子白先 | full-game/model设置、Position、validate/start | model与browser setup/handicap |
| 赛中锁设置；落子/停手/认输 | T01 tryMove/applyPass/resign | model、browser、T01回归 |
| 双停进入确认，不自动判死 | T01 phase=scoring；UI草稿 | complete-game browser |
| 点击整块死子；修改清确认 | getGroup + toggleDeadGroup | model整块/空点/失效；browser标记 |
| 双方同一清单后终局 | scorePreview + confirmScoreFor | model preview/confirmed；browser完整流程 |
| 面积明细、提子不重复加分 | scoreArea/ScoreDetails | DEV-END-T08-001、UI最终表 |
| 争议恢复保留原盘与超级劫历史 | resumePlay | model引用与布局断言；browser继续落子 |
| 双方确认撤回 | undo一次；原生dialog | model终局前撤回；browser三步流程 |
| 认输无编造分数 | T01 resign result | model和browser无score |
| 复盘只读 | createFullGameReview + 显式返回 | model对象不变；browser revision不变 |
| 保存可重放状态 | createVerifiedGameStore | model伪造captures拒绝；browser刷新读取 |
| 响应式/投影/键盘/触屏/reduced-motion | 共享Board + T08 CSS | T08 Playwright与截图 |

页面没有复制落子、提子、超级劫、数气或面积算法。界面只组装T01公开结果与T02受控Board。

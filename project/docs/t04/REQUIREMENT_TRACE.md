---
schemaVersion: 1
id: DOC-T04-REQUIREMENT-TRACE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T04 要求追踪

| 要求 | 实现 | 验收证据 |
|---|---|---|
| 点棋子选整块；空点解释 | `LibertyLab.tsx` 调用 T01 `getGroup`；Board `group` 双线标记 | `tests/t04/liberty-lab.test.tsx`；浏览器键盘/触屏流 |
| 自由观察、圈气、先猜再验证 | 三个原生 radio 模式；提交前 `revealed=false` | 单元封题检查；`t04.spec.ts` DOM/ARIA 泄题检查 |
| 点集漏选/误选/重复 | `evaluateLibertySet` | `evaluation.test.ts`；浏览器圈选流 |
| 数字原因反馈与输入边界 | `evaluateLibertyCount` 稳定错误码 | 空、负、非整数、偏多/少单元与浏览器测试 |
| 8 个稳定演示和教师说明 | `content/t04/liberty-demos.json` | schema 校验；固定向量；目录和预期文档 |
| 共享引擎交叉核对 | `rulesEngine.getGroup/getLiberties/validateSetup` | `demos.test.ts` 9 个状态向量 |
| 重试、重置、切换清空 | `clearResponse/resetTask/changeDemo/changePhase` | 组件测试；全部 8 演示浏览器流 |
| 任务定义不被交互修改 | `LIBERTY_DEMOS` 递归冻结 | `demos.test.ts` 冻结断言 |
| 两人实体延伸与提子入口 | 正确答复后 `physical-followup`；T05 0.6.0 已注册为 available | T04/T05 组件和浏览器完成流；缺内容时回到第二阶段 |
| 手机、投影、键盘、触屏、减少动画 | T02 Board + T04 响应式 CSS | Chromium 360/768/1280、touch、keyboard、grayscale、reduced-motion 截图/测试 |

T04 没有摆棋编辑、提子动画、棋力评价、策略 AI、正式题库或人类教学审核；这些边界在页面、验收和交接中均保持明示。

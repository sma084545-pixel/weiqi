---
schemaVersion: 1
id: DOC-T06-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T06 验收表

| 验收项 | 状态 | 证据 |
|---|---|---|
| 非法摆棋保留、不自动提子、不能进入规则模式 | 通过 | 无气块 model/machine/浏览器案例 |
| 修复后建立唯一 fresh 起点 | 通过 | `history.layouts` 恰为 1；固定 fixture 与浏览器 |
| 规则模式轮流下、停手、撤回/重做 | 通过 | T01 复用；machine/browser |
| 编辑与对局撤回不混淆 | 通过 | 独立栈单元测试；往返浏览器流程 |
| 新编辑截断旧 redo | 通过 | model/browser |
| 切尺寸预告损失且可撤回 | 通过 | 9→5 独立预期、model/browser |
| 往返切换不重复提子或伪称旧历史 | 通过 | `returnToSetup` 一次编辑；machine/browser |
| Position 导出经共同校验器重读 | 通过 | storage 单元；浏览器下载检查 |
| 盘面、轮次、标记完整回读 | 通过 | ContentBundle storage 单元和本机保存/读取浏览器流程 |
| 四尺寸语义与共享 Board | 通过 | model 支持 5/9/13/19；T02 全尺寸回归 |
| 键盘、触屏、360/768/1280 | 通过（自动） | Chromium 1.62.1 与截图 |
| 投影、灰度、reduced-motion | 通过（自动/视觉） | T06 Playwright 与投影灰度截图 |
| Safari、Firefox、实体设备、专用辅助技术 | 未测 | 本次未运行这些浏览器、硬件和读屏器 |
| 真人教师审核与实际课堂使用 | 未测 | 没有生成实施记录或人员审核结论 |

失败项：无。自动测试覆盖列出的代码路径和本次 Chromium 环境；不证明任意导入、所有浏览器或实际教学效果。

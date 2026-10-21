---
schemaVersion: 1
id: DOC-T04-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T04 验收表

| 项目 | 状态 | 证据 |
|---|---|---|
| 8 个演示结构与稳定 ID | 通过 | `pnpm validate:content` 接受 T04 bundle；连续 `DEMO-LIB-001`–`008` 单元断言 |
| 逐布局棋块、斜邻、共享气与连接前后 | 通过 | 独立 fixture 9 个状态与 T01 `getGroup/getLiberties` 交叉核对 |
| 点击棋子选整块、空点说明 | 通过 | 组件测试；Board `group` 标记；浏览器键盘/触屏流 |
| 预测前可见文本和辅助标签不泄题 | 通过 | 组件与真实 Chromium 检查无气环、核对结果、答案说明或答案 aria-label |
| 圈点漏选、误选、去重 | 通过 | 纯函数单测及浏览器错选/重试/正确提交 |
| 数字空值、负值、非整数及原因反馈 | 通过 | 单元测试和 Chromium 三类拒绝、偏少原因与正确揭示 |
| 重试、重置、切换演示 | 通过 | 组件与浏览器测试清除输入、气环、反馈和完成状态 |
| 键盘和触屏圈点 | 通过 | Chromium 方向键 + Space；mobile/touch `tap`，候选数逐次增加且无重复回调 |
| 360/768/1280、投影、灰度、reduced-motion | 通过 | 8 项 T04 Playwright；`output/playwright/t04` 四张关键截图经人工逐图查看 |
| 既有工程回归 | 通过 | `pnpm test`：16 文件 / 212 测试；`pnpm test:browser`：22 测试 |
| 干净锁定安装、完整 check | 通过 | 临时新副本 `pnpm install --frozen-lockfile` 后完整 `pnpm check` 通过；命令报告 |
| 完整归档及文件哈希 | 通过 | `scripts/package-t04.py` 校验文件级哈希与 ZIP CRC；delivery manifest 与 SHA256SUMS |
| Safari、Firefox、实体手机/平板/投影 | 未测 | 当前只有 Playwright Chromium 151 自动化；需在目标设备按使用说明复核 |
| VoiceOver、TalkBack、JAWS 与真人可用性 | 未测 | 自动 DOM/ARIA 和键盘检查不能代替专用辅助技术或真实使用者 |
| 人类教师审题、实体棋盘课堂试用、实施成效 | 未测 | `humanReviewed=null`；没有虚构反馈、出勤、照片或效果 |

当前通过只证明 T04 功能范围与既有自动回归。正式 30 题、提子实验室及线下实践不在本任务内。

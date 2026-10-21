---
schemaVersion: 1
id: DOC-T10-ACCESSIBILITY-QA
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 可访问与响应式检查

- 原生 fieldset、legend、label、button、input、textarea、details 与 heading 表达结构；反馈用礼貌 live status。
- T02 Board 保持 roving focus、方向键、Enter/Space、可读显示坐标和交叉点状态。占用点标为“占用，不可落”。
- 按钮和选项最小操作高度 48px；触屏没有 hover 依赖；焦点沿用全站 3px 可见轮廓。
- success、failure、unknown、discussion 与 illegal 同时使用图标、文字和边框，不只靠颜色。
- 360px 折为单列，768px 棋盘与答案上下排列，1280px 双栏；页面无水平溢出，棋盘自己的小屏滚动语义保持不变。
- `prefers-reduced-motion: reduce` 下题目回应立即到达并关闭视觉过渡；普通模式的 500ms 回应定时器在换题、重置、离开或卸载时清除。

实际 Chromium 自动检查见 `tests/browser/t10.spec.ts` 与 `output/playwright/t10/`。未实际测试 Safari、Firefox、实体手机、实体平板、投影仪、VoiceOver、TalkBack、JAWS 或高对比专用辅助技术。

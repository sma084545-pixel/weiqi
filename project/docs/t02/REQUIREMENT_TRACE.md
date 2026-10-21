---
schemaVersion: 1
id: DOC-T02-REQUIREMENT-TRACE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T02 要求追踪

| 要求 | 实现 | 自动验证 |
|---|---|---|
| 受控 Board、四尺寸 | `Board.tsx`、`contract.ts`、`board.types.ts` | `tests/board.test.tsx` 四尺寸、输入不变、回调路由 |
| N² 交点与 N+N 线、边角命中 | `Board.tsx` SVG线层与完整按钮网格 | 单元测试计数；`t02.spec.ts` 实点四角及 B9 |
| 六类标记、优先级、灰度 | `Board.tsx` + `Board.css` | 标记 DOM/读屏单测；Chromium 灰度截图 |
| 坐标与读屏文字 | 共享 `displayCoord`，每点 `aria-label` | A/J/T、上下行、棋色/占点/不可用断言；内置浏览器 AX 树 |
| 点击、触摸、键盘、焦点 | 原生 button、roving tabindex、箭头/Home/End | jsdom 焦点边界；Chromium 触屏单回调与键盘返回；内置浏览器实操 |
| 悬停仅适用设备 | `@media (hover:hover) and (pointer:fine)` | Chromium 按其媒体能力断言；触屏上下文预览保持隐藏 |
| 投影、响应式、19路局部滚动与复位 | `displayMode`、CSS容器、`zoom/resetViewKey` | 360/768/1280、投影尺寸、19路 scrollWidth、缩放后 B18、复位 |
| 减少动画和安全文本 | reduced-motion/forced-colors 样式；React文本渲染 | computed style；脚本标签负例 |
| 四种开发示例与 T01 集成 | `Home.tsx` | 页面角色/模式切换、play 占点拒绝；T01 182项总回归 |

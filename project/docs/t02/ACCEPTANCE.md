---
schemaVersion: 1
id: DOC-T02-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T02 验收表

验收日期：2026-09-10。baseVersion=0.2.0，resultVersion=0.3.0。开发棋形均标为 `DEV-T02-*`，不作为正式课程、学生反馈或实施成效。

| 验收项 | 结果 | 证据 |
|---|---|---|
| 受控组件、5/9/13/19、N²交点、N横+N竖 | 通过 | `tests/board.test.tsx`；四尺寸得到25/81/169/361交点及5/9/13/19两轴线 |
| 四角和边界相邻点命中、坐标跳I | 通过 | Chromium 在360/768/1280逐一点击A9、B9、J9、A1、J1；固定预期见 `EXPECTED_GEOMETRY.md` |
| 容器变化与缩放后命中 | 通过 | 360px下19路局部滚动；100%→125%后点击(1,1)读B18；复位为100%且滚动归零 |
| 单次手势无重复回调、占点不提交 | 通过 | Playwright `hasTouch/isMobile`：轻触A9仅1次；落黑后再触同点保持1次并读“占用，不可落” |
| 键盘完成选点与返回 | 通过 | 方向键A9→B9、Space选择、Tab到返回按钮、Enter回到首个模式；内置浏览器也完成同一路径 |
| 读屏描述与焦点 | 通过 | AX树逐点读坐标、空/黑/白、可操作/占用/不可用与标记；roving tabindex仅1个入口，焦点样式可见 |
| 六类标记、叠放、灰度 | 通过 | 单元测试核对DOM/文字；`1280-markers-grayscale.png`逐图查看，形状、文字和边框可区分 |
| hover与触屏区分 | 通过 | CSS仅在hover+fine启用；Chromium按媒体能力断言；触屏上下文预览opacity=0 |
| 投影、360/768/1280、19路局部滚动 | 通过 | 7项浏览器测试；截图目录 `output/playwright/t02`；根页面均无横向溢出 |
| reduced-motion | 通过 | 模拟reduce后预览transition/animation为0；滚动为auto |
| 四种示例与T01集成 | 通过 | 首页可切只读/选点/落子/标记；落子调用共享`rulesEngine.tryMove`，占点拒绝 |
| 全工程回归与schema负例 | 通过 | `CI=true pnpm check`：10文件182测试、10个有效内容、4个预期无效内容、前端/引擎构建与引擎容量检查通过 |
| 干净安装和构建 | 通过 | 最终源码新目录 `/private/tmp/go-club-t02-final-clean.JLxRKg`：`pnpm install --frozen-lockfile`后同一`pnpm check`全通过 |
| 人工视觉核对 | 通过 | 同次打开概念图、1280成品、360×19路、灰度成品；无重叠、裁切或整页横向溢出，棋子中心对准交点 |

## 实际运行命令

```sh
pnpm install --frozen-lockfile
CI=true pnpm check
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

浏览器套件使用Playwright 1.62.1配套 Chromium 151.0.7922.34，共7项通过。另用Codex内置浏览器实屏读取AX树并操作。最初尝试离线干净安装时本机内容仓缺少`react-dom`压缩包，结果为失败；随后按同一锁文件联网安装并在全新目录通过。这项已修复的环境失败不代表产品失败。

## 未测与证据边界

- 未在真实手机、平板、教室投影设备上操作；360/768/1280是Chromium视口模拟，投影是界面模式和尺寸计算。
- 未实测Safari、Firefox、VoiceOver、TalkBack、JAWS或Windows高对比度；实现了ARIA、forced-colors和减少动画，但不能把自动化等同这些辅助技术的真人使用。
- 未进行学生、教师或学校现场测试；没有humanReviewed、活动反馈、CAS认可或效果数据。
- 本任务不实现课程页、正式题库、自动死活、AI建议、在线同步或完整离线PWA。

T02范围没有未解决的规则错误、接口冲突或阻断核心用途的问题。

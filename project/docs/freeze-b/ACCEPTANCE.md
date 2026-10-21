---
schemaVersion: 1
id: FREEZE-B-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 冻结点 B 验收

执行日期：2026-09-19。状态“通过”仅指表内范围。

| 项目 | 状态 | 实际证据 |
|---|---|---|
| 唯一 T15 0.15.0 输入与 T20 材料边界 | 通过 | `evidence/input-integrity.json`；777 个基线文件 SHA-256 匹配，T20 两包材料字节一致 |
| 30 题、6 终局、唯一 ID/revision、开发集合隔离 | 通过 | `python3 scripts/freeze-b/audit-content.py`；`evidence/content-audit.json` |
| schema 与独立预期、全部记录手、限定目标 | 通过 | `node --import tsx content/tools/validate.mjs`；851 检查、134 手、2179 转移；不称作 2179 个独立测试 |
| 判题未知分支与正式文件完整性 | 通过 | `node content/tools/test-grade.mjs`（20+1）；`node scripts/verify-merge-a.mjs`（201 文件） |
| 全量主线与引擎 | 通过 | `evidence/checks.json` 中14条实际命令；41 文件341单元测试，TypeScript/Vite/引擎构建、类型与容量检查 |
| 浏览器回归 | 通过 | `./node_modules/.bin/playwright test --config scripts/freeze-b/playwright.config.ts --workers=1`；`evidence/browser-check.log`：120项，包含既有手机/平板/桌面与触控/键盘用例 |
| T09 导出棋子位置、颜色、尺寸与演示备注 | 通过 | `python3 content/tools/validate_exports.py`；28243断言，36SVG、54PDF页、36PPT页与备注 |
| T20 在当前引擎下的规则与印刷检查 | 通过 | `python3 scripts/freeze-b/run-t20-checks.py`；9引擎检查、59几何检查；隔离副本重生成数据/SVG无差异 |
| T20 Position schema | 通过 | `node --import tsx scripts/freeze-b/check-material-schema.mjs`；9个 Position |
| 现有 PDF 数字渲染与目检 | 通过 | `python3 scripts/freeze-b/render-review.py`；70页重新渲染，逐页联系表查看；T20灰度抽查3/5页；`evidence/visual-review.json` |
| 冻结文件完整性与开发内容排除 | 通过 | `node scripts/verify-content-freeze.mjs`；归档时重复执行，逐文件SHA-256、精确集合、bundle一致 |
| 新归档重新解压、关键文件、构建与内容重验 | 通过 | 两个包均在新目录通过冻结校验；完整包另通过 schema、内容、判题、341项单元测试、TypeScript 与 Vite 构建；见交付目录 `archive-integrity.json` 和 fresh-check 日志 |
| 人类围棋教师复核、真实课堂反馈 | 未测 | 所有 humanReviewed=null；没有虚构评价或实施成效 |
| 实体打印、裁切套准、手机/投影器实机 | 未测 | 仅数字尺寸、渲染和 Chromium 模拟；需要持成品实测 |
| Safari/Firefox、专用读屏器、原生 Office/Keynote | 未测 | 本次未运行相应环境；PPT仅机器结构/坐标/备注重验，继承旧渲染记录 |
| 干净联网重新下载依赖 | 未测 | 使用 T15 锁定的本机依赖；锁文件未改 |

## 失败尝试与解决

首次 `pnpm check` 触发包管理器自动安装检查，联网失败且无 TTY，测试尚未开始；见 `evidence/mainline-check.log`。改为调用现有锁定依赖和 package 脚本中的实际命令，14条全部通过。完整重现列表在 `evidence/checks.json`。首次浏览器监听本机端口出现 EPERM，见 `evidence/browser-sandbox-attempt.log`；随后提升执行权限完成120项。

非阻断输出：Vite 单 bundle 超过500 kB；既有测试环境有 React act 提示。没有把提示写成失败，也没有扩大本次范围去重写已有界面。必需内容核对无未解决阻断。T20 原始报告的旧 engineVersion 与 T09 固定 checkedAt 只作来源信息，本次运行环境由冻结证据记录。

---
schemaVersion: 1
id: DOC-T17-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T17 验收与证据

taskId=T17；baseVersion=T16 0.16.0；resultVersion=0.17.0；日期 2026-10-05。本次测试是自动化开发验证与助手视觉检查，**没有真实成员反馈、课堂实施、人类教师复核或学校 CAS 认定**。开发例和测试上下文不作为真实证据。

| 验收 | 状态 | 实际证据 |
|---|---|---|
| 三项可跳过；活动编号/日期；不要求个人资料 | 通过 | t17.spec：空态禁提交、跳过链接、显式键盘提交；model 日期负例 |
| 0 条无伪评价；原文/选项/缺失/分母 | 通过 | model 与 browser 固定 3 条；舒服 1、偏难 1、难度缺失 1；找气 2、偏好缺失 1；建议缺失 1，分母均 3 |
| 同次重复提交只一份；下一成员空表 | 通过 | 同步连续两次 button.click 只有一份；成功后原文不显示；下一份各字段为空 |
| 测试默认不导出；同意与范围清楚 | 通过 | 默认导出固定测试为 0；显式包含为 3 并标非真实；未 consent 的实际流程样例排除 |
| 改进日志关联原资源和新 revision | 通过 | LIB-001@1 只读；LOCAL 副本 r1/r2 和前后快照；验证重置、草稿未发布、未实施/未观察 |
| 多条原子保存失败不破坏原库 | 通过 | 故意在第二条 IndexedDB put 抛 QuotaExceededError，刷新后没有假版本关联；整体 rollback |
| CAS 分类与手填时间、空反思 | 通过 | 手填 12 分钟，真实实施空仍显示未实施；无工时换算或生成经历 |
| 删除一条只影响该条；独立清除 | 通过 | 3→2，其他答复逐字保留；progress clear 保留 evidence；evidence clear 保留 T14 草稿 |
| Markdown/JSON/PDF 预览删减与安全文本 | 通过 | 导出不含删减的电话测试文本，原文保留；HTML 不执行；报告只用 textContent；不导出题目快照 |
| 刷新/完整备份恢复 ID/revision | 通过 | 备份 evidence value 恢复后与原值相等，条数与稳定身份完整 |
| 实际断网仍能填写保存 | 通过 | context.setOffline(true) 后刷新已准备应用，建立活动、反馈、汇总可用；不是只看缓存代码 |
| 手机/平板/桌面、键盘/触屏、减少动画 | 通过 | 360/768/1280px reducedMotion 与 touch；无横向页面溢出，页脚点击区域修复至 44px |
| 规则/schema/冻结题库不变 | 通过 | 冻结 201 文件逐 SHA-256；正式 30 题+6 终局均 revision 1；旧引擎全部回归 |
| 真实成员、教师复核、实体设备/打印、专用辅助技术 | 未测 | 无现场/人类输入，不将开发测试冒充实测 |
| Safari/Firefox、隐私模式/真实磁盘配额 | 未测 | 本次 Chromium 自动化；配额故障仅注入模拟 |

## 实际命令

本环境使用 Node 24.19.0 和 T16 已锁定的依赖；`node_modules` 链接到冻结主线依赖，不包含在交付。npx/pnpm 通用包装器在此环境不可直接用于稳定执行，以下是实际运行的等价命令；README 提供正常 pnpm 工作流。没有重新联网下载依赖，锁文件字节未变。

```sh
export PATH=/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
node scripts/generate-types.mjs --check
./node_modules/.bin/vitest run
node --import tsx scripts/validate-content.ts
node --import tsx content/tools/validate.mjs
node content/tools/test-grade.mjs
node --import tsx scripts/validate-t17.ts
node scripts/verify-merge-a.mjs
node scripts/verify-t16-freeze-preservation.mjs
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vite build
node scripts/finalize-offline.mjs
node scripts/verify-t16-refresh.mjs
./node_modules/.bin/vite build --config vite.engine.config.ts
./node_modules/.bin/tsc -p tsconfig.engine.json
node scripts/finish-engine-build.mjs
node scripts/engine-smoke.mjs
./node_modules/.bin/tsc -p tsconfig.engine-smoke.json
node scripts/engine-capacity.mjs
./node_modules/.bin/playwright test --workers=1
```

全单元/组件/文档 **43 文件、358 项通过**，其中 T17 12 项；全 Chromium **148 项通过**，其中 T17 17 项。T09 851 检查、134 条记录着法、2179 规则转移、30 题/6 终局；判题适配 20 项；独立引擎与 12.7MB 重放往返通过。基础开发例 13 有效/4 预期无效；T17 主版本负例错误定位 /schemaVersion。

日志：`output/validation/T17/final-core-regression.log`、`final-browser-regression.log`、`command-report.json`。归档重新解压后的复验在交付目录 `archive-recheck.log`/`archive-recheck.json`；同时核对 CRC、release-manifest 逐文件哈希与 SHA256SUMS。

## 视觉检查

逐一查看 360/768/1280 成员表与教师汇总截图，以及标为测试的三份答复汇总。排版、文字、缺失计数、原文隔离和操作控件可读，页面无横向溢出。截图目录 `output/playwright/t17`。

Chromium 导出 A4：`output/pdf/T17-empty-report.pdf` 1 页、`T17-development-report.pdf` 2 页。使用 pdftoppm 渲染并逐页查看，标题/测试标签/空态/反思模板完整，无文字裁切或重叠。没有实际按实体打印机出纸。报告源与页面都是可编辑文本，不是截图。

## 已解决问题与限制

初轮键盘在选择框按 Enter 会触发隐式提交，改为显式按钮提交；专项键盘/触屏通过。首轮全回归发现页脚链接只有 18px 高，增加 44px 点击区域，最终 148 项全部通过。多条 put 的同步异常曾需显式 abort，已修复并用第二条失败注入核查。

Vite 提示主 JavaScript 超过 500kB（约 971kB，gzip 252kB），作为后续性能优化项；不是规则、保存或缓存失败。PDF 通过本机打印窗口另存；弹窗限制提供 Markdown 恢复路径。首次离线未准备、file:// 部署边界继续按 T16 提示。少量开发验证不证明所有浏览器或通用教学成效。

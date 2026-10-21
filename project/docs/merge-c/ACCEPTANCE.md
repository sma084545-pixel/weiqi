---
schemaVersion: 1
id: MERGE-C-ACCEPTANCE
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 验收表

| 检查 | 状态 | 实际证据 |
|---|---|---|
| 六个输入 ZIP CRC 与 SHA-256、交接版本 | 通过 | input-inventory.json |
| 选择性合并、原程序不覆盖 | 通过 | merge-manifest.json；1087 个 T17 文件逐字节一致，checks/baseline-preservation.json |
| 30 正式题、6 终局与冻结 revision | 通过 | 851 内容检查；201 冻结文件检查；checks/command-09.log、command-10.log |
| T18 演示棋盘 | 通过 | 47 检查，checks/command-01.log |
| T19 双人纸棋盘 | 通过 | 44 几何检查，checks/command-02.log |
| T20 规则与印刷材料 | 通过 | 9 引擎演示与 59 印刷检查，checks/command-03.log、command-04.log |
| T21 卡片与答案 | 通过 | 冻结 ID/revision、30 正反面映射；重建与原输出 103 项 SVG/JSON/页数尺寸文字比较一致，checks/t21-rebuild-comparison.json |
| T22 引擎及课件 | 通过 | 冻结引擎和当前主线各 47 检查；50 幻灯与 50 备注、30 种棋盘，checks/t22-delivery-retry.log、t22-mainline-readonly.log |
| 五类材料载荷/版面 | 通过 | 959 机器检查、58 PDF/216 页/6 PPTX，checks/material-audit.json；VISUAL_REVIEW.md |
| 实际资源目录链接 | 通过 | 91 个文件链接全部存在，checks/catalog-links.json |
| 主线单元测试 | 通过 | 43 文件、358 测试，checks/command-08.log |
| schema 生成、类型及生产构建 | 通过 | checks/command-07.log、command-11.log、command-12.log、command-13.log |
| 导航/题目播放器/围地页面回归 | 通过 | Chromium 25 测试，checks/navigation-browser.log；覆盖 360/768/1280px |
| 其他主线检查与编辑刷新恢复 | 通过 | checks/mainline-extra-commands.json 及 11 份日志 |
| 归档重新解压、完整性、构建及内容校验 | 通过 | 交付目录 ARCHIVE_RECHECK.json 及 archive-recheck-logs/；完整载荷清单 MERGE_C_RELEASE_MANIFEST.json |
| T22 验证器最初系统 Python 缺 lxml | 失败后已解决 | checks/command-06.log；已有配套 Python 重试成功，无残留阻断 |
| 新机器从零联网安装依赖 | 未测 | 本次使用与锁文件配套的现有依赖；按根 README 使用 pnpm install --frozen-lockfile 重现 |
| PowerPoint/Google Slides、实体打印与课堂实施 | 未测 | VISUAL_REVIEW.md；不冒称人类审查或活动成效 |

完整实际命令及工作目录保存在 checks/commands.json、checks/mainline-extra-commands.json。材料验证器可能生成输出，所以在隔离 validation/go-club 副本运行，避免覆盖正式材料；本次只读审计在主线运行。复现顺序：安装根锁文件依赖；运行根 README 的检查和构建；执行 python3 scripts/audit-merge-c.py、python3 scripts/catalog-merge-c.py、node scripts/verify-merge-c-t22.mjs。审计 Python 需 PyMuPDF 与 Pillow；T22 verify-delivery.py 还需 lxml 与 NumPy，使用具备这些库的解释器。

已知限制：既有生产构建主 JS 约 971kB（gzip 252kB）的分包警告仍存在；本次不修改应用架构。材料 PDF/PPTX 位于工程材料目录，没有新增到应用离线缓存。离线使用纸面资源应提前下载这些文件。T23/T24 未开始。

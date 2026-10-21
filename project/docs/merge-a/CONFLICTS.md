---
schemaVersion: 1
id: DOC-MERGE-A-CONFLICTS
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 合并 A 冲突与解决

## 已解决：旧引擎产物指纹

T09 的 `apply_patch.py --dry-run` 要求目标的 `dist-engine/go-club-rules.mjs` 与 T01 0.2.0 指纹完全相同。T08 0.9.0 的 schema 指纹和锁文件指纹与 T09 相同，但规则库构建产物 SHA-256 已从 T09 记录的 `028ff1...` 变为 T08 的 `ed5074...`。应用器因此退出 1，并明确输出 `nothing written`。这是安全拒绝，未产生半合并。

解决方式没有降低检查或切换规则：先确认 `schemas/content.schema.json` 和 `pnpm-lock.yaml` 字节一致，再从 T09 的 FILE_MANIFEST 逐项验证并只复制允许的 `content/**` 与 `handoff/T09.md`。随后用 T08 原归档规则库运行 T09 的完整重放，851 项检查、134 手记录、2179 个状态转移、30 题和 6 终局全部通过；判题适配器 21 项检查通过。规则库代码、`src/`、`schemas/` 和 `tests/` 都保持 T08 原字节。

## 无内容路径冲突

导入前，T09 清单的 200 个文件及清单自身在 T08 目标中均不存在，因此没有同名不同内容。所有导入文件复制后再次核对 SHA-256；`scripts/verify-merge-a.mjs` 会持续检查这 201 个文件。

## 已解决：本机测试环境

- 隔离目录执行离线安装时，本机 pnpm 缓存缺少锁定的 `react-dom@19.2.8` 压缩包。没有更改版本或锁文件；最终测试使用 T08 已安装、与同一锁文件精确匹配的依赖树。网络干净安装未在本次重复执行。
- 第一次 Playwright 启动被沙箱拒绝绑定 `127.0.0.1:4188`。获得本地预览端口执行权限后，同一套 66 项 Chromium 回归全部通过。

## 未解决冲突

无。T10 未开始。

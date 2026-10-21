---
schemaVersion: 1
id: DOC-MERGE-A-VALIDATION
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 合并 A 验收与验证

## 验收表

| 项目 | 状态 | 证据 |
|---|---|---|
| T08/T09 输入 ZIP 完整、路径安全 | 通过 | `output/validation/MERGE_A/input-integrity.log`；两个 ZIP CRC 通过且无路径穿越 |
| T09 FILE_MANIFEST 大小与 SHA-256 | 通过 | 201 个导入文件逐项匹配；`scripts/verify-merge-a.mjs` |
| 规则/schema 兼容 | 通过 | schema、锁文件一致；T08 原规则库完成全部 T09 重放；`base-preservation.json` |
| 30 道正式题、6 个终局、ID/revision | 通过 | 六类各 5 题，END-001–006，均 r1；无 DEV/DEMO/TEMPLATE/TEST 混入 |
| 内容与有限变化核查 | 通过 | 851 checks、134 recorded moves、2179 transitions；`content-validation.log` |
| 判题适配器 | 通过 | 21 项；包含合法未覆盖返回 unknown、多解、无效输入不改状态和开放讨论 |
| 图示/阅读材料/演示稿导出 | 通过 | 28,243 checks；36 SVG、54 PDF 页、36 PPT 页及备注 |
| T08 主线完整检查和构建 | 通过 | 26 个测试文件、264 项；schema、基础内容、T09、TypeScript、Vite、独立 ESM、容量全部通过 |
| Chromium 回归 | 通过 | 66 项；T00–T08、360/768/1280、键盘、触屏模拟、投影、灰度、reduced-motion |
| T08 源码/测试/schema/规则库保护 | 通过 | `src` 52 文件、`tests` 41 文件、schema 和规则库聚合/单文件哈希与 T08 相同 |
| 候选归档回解、完整检查 | 通过 | 重新解压后 264 项测试、T09 851/21 项检查、构建、独立引擎与清单检查通过 |
| 纯离线全新安装 | 失败（环境） | 本机缓存缺少锁定的 `react-dom@19.2.8` tarball；未改依赖，归档回解使用同锁文件的 T08 依赖树构建 |
| Safari、Firefox、实体设备、专用辅助技术 | 未测 | 没有把 Chromium 自动化写成这些环境通过 |
| 人类围棋教师复核、真实打印、课堂使用、原生 Office | 未测 | `humanReviewed` 保持 null；沿用 T09 证据边界 |

## 实际命令

在合并工程根目录使用 Node 24.19.0、pnpm 11.19.0：

```sh
node --import tsx content/tools/validate.mjs
node content/tools/test-grade.mjs
python3 content/tools/validate_exports.py
pnpm check
pnpm test:browser
node scripts/verify-merge-a.mjs
```

实际完整输出保存在 `output/validation/MERGE_A/`。`pnpm check` 已将前三类 Node 检查中的 T09 内容验证、判题测试和清单检查纳入今后持续执行。

## 证据边界

END-001–005 仍是 `teaching-assumption` 且 `confirmedBy=[]`；END-006 仍是 `unsettled`、`expectedScore=null`。自动检查只证明结构、规则重放、有限变化、固定预期和导出一致性；不证明通用死活、最佳策略、人类审题或课堂效果。

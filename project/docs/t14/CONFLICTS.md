# T14 冲突与解决记录

1. T13 的 `Puzzle` schema 要求数字答案始终为 number，但 T14 草稿需要真正的空白输入。没有修改 schema；在本机草稿元数据增加 `numberAnswerText`，仅在零或正整数时同步，发布时单独检查空白/负数/小数。
2. 正式题与本机新 revision 共用稳定 ID，直接拼接目录会产生重复卡片。T10 目录现在对本机发布题按 ID 选最高 revision，并替换同 ID 的正式旧版；正式 JSON 本身不变。
3. pnpm 包装器在隔离工作目录尝试重建依赖并因禁网失败。锁文件与依赖版本未变；恢复 T13 已验收冻结依赖后，直接调用锁定的本地 TypeScript、Vite、Vitest 和 Playwright 完成验证。干净网络环境仍可按 README 执行 `pnpm install --frozen-lockfile`。
4. 768px 下编辑器标题带宽为视口多 8px。把 1000px 以下标题外边距从 -32px 收窄为 -16px，复测 360/768/1280 均无横向溢出。

没有修改 GO-CLUB-AREA-1、schemaVersion=1、坐标、T01 引擎、T02 Board、T09 正式题或 END 数据。

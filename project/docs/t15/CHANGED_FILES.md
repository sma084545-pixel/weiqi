# T15 变更清单

## 新增

- `src/features/file-exchange/`：类型、JSON、SGF、存储、图形导出、页面和响应式样式。
- `content/t15/`：JSON/SGF 往返样例、SVG/PNG/PDF/ZIP 样例与说明。
- `tests/t15/`、`tests/browser/t15.spec.ts`：16 项纯逻辑与 11 项浏览器验收。
- `scripts/create-t15-samples.ts`、`render-t15-png.mjs`、`verify-t15-preservation.mjs`、`package-t15.py`。
- `docs/t15/`：格式、导入、图形、安全、往返、冲突、可访问、验收、输入和保存证据。
- `handoff/T15.md`、`output/validation/T15/command-report.json`、`output/playwright/t15/`、`output/pdf/t15/`。

## 更新

- `src/features/learning-hub/registry.ts`、`LearningHub.tsx`：注册真实 T15 教师入口与路由。
- `package.json`：版本 0.15.0 与 T15 检查脚本；没有依赖版本变化。
- `README.md`、`CHANGELOG.md`、`SOURCES.md`、`docs/PROJECT_CONTRACT.md`、`docs/INTERFACES.md`、`docs/requirements-matrix.md`。
- `dist/`、`dist-engine/`：从当前源码重建。

## 明确未改

`docs/t15/preservation-report.json` 证明 24 组 264 个受保护文件与 T14 完整归档字节一致，包括 30 正式题、6 终局、内容图示、共同 schema、T01、T02、T10–T14 功能源文件和 `pnpm-lock.yaml`。


# T14 变更清单

- 新增 `src/features/teacher-editor/`：编辑页面、草稿模型、T01 变化树验证、本地存储、模板适配和样式。
- 新增 `content/t14/templates.json` 与 `scripts/create-t14-templates.py`：四个 TEMPLATE 开发模板。
- 更新 `src/features/puzzle-runner/PuzzleRunner.tsx`：读取明确发布的本机题，同 ID 采用最高本机 revision。
- 更新 `src/features/learning-hub/registry.ts`、`LearningHub.tsx`：注册 `#/teacher/editor` 并加入教师视图。
- 新增 `tests/t14/`、`tests/browser/t14.spec.ts`：模型、组件、浏览器、触屏、键盘和尺寸验收。
- 新增 `scripts/verify-t14-preservation.mjs`、`scripts/package-t14.py` 与 T14 文档/交接/验证记录。
- 更新 `package.json`、README、CHANGELOG、SOURCES、项目契约、接口和责任矩阵。`pnpm-lock.yaml` 未改变。

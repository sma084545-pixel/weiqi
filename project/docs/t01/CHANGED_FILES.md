---
schemaVersion: 1
id: DOC-T01-CHANGED-FILES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T01逐文件变更

baseVersion=0.1.0；resultVersion=0.2.0。对照输入清单的原始SHA-256；构建物/报告也列出。完整文件哈希在release-manifest.json。来源、schema、锁、原T00交接及UI组件保留。

| 变更 | 相对路径 |
|---|---|
| 修改 | `.gitignore` |
| 修改 | `CHANGELOG.md` |
| 修改 | `README.md` |
| 修改 | `SOURCES.md` |
| 新增 | `dist-engine/README.md` |
| 新增 | `dist-engine/THIRD_PARTY_NOTICES.md` |
| 新增 | `dist-engine/go-club-rules.mjs` |
| 新增 | `dist-engine/go-club-rules.mjs.map` |
| 新增 | `dist-engine/package.json` |
| 新增 | `dist-engine/types/constants.d.ts` |
| 新增 | `dist-engine/types/content.generated.d.ts` |
| 新增 | `dist-engine/types/coordinates.d.ts` |
| 新增 | `dist-engine/types/persistence.d.ts` |
| 新增 | `dist-engine/types/rules/contract.d.ts` |
| 新增 | `dist-engine/types/rules/engine.d.ts` |
| 新增 | `dist-engine/types/rules/errors.zh.d.ts` |
| 新增 | `dist-engine/types/rules/game-store.d.ts` |
| 新增 | `dist-engine/types/rules/index.d.ts` |
| 新增 | `dist-engine/types/rules/internal.d.ts` |
| 新增 | `dist-engine/types/rules/placement.d.ts` |
| 新增 | `dist-engine/types/rules/scoring.d.ts` |
| 新增 | `dist-engine/types/rules/topology.d.ts` |
| 新增 | `dist-engine/types/validation.d.ts` |
| 修改 | `docs/CHANGED_FILES.md` |
| 修改 | `docs/CONTENT_SCHEMA.md` |
| 修改 | `docs/INTERFACES.md` |
| 修改 | `docs/PROJECT_CONTRACT.md` |
| 修改 | `docs/requirements-matrix.md` |
| 新增 | `docs/t01/ACCEPTANCE.md` |
| 新增 | `docs/t01/CHANGED_FILES.md` |
| 新增 | `docs/t01/ENGINE_USAGE.md` |
| 新增 | `docs/t01/EXPECTED_RESULTS.md` |
| 新增 | `docs/t01/RULE_TRACE.md` |
| 新增 | `docs/t01/input-manifest.json` |
| 新增 | `handoff/T01.md` |
| 新增 | `output/validation/T01/capacity-report.json` |
| 新增 | `output/validation/T01/check.log` |
| 新增 | `output/validation/T01/clean-install.log` |
| 新增 | `output/validation/T01/command-report.json` |
| 新增 | `output/validation/T01/dev-start.log` |
| 修改 | `output/validation/content-report.json` |
| 修改 | `package.json` |
| 修改 | `release-manifest.json` |
| 修改 | `scripts/clean-verify.sh` |
| 新增 | `scripts/engine-capacity.mjs` |
| 新增 | `scripts/engine-smoke.mjs` |
| 新增 | `scripts/engine-types-smoke.ts` |
| 新增 | `scripts/finish-engine-build.mjs` |
| 修改 | `scripts/package-release.py` |
| 新增 | `scripts/verify-t01.py` |
| 修改 | `src/core/persistence.ts` |
| 修改 | `src/core/rules/contract.ts` |
| 新增 | `src/core/rules/engine.ts` |
| 修改 | `src/core/rules/errors.zh.ts` |
| 新增 | `src/core/rules/game-store.ts` |
| 新增 | `src/core/rules/index.ts` |
| 新增 | `src/core/rules/internal.ts` |
| 新增 | `src/core/rules/placement.ts` |
| 新增 | `src/core/rules/scoring.ts` |
| 新增 | `src/core/rules/topology.ts` |
| 修改 | `src/core/validation.ts` |
| 新增 | `tests/fixtures/rules-vectors.json` |
| 新增 | `tests/t01/helpers.ts` |
| 新增 | `tests/t01/import.test.ts` |
| 新增 | `tests/t01/properties.test.ts` |
| 新增 | `tests/t01/rules.test.ts` |
| 新增 | `tests/t01/scoring.test.ts` |
| 新增 | `tsconfig.engine-smoke.json` |
| 新增 | `tsconfig.engine.json` |
| 修改 | `tsconfig.json` |
| 新增 | `vite.engine.config.ts` |

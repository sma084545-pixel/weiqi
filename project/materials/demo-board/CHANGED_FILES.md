---
schemaVersion: 1
id: T18-CHANGED-FILES
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T18 新增文件清单

本支线没有修改 T01 基线既有文件。以下均为新增；完整 SHA-256 清单由 `artifact-manifest.json` 提供。

## 生产文件

- `board-9x9-450mm.svg`
- `board-9x9-450mm-1to1.pdf`
- `board-9x9-a4-tiled.pdf`
- `pieces-markers-a4.pdf`
- `editable-sheets/black-stones-01.svg`
- `editable-sheets/black-stones-02.svg`
- `editable-sheets/white-stones-01.svg`
- `editable-sheets/white-stones-02.svg`
- `editable-sheets/liberty-rings.svg`
- `editable-sheets/targets-sequence-last.svg`
- `teaching-flows-a3.svg`
- `teaching-flows-a3.pdf`
- `assembly-diagrams-a4.svg`
- `assembly-guide.md`
- `assembly-guide.pdf`
- `materials-list.md`
- `trial-record.csv`

## 参数、来源、说明与验证

- `README.md`
- `dimensions.json`
- `teaching-setups.json`
- `sources.md`
- `visual-check.md`
- `verification-report.json`
- `CHANGED_FILES.md`
- `generate_assets.py`
- `verify_assets.py`
- `render_and_contact_sheet.sh`
- `make_contact_sheets.py`
- `package_release.py`
- `qa/commands.log`
- `qa/board-contact.jpg`
- `qa/tiles-color-contact.jpg`
- `qa/tiles-gray-contact.jpg`
- `qa/pieces-color-contact.jpg`
- `qa/pieces-gray-contact.jpg`
- `qa/guide-contact.jpg`
- `qa/teaching-contact.jpg`
- `qa/rendered/` 下 34 张逐页 PNG（22 张彩色、12 张灰度）。
- `artifact-manifest.json`（打包时生成，不包含自身哈希）。

## 项目级新增

- `handoff/T18.md`

未修改：`src/`、`schemas/`、正式 `content/`、`package.json`、锁文件、根 README/CHANGELOG、共享文档与全项目验收矩阵。

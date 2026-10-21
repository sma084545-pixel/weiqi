# 棋盘图导出

支持 SVG、2× PNG 和单页 A4 PDF。可切换“题面（不带答案）”与“答案图”，并独立控制坐标、目标、最后一手和顺序号。题面预设不会写入 `data-answer="true"` 或答案文字。

SVG 把网格、坐标、棋子、标记和答案放在独立分组中，后续可用矢量软件编辑。PNG 由浏览器从同一 SVG 以 2× 栅格化。PDF 使用 595.28×841.89 pt A4 页面和矢量路径，打印宽度以毫米配置；提交流程实际用 Poppler 渲染逐页检查。

完整棋盘的真实边线加粗。裁切图使用虚线裁切框和“不是实际棋盘边界”文字，不把裁边伪装成真边。坐标仍按完整棋盘计算。文件名为稳定的 `{id}-r{revision}-{question|answer}.{format}`；批量 ZIP 带 schemaVersion=1 的 `manifest.json`，列出每个 ID、revision、预设与格式。

开发样例位于 `content/t15/exports/`。`TEST-*` 和 `TEMPLATE-*` 只用于往返、版式和冲突测试，不属于正式 30 题。


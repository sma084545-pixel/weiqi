# T15 开发样例

这里的 `TEST-T15-*` 只用于格式往返和图示验收，不计入正式 30 题。

- `samples/`：schemaVersion 1 JSON、带两个变化分支的 SGF，以及 SGF 解析后再序列化的副本。
- `exports/`：同一开发题的题面/答案 SVG、2× PNG、A4 PDF，以及按稳定 ID 命名的四模板 SVG 批量 ZIP 与清单。

JSON 是提示、答案树、验证记录和题型元数据的权威格式。SGF 样例只验证 `docs/t15/FORMAT_SUPPORT.md` 列出的 FF[4] 子集。

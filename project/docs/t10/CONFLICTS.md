---
schemaVersion: 1
id: DOC-T10-CONFLICTS
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T10 冲突与最小解决

| 位置 | 冲突事实 | 解决 |
|---|---|---|
| T03 注册与旧测试 | 0.9.1 中互动题仍为 planned，旧测试要求直接地址显示“尚未安装” | 将正式地址注册为 `#/challenges`，把首页、路线和教师视图接入；旧 `#/challenge/try-one` 保留可用兼容入口，并更新已过时的测试预期 |
| T09 命令行判题器 | `content/tools/grade.mjs` 从构建后的独立引擎加载，若直接打入浏览器会携带第二份构建产物 | 保留 T09 工具字节用于内容验证；T10 的同语义答案适配直接调用主线 `src/core/rules`，以固定向量和 T09 校验共同复验 |
| MERGE_A 完整性脚本 | 原脚本把根项目版本硬编码为 0.9.1，T10 升级到 0.10.0 后会误拒绝 | 仅把版本断言改为“不得早于 0.9.1”；201 个 T09 文件、schema/ruleset、ID/revision 和哈希检查保持不变 |
| 题目必要条件与答案封题 | `conditions.assumptions` 同时含必要假设、成功标准和常见错误；全部展示会提前泄题 | 学习者页显示 external 及不含成功/错误/同伴提示前缀的必要假设；成功标准、答案与验证证据只在提交后的对应反馈或教师材料中使用 |

没有修改 GO-CLUB-AREA-1、schemaVersion=1、正式题 ID/revision、坐标、规则算法、Board 接口、依赖或锁文件。

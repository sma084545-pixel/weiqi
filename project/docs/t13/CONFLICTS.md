---
schemaVersion: 1
id: DOC-T13-CONFLICTS
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T13 冲突与解决记录

未发现 GO-CLUB-AREA-1、schemaVersion 1、坐标、正式 ID/revision 或 T01/T08/T09/T10 接口冲突。T09 六个 END 文件和 bundle 保持字节不变。

T09 的 END-001–END-005 是 teaching-assumption 且 confirmedBy=[]，不是实战双方确认。页面因此写“按给定教学假设试算”，不写“已确认实战”。END-006 是 unsettled 且 expectedScore=null，页面只提供继续对弈或处理争议，不调用计分并隐藏所有最终结果。

T01 scoreArea 返回归属点集合但不返回逐个连通区的边界。T13 只把已移除明确死子后的空点按正交相邻分组，用于整区选择和解释边界；归属、数量和总分仍完全取自公开 scoreArea。没有扩展共享 schema 或另写一套计分算法。

T13 不保存改动后的贴目。每次试算以同一 fixture、同一死子清单重新调用 scoreArea，切题和恢复操作回到 authored komi。提子对比使用 fixture 的只读 captureCountsForComparison，不传入计分请求。

隔离副本最初没有 node_modules，一次直接调用包管理器因受限网络中止且没有改锁文件。随后使用锁文件安装 108 个精确依赖完成开发验证；无 node_modules 的候选归档与最终完整归档均重新解压、按锁文件安装并通过完整检查。最终证据见交付目录的 `validation/final-archive-verification.json`。

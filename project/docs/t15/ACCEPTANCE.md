# T15 验收记录

| 项目 | 状态 | 证据 |
|---|---|---|
| JSON Position/Puzzle/GameRecord/ContentBundle 往返 | 通过 | `tests/t15/json.test.ts`；共同 schema 与 T01 重放；开发样例 `content/t15/samples/TEST-T15-LIB-ROUNDTRIP.json` |
| 版本、大小、项目数、深度与字段错误定位 | 通过 | 未知 schemaVersion、2 MB/自定义限制、嵌套深度、坏 JSON 和伪造 GameState 负例 |
| 冲突须显式选择且正式 ID 不覆盖 | 通过 | official 只允许 skip/keep-copy；local 允许 skip/replace/keep-copy；浏览器先预览后提交 |
| 失败不改变已有内容 | 通过 | 纯函数字节等价检查；浏览器先导入后提交坏 JSON，库数量不变；坏文本未执行脚本 |
| SGF FF[4] 子集 | 通过 | GM[1]、FF[4]、UTF-8、5/9/13/19、根 AB/AW/AE/PL、KM、RU、B/W/停手、C 均有解析路径 |
| 中文、转义、边角、空停手、旧式 tt | 通过 | `tests/t15/sgf.test.ts` 固定字符串往返；左上 `aa`、右下 `ss` 与 `tt` 停手 |
| 两分支保留与逐路线重放 | 通过 | 原树序列化后仍有两路线；每条明确选择后由 T01 重放；未加载分支数量可见 |
| 非根 setup/PL、范围外属性和 RU 边界 | 通过 | 非根 setup 阻断并定位 `/nodes/1`；未知属性警告；不同/缺失 RU 要求明确同意 |
| SVG/PNG/PDF | 通过 | 题面 SVG 无答案层；答案 SVG 显式答案层；PNG 1040×712；PDF 1 页 A4 595.28×841.89 pt、无 JavaScript |
| 坐标、真边界、裁切、目标/最后一手/顺序 | 通过 | `tests/t15/graphics.test.ts`；SVG 分层；PDF 坐标填色回归；裁切虚线与文字说明 |
| 批量稳定命名与清单 | 通过 | `T15-question-svg-batch.zip` CRC 通过，含四模板和 `manifest.json` |
| 本机存储未来版本保护 | 通过 | `tests/t15/storage.test.ts` 保留未知主版本原字符串；SGF 同身份须显式替换 |
| 构建、规则与正式内容回归 | 通过 | TypeScript/Vite；41 文件 341 项；851 内容检查、134 手、2179 转移；T09 20+1；MERGE_A 201 文件 |
| 浏览器交互和响应式 | 通过 | T15 11 项；全项目 120 项；360 触屏、768、1280、reduced motion；三张截图人工查看无横向溢出 |
| 基线文件保持兼容 | 通过 | `preservation-report.json`：24 组 264 文件字节一致，含正式内容、schema、T01、T02、T14 和锁文件 |
| PDF 实体打印 | 未测 | 数字 A4 尺寸与 Poppler 渲染已核对；未在实体打印机量尺 |
| 干净联网安装 | 未测 | 无依赖变更且锁文件与 T14 相同；当前使用 T14 冻结依赖，没有联网重新下载 |
| Safari/Firefox、实体设备、专用读屏器 | 未测 | 本次只运行本机 Chromium 自动化；未取得相应设备或辅助技术 |
| 真人教师、课堂与学生反馈 | 未测 | 没有虚构教师审核、课堂实施或学生成效 |

必需范围无失败或阻断。Vite 仍报告单个 bundle 超过 500 kB，这是继承的性能提示，不影响本地构建或 T15 正确性。


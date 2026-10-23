# KataGo 复盘前端检查

检查日期：2026-10-23。只检查前端交互；所有 HTTP 响应均为 `TEST-UI-NOT-REAL-ENGINE` 测试夹具，不是引擎准确性、Render 性能或正式链路证据。测试数据不写入正式题库。

- `./node_modules/.bin/vitest run tests/analysis/client.test.ts`：8 项通过。覆盖固定地址验证、黑方视角与局面身份、最小上传结构、启动/繁忙错误、取消、100 秒等待上限、手动/防双击、切手迟到丢弃与撤回后禁用。
- `./node_modules/.bin/tsc --noEmit`：通过。
- `./node_modules/.bin/playwright test --config=/private/tmp/weiqi-katago-ui.config.mjs --workers=1`：8 项通过，0 跳过，0 失败，9.4 秒。完整 JSON 证据见 `frontend-browser.json`。临时配置使用 Vite dev 4208，`VITE_KATAGO_API_ORIGIN=https://analysis.example`，并由 spec 拦截该分析请求。
- 浏览器：本机 Playwright Chromium。此次未实际运行 Safari、Firefox 或屏幕阅读器，不标为通过。
- UI 流程：进行中不可分析；双方连续停手并先后确认前不可分析；认输/终局后手动分析；候选点数字正确映射 A5；候选停手为文字；黑方指标不随当前行棋方翻转；PV 黑白先后正确；复盘滑动条更换局面清空旧结果；双击只产生一次请求；迟到回复不覆盖新局面；启动/繁忙可手动重试；申请悔棋恢复进行中后分析入口消失；手机轻触、键盘 Enter、减少动画。
- 360/768/1280 px：截图实际打开检查，分析面板、指标与候选文本可读，未出现页面横向溢出，按钮未遮挡分析文字。截图 `frontend-review-360.png`、`frontend-review-768.png`、`frontend-review-1280.png`。最后捕获时已移回页首并解除焦点，避免全页截图中的 sticky 页眉重复与跳转链接遮挡。
- 4208 测试服务器由 Playwright 自动关闭；检查结束后无监听。

真实 KataGo 加载、后端队列/取消、Docker、Render 和正式 GitHub Pages 链路由对应独立记录验收；此记录不替代它们。

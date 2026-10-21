# T15 可访问与响应式检查

- 导入和导出使用原生 `label`、`input`、`textarea`、`select`、`fieldset`、`button` 和链接；动态结果用 `role=status`。
- 所有关键状态有文字；规则冲突、答案预设和裁切边界不只依赖颜色。
- 外部文本由 React 文本节点显示；代码摘要使用 `pre/code`，不执行内容。
- 360px 触屏实际完成 PNG 导出；768px 与 1280px 读取全部三区；页面宽度均未超出视口。
- 键盘可到达文件选择、文本输入、预览、冲突选项、路线与导出按钮；沿用全站可见焦点。
- `prefers-reduced-motion` 下无强制动画；本功能没有音效或倒计时。

截图位于 `output/playwright/t15/`。360px 的 full-page 拼接图中粘性全站导航会在长图中间出现一次，这是 Chromium 全页截图拼接现象；自动化同时核对真实视口没有横向溢出。未实测 Safari/Firefox、VoiceOver/TalkBack/JAWS、实体手机/平板/投影。


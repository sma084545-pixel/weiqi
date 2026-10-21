---
schemaVersion: 1
id: DOC-T12-ACCESSIBILITY-QA
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T12 可访问与响应式检查

- 表单使用原生 form、fieldset、legend、label、radio、checkbox 和 textarea；全部按钮使用文字，目标与选择不只靠颜色。
- 候选棋盘复用 T02 Board：方向键移动，Enter/Space 选点，交点有可读坐标、棋色、标记和可选状态。
- 360px 真触屏上下文完成自选落点、键盘 Enter、完整表单与预览；768px 和 1280px 检查无页面横向溢出。
- 点击目标最小高度约 48px；textarea 可调整高度；焦点轮廓可见；`prefers-reduced-motion` 关闭动画与过渡。
- 作者参考在提交前不进入可见 DOM，避免提前泄露；状态提示使用 alert/status 语义。
- 打印样式只输出一页说明内容；可下载的 Markdown 提供同一正式题 ID。

实际运行 Chromium。Safari、Firefox、实体手机/平板/投影和 VoiceOver/TalkBack/JAWS 未测，不能由自动化替代。

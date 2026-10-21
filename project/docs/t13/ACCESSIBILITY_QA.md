---
schemaVersion: 1
id: DOC-T13-ACCESSIBILITY-QA
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# T13 可访问与响应式检查

- 终局判断、区域归属和整区模式使用原生 fieldset、legend、label、radio、checkbox；关键操作都有文字。
- 复用 T02 Board 的完整交点网格、坐标朗读、方向键和 Enter/Space；触屏不依赖 hover。
- 黑/白/中立标记同时显示“黑/白/中”文字；反馈逐区写出边界原因，不只依赖颜色。
- 正确答案、分数和边界证据在提交前不进入 DOM；状态变化使用 role=status 与礼貌播报。
- 面积明细使用 caption、thead、scope，读屏顺序与视觉顺序一致。
- 360px 真触屏/键盘、768px、1280px 和 reduced-motion 已通过 Chromium 自动化；三张完整截图已人工查看。
- Safari、Firefox、实体手机/平板/投影、VoiceOver、TalkBack、JAWS 与真实纸张打印未测。

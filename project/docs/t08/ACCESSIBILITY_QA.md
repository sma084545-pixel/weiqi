---
schemaVersion: 1
id: DOC-T08-ACCESSIBILITY-QA
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 响应式与可访问检查

锁定的Chromium自动化实际检查360、768、1280px；9路全81个交点，19路全361个交点。小屏19路保留局部横向滚动，整页不横向溢出；边角仍是原生按钮。共享Board继续支持方向键、Enter/Space、显示坐标与每点中文读屏说明。终局死子用三角形和文字表达，黑白棋有文字/明度差，不只靠颜色。

原生fieldset/radio/number/select区分开局配置；原生dialog处理丢弃、认输、重开和双方悔棋。状态使用礼貌live region。关键按钮、select和number输入实际高度至少40px；radio整张卡可点击。`prefers-reduced-motion` 关闭本页过渡与动画；没有音效或闪烁。

截图：`output/playwright/t08/360-setup.png`、`768-setup.png`、`1280-setup.png`、`360-19x19-projector-grayscale.png`、`1280-final-score.png`。人工数字查看未见整页横向溢出、控件裁切、盘线错位或只靠色彩表达的状态。

未测Safari、Firefox、实体手机/平板/投影、VoiceOver、TalkBack、JAWS及真实两人操作。自动ARIA与模拟触摸不能替代真人辅助技术或硬件测试。

---
schemaVersion: 1
id: DOC-T11-A11Y
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 可访问与响应式检查

| 项目 | 自动/人工检查 | 结果 |
|---|---|---|
| 360px 触屏完成预测、选点和验证 | Chromium 真触屏上下文，reduced-motion | 通过 |
| 键盘聚焦棋盘候选点并按 Enter 选择 | Playwright | 通过 |
| 768/1280px 无页面横向溢出 | 浏览器尺寸断言与截图 | 通过 |
| 当前轮次、目标、合法/非法、提子数 | 可见文字及 `aria-live` 反馈 | 通过 |
| 真/假眼、目标、候选点 | 形状标记加文字说明，不只用颜色 | 通过 |
| 运动偏好 | reduced-motion 下不依赖动画完成教学 | 通过 |
| 页面视觉 | 人工查看 360、768、1280 最新截图 | 通过 |

当前未实际检查 Safari、Firefox、实体手机/平板/投影、VoiceOver、TalkBack、JAWS、灰度打印和真实课堂操作。Chromium 模拟与截图不能替代这些实机检查。


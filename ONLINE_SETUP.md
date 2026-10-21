---
schemaVersion: 1
id: GITHUB-PAGES-ONLINE-SETUP
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 原网址更新与联机接入

正式入口保持 https://sma084545-pixel.github.io/weiqi/ 。当前程序0.20.2，包含成员反馈、完整教学工具、5/9/13/19路自由双人、真正悔棋和棋局滑动条。静态页面可以运行学习、同屏对弈、题库、创作、导入导出和已准备的本机离线功能；学习进度、草稿、反馈依旧留在本机。

## 联机状态

GitHub Pages只提供静态网页，不运行Node房间服务。本次没有已有服务器，未购买或另行创建公网托管；网站明确显示“联机服务未接入”，提供同屏对弈入口，不把部署前端称为在线房间已可用。已交付的房间代码、开局/提子/悔棋/终局流程及可部署服务保留在源码和软件包。

后续有服务器时，可以保持原网址：

1. 将dist和dist-server部署到支持持续Node进程、持久目录和WebSocket的单实例服务器，使用HTTPS。私有房间文件放在不公开的持久目录；不要上传runtime-data或座位凭据。
2. 服务器设置PUBLIC_ORIGIN=https://sma084545-pixel.github.io（仅源，不含/weiqi），设置PUBLIC_APP_URL=https://sma084545-pixel.github.io/weiqi/#/play/online，让邀请链接返回原网站。配置HTTPS反向代理转发/api/online/ws，保留Origin/Host和WebSocket升级。
3. 构建前端时设置公开配置VITE_ONLINE_SERVER_URL为实际HTTPS房间服务器的源，例如https://rooms.example.org（必须替换为真实地址；不填密码、令牌、路径或查询参数），先提升package.json和APP_VERSION的补丁版本以触发安全的离线更新，再执行pnpm build并同步dist到GitHub Pages根目录。这个变量会公开在前端，不能放秘密。不要将localhost或仅本地可达的地址当作公网服务器。
4. 两个独立设备打开原网站，一人创建、另一人输入房间码；检验断线恢复、双方悔棋与终局确认。公开HTTPS前端不连接不安全HTTP后台。Origin校验必须与前端源相符，不需要放宽为任意Origin。

VITE_ONLINE_SERVER_URL不设置时，本地Node版本仍使用同源服务；在github.io上则如实显示服务尚未接入，不发起不存在的房间连接。房间需要服务器连接；静态离线准备不意味着联机可以断网继续同步。

## 已访问旧版时

旧网址可能缓存0.16.0。联网打开后等待出现“新版本已准备好”，先保存当前工作，再点“保存已提交内容并应用”；不要清除浏览器数据来更新。页脚和“教师视图→离线与本机数据”可查看版本0.20.2；也可读取相对地址version.json。更新后重新确认“已可离线”。保持同一原网址可沿用本机数据；不默认上传，也不删除草稿/反馈。

## 源码与完整工具包

GitHub仓库project/保存当前可构建源码和材料；历史source/0.16.0分卷仅作溯源。完整版本化归档和SHA256见同仓库的Release v0.20.2-pages.1。后续发布时同步源文件、生产构建、version.json、离线清单、交接和校验记录，避免只改网页或只改本地。

参考：GitHub官方Pages说明 https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages 。没有声称已完成真实双设备跨网、TLS配置、学校审批或真人教学验证。

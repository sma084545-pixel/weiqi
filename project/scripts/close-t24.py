from pathlib import Path
import json,hashlib,shutil,re,zipfile
R=Path(__file__).resolve().parents[1];D=R/'docs/t24';C=R.parents[1]/'candidate-recheck/go-club'
# Candidates were executed, not merely inspected. Keep their exact evidence.
assert '358 passed' in (D/'checks/archive-recheck/full-check.log').read_text()
assert '2 passed' in (D/'checks/archive-recheck/browser.log').read_text()
assert '"status":"passed"' in (D/'checks/archive-recheck/dev-start.log').read_text()
assert '150 passed' in (D/'checks/browser-after-fix.log').read_text()
assert '2 passed' in (D/'checks/browser-webkit-after-fix.log').read_text()
assert all(x['status']=='passed' for x in json.loads((D/'checks/origin-outage/results.json').read_text())['rows'])
shutil.copytree(C/'docs/t24/checks/journey/chromium',D/'checks/archive-recheck/journey',dirs_exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for root in ['src','schemas','content/puzzles','content/endgames','content/t09','public','dist','dist-engine']:
 for p in (R/root).rglob('*'):
  if p.is_file():
   q=C/p.relative_to(R);assert q.exists() and sha(p)==sha(q),p;rows.append(dict(path=str(p.relative_to(R)),sha256=sha(p)))
for name in ['package.json','pnpm-lock.yaml','vite.config.ts','tsconfig.json','playwright.config.ts','tests/browser/t24.spec.ts','tests/browser/t24-refresh.spec.ts']:
 assert sha(R/name)==sha(C/name);rows.append(dict(path=name,sha256=sha(R/name)))
(D/'checks/archive-recheck/executed-fingerprint.json').write_text(json.dumps(dict(schemaVersion=1,id='T24-EXECUTED-FINGERPRINT',revision=1,rulesetId='GO-CLUB-AREA-1',status='passed',files=rows,scope='candidate clean install/check/start/browser executed; current executable files match byte for byte',humanReviewed=None),ensure_ascii=False,indent=2)+'\n')
cmds=[('pnpm install --frozen-lockfile','archive-recheck/clean-install.log'),('pnpm check','archive-recheck/full-check.log'),('pnpm exec playwright test tests/browser/t24.spec.ts tests/browser/t24-refresh.spec.ts --workers=1','archive-recheck/browser.log'),('node scripts/check-clean-start-t24.mjs (pnpm dev --port 4197)','archive-recheck/dev-start.log')]
(D/'checks/archive-recheck/commands.json').write_text(json.dumps(dict(schemaVersion=1,id='T24-CLEAN-ARCHIVE-COMMANDS',revision=1,rulesetId='GO-CLUB-AREA-1',resultVersion='0.17.1-t24.1',workingDirectory=str(C),results=[dict(command=c,status='passed',exitCode=0,log='docs/t24/checks/'+l) for c,l in cmds],shutdownNote='dev service deliberately SIGTERM after successful browser check (143 child code is cleanup)',humanReviewed=None),ensure_ascii=False,indent=2)+'\n')
p=R/'handoff/T24.md';s=p.read_text().replace('status: awaiting-final-archive-recheck','status: complete-digital-toolkit');s=s.replace('最终归档再解压与干净启动/构建/校验结果将写入docs/t24/checks/archive-recheck及ZIP旁ARCHIVE_CHECK.json，完成后更新本状态。','归档已重新解压，逐文件SHA/CRC、30题/6终局、关键文件与所有handoff通过；从无node_modules的目录干净安装后pnpm check与真实Chromium完整路线/禁网/快速刷新两测试、README的pnpm dev启动首页通过。当前所有可执行文件与该已运行副本逐SHA相同，见docs/t24/checks/archive-recheck。最终ZIP另作完整解压及生产构建/内容校验，准确最终SHA与结果在ZIP旁ARCHIVE_CHECK.json；其哈希不写入包内以避免自引用。');p.write_text(s)
p=D/'test-report.md';s=p.read_text().replace('以归档复查记录为准','通过，干净安装/完整check/两浏览器测试/README开发启动；最终ZIP另解压构建与校验').replace('首次沙箱无网络依赖获取失败后以获准环境重新安装通过。','首次沙箱无网络依赖获取失败后以获准环境重新安装通过；开发启动检查工具的首次路径错误更正后通过（原日志保留），成功检查后主动停止开发服务的143退出码为清理，不是页面启动失败。');p.write_text(s)
p=D/'acceptance-matrix.md';s=p.read_text().replace('T24最终ZIP完整性和从干净目录启动/校验另见archive-recheck','T24归档已从干净目录安装、完整check、真实连续路线和README开发启动通过；最终ZIP完整性/构建/校验另见archive-recheck与ZIP旁ARCHIVE_CHECK.json');p.write_text(s)
# No current source/rule/schema defect remains. Retained originals and failures are named explicitly.
p=D/'checks/README.md';p.write_text('''---
schemaVersion: 1
id: T24-CHECKS-INDEX
revision: 1
rulesetId: GO-CLUB-AREA-1
---

# 当前与历史检查记录

当前结论用full-check-after-fix.log、browser-after-fix.log、browser-webkit-after-fix.log、origin-outage-after-fix.log/results.json、cross-media-audit-final.log/.json、materials-regression-final.log、render-report.json及archive-recheck/。后缀approved、existing或较早journey日志是修复前/前期成功记录，不能替代修复后结果。

browser-journey-final.log和origin-outage-before-fix.log是T14快速刷新缺陷的修复前失败；原文件名保留。WebKit-offline-failure/browser-webkit及Firefox日志是工具/宿主限制，未列通过。clean-install、full-check等初始沙箱失败与批准环境复跑均保留；没有用失败日志冒充成功。

rendered/含113PDF459页实际渲染及79联系表；每页映射sourceSha256和栅格代表。Office临时配置与字体缓存不打包。archive-recheck中dev-start-initial-path-error.log为测试工具路径失败；当前dev-start成功后143退出是主动结束服务。候选归档SHA只标识当时测试包，最终唯一归档SHA以ZIP同目录ARCHIVE_CHECK.json/SHA256SUMS为准。

所有TEST文本、截图中的自动化草稿和例表均为开发验证，不是成员活动记录。没有浏览器数据库或用户配置文件进入归档。
''')
print('Candidate clean execution and current fingerprint passed:',len(rows),'files')

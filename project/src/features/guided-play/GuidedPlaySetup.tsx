import {GOALS,LEVELS,type GuidedOptions} from './types';

export function GuidedPlaySetup({options,colorChoice,onColor,onOptions,onStart,networkAvailable,completed}:{options:GuidedOptions;colorChoice:'B'|'W'|'random';onColor:(v:'B'|'W'|'random')=>void;onOptions:(v:GuidedOptions)=>void;onStart:()=>void;networkAvailable:boolean;completed:number}){
  return <section className="guided-setup" aria-labelledby="guided-setup-title">
    <div><span className="module-kicker">观察 → 判断 → 落子 → 反思</span><h2 id="guided-setup-title">给这盘棋选一个小目标</h2><p>一盘只关注1–3个概念。不会的地方可以略过，也可以随时去自由对弈。</p><p className="guided-setup-boundary">本地教学机器人适合练习规则与思考，棋力有限；真实 KataGo 可选，但不标段级位。基础死活主题只引导观察，不自动判任意棋块生死。</p><p>当前设备保留 {completed} 盘已结束的辅助练习（最多50盘）；这是使用记录，不是个人能力测评。</p></div>
    <form onSubmit={e=>{e.preventDefault();onStart();}}>
      <label htmlFor="guided-size">棋盘大小<select id="guided-size" value={options.size} onChange={e=>onOptions({...options,size:Number(e.target.value) as 9|13})}><option value={9}>9×9 · 建议从这里开始</option><option value={13}>13×13 · 更多空间</option></select></label>
      <label htmlFor="guided-color">你的执棋<select id="guided-color" value={colorChoice} onChange={e=>onColor(e.target.value as 'B'|'W'|'random')}><option value="B">黑棋 · 先行</option><option value="W">白棋 · 对手先行</option><option value="random">随机执色</option></select></label>
      <label htmlFor="guided-level">教学强度<select id="guided-level" value={options.level} onChange={e=>onOptions({...options,level:Number(e.target.value) as 1|2|3})}>{([1,2,3] as const).map(level=><option key={level} value={level}>Level {level} · {LEVELS[level].label}{level===2?'（推荐）':''}</option>)}</select></label><p className="guided-field-help">{LEVELS[options.level].description}</p>
      <label htmlFor="guided-goal">本局学习目标<select id="guided-goal" value={options.goal} onChange={e=>onOptions({...options,goal:e.target.value as GuidedOptions['goal']})}>{Object.entries(GOALS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label htmlFor="guided-opponent">练习对手<select id="guided-opponent" value={options.opponent} onChange={e=>onOptions({...options,opponent:e.target.value as GuidedOptions['opponent']})}><option value="local">本地教学机器人 · 可离线</option><option value="katago" disabled={!networkAvailable}>真实 KataGo · 需要联网{networkAvailable?'':'（此构建未配置）'}</option></select></label>
      <p className="guided-field-help">{options.opponent==='katago'?'只发送本局起点、着法与贴目以获得对手落子；提示与教学记录仍在本机计算。思考、冷启动或排队可能较慢，失败后可手动重试。':'本地机器人按提子、救一气棋和连接等规则落子，不使用远程 AI。Level 1 会选择较简单的候选。'}</p>
      <p>默认贴目0，可和棋；这是本项目的教学选择。连续两次停手后，仍需人工核对终局。</p>
      <button type="submit" className="primary-action">开始辅助对局</button>
    </form>
  </section>;
}

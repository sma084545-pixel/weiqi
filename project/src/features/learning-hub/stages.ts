import type {StoneValue} from '../../core/content.generated';
import type {StageId} from './types';

export interface StageDefinition{
  id:StageId;number:number;title:string;goal:string;action:string;readiness:string;beginner:string;experienced:string;formalModule:string;formalAvailable:boolean;size:5|9;stones:readonly [number,number,'B'|'W'][];
}

export const STAGES:readonly StageDefinition[]=[
  {id:'STAGE-01',number:1,title:'从交叉点开始',goal:'认识交叉点、连接与气。',action:'在气实验室先选棋块，再圈点或预测后验证。',readiness:'能说明斜角不连接，共享空点只算一次。',beginner:'先看单子，再看两子相连。',experienced:'比较连接前后，向同伴解释气集合怎样变化。',formalModule:'气实验室（T04）已安装，含8个开发演示；这些演示不计入正式30题题库。',formalAvailable:true,size:5,stones:[[2,2,'B']]},
  {id:'STAGE-02',number:2,title:'打吃、提子与吃子小游戏',goal:'认出一气并预测整块提走。',action:'先用四步演示验证，再和伙伴轮流尝试先提到棋子。',readiness:'能解释先提子后获得气的合法着。',beginner:'从提单子和不会提子的对照开始，再尝试5路短局。',experienced:'比较同时提多块与自杀禁着，再直接尝试9路。',formalModule:'提子实验室（T05）与同屏双人吃子小游戏（T07）已安装；演示内容仍与正式题库分开。',formalAvailable:true,size:5,stones:[[1,2,'W'],[2,1,'B'],[2,2,'W'],[2,3,'B'],[3,2,'B']]},
  {id:'STAGE-03',number:3,title:'完成一盘9路',goal:'理解轮流、停手、终局确认与面积。',action:'完成一盘尝试；有争议就恢复对弈。',readiness:'能区分进入确认和已经结束。',beginner:'默认贴目0，可在协助下确认。',experienced:'说明停手理由，并阅读较长重复限制。',formalModule:'完整小棋盘对弈（T08）与围地数子练习（T13）已安装；练习复用 END-001–006 和同一面积引擎。',formalAvailable:true,size:9,stones:[[2,2,'B'],[2,6,'W'],[4,3,'B'],[4,5,'W'],[6,2,'B'],[6,6,'W']]},
  {id:'STAGE-04',number:4,title:'连接与切断',goal:'观察一步怎样改变连通块。',action:'提出连接点，再让伙伴提出回应。',readiness:'能指出哪些棋子正交相连。',beginner:'少量棋子，允许摆回原形。',experienced:'比较两种候选点后的气与风险。',formalModule:'连接与切断专题模块尚未安装。',formalAvailable:false,size:5,stones:[[1,1,'B'],[1,3,'B'],[2,2,'W'],[3,1,'W'],[3,3,'W']]},
  {id:'STAGE-05',number:5,title:'眼与基础死活',goal:'区分真眼、假眼与独立眼。',action:'先猜对方能否吃入，再按完整棋盘和当前轮次验证。',readiness:'能说明两个空点不等于两只眼，并说出结论所需条件。',beginner:'从 LIFE-001/002 的真眼与假眼对照开始。',experienced:'比较先手占关键点，并说明有限变化与通用死活判定的区别。',formalModule:'眼与基础死活小课（T11）已安装，复用 LIFE-001–005 修订 1 与 T10 判题器。',formalAvailable:true,size:5,stones:[[1,1,'B'],[1,2,'B'],[1,3,'B'],[2,1,'B'],[2,3,'B'],[3,1,'B'],[3,2,'B'],[3,3,'B']]},
  {id:'STAGE-06',number:6,title:'自选挑战与13路',goal:'选择练习方式并说明计划与回应。',action:'合作讨论一道题，或尝试较大棋盘。',readiness:'没有毕业门槛；想继续就选择下一项。',beginner:'选择一个候选，用一句话说明理由；也可继续9路。',experienced:'分析更深回应、尝试13路，或担任回应者。',formalModule:'同伴合作挑战（T12）、正式挑战题与完整13路对弈均已安装；参与不设难度门槛。',formalAvailable:true,size:9,stones:[[1,1,'B'],[1,7,'W'],[3,3,'B'],[3,5,'W'],[5,2,'B'],[5,6,'W'],[7,4,'B']]},
];

export function stageBoard(stage:StageDefinition):StoneValue[][]{
  const board=Array.from({length:stage.size},()=>Array<StoneValue>(stage.size).fill(null));
  for(const [row,col,color] of stage.stones)board[row][col]=color;
  return board;
}

import type {RuleErrorCode} from './contract';
export const RULE_ERROR_ZH:Record<RuleErrorCode,string>={
 INVALID_BOARD:'棋盘须为完整的 5、9、13 或 19 路矩阵，棋子值须为 B、W 或 null。',INVALID_ARGUMENT:'参数格式不正确，请按接口说明修正后重试。',EXPORT_TOO_LARGE:'完整对局超过 64 MB，暂不能保存；当前状态和旧记录未改动。',
 NOT_YOUR_TURN:'还没轮到这一方。请按当前轮次操作。',OUT_OF_BOUNDS:'该点不在完整棋盘内，请重新选择。',OCCUPIED:'这个交叉点已有棋子，请选空点。',SUICIDE:'提子处理后己方棋块仍无气，不能这样落子。',SUPERKO:'这手会重现本局先前的棋子布局，请选择别处或停一手。',GAME_NOT_PLAYING:'当前不在对弈阶段；请先完成确认或恢复对弈。',NOT_SCORING:'须先连续停两手，才能确认终局。',NOTHING_TO_UNDO:'当前没有可撤回的操作。',NOTHING_TO_REDO:'当前没有可重做的操作。',INVALID_SETUP:'摆棋局面尚不能作为规则起点，请修正提示的棋子或轮次。',HISTORY_REQUIRED:'缺少可核查历史；请导入完整对局，或明确另建教学起点。',IMPORT_MISMATCH:'导入的状态与规则重放不一致；原文件已保留。',AGREEMENT_REQUIRED:'请双方确认同一份死子与中立点标记；有争议可恢复对弈。',INVALID_SCORING_MARKS:'计分标记含无效点或不完整棋块，请检查后重试。',KOMI_LOCKED:'贴目已在开局确定；需要更改时请另开一局。',WRONG_MODE:'这个操作不适用于当前玩法。',STALE_TRIAL:'预览所依据的状态已改变，请重新试下。'
};

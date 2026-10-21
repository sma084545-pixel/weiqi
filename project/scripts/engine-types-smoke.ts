// Compile the declarations included in the independent library distribution.
import type {RulesEngine,GameState,ScoreRequest} from '../dist-engine/types/rules/index';
import {rulesEngine} from '../src/core/rules';
const api:RulesEngine=rulesEngine;
export function typeContract(state:GameState,request:ScoreRequest){return [api.undo(state),api.scoreArea(request),api.serializeGame(state)];}

import type {GameState} from '../../core/content.generated';
import {createGameHistory,type GameHistoryFrame} from '../../core/game-history';

/** Compatibility export for callers of the original T08 read-only review API. */
export type FullGameReviewFrame=GameHistoryFrame;
export const createFullGameReview=(game:GameState):FullGameReviewFrame[]=>createGameHistory(game);

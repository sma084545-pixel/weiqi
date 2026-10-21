import type {GameState} from '../../core/content.generated';
import {createVerifiedGameStore} from '../../core/rules';
import type {StoragePort} from '../../core/persistence';

export const T08_GAME_ID='LOCAL-T08-FULL-GAME';
export function createFullGameStore(port:StoragePort){
  const store=createVerifiedGameStore(port);
  return {save:(game:GameState)=>store.save(game),load:()=>store.load(T08_GAME_ID),remove:()=>store.remove(T08_GAME_ID)};
}
export function fullGameJson(game:GameState):string{return JSON.stringify(game,null,2)+'\n';}

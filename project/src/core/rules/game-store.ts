import type {GameState} from '../content.generated';
import {createContentStore,type StoragePort,type StoreResult} from '../persistence';
import {restoreGame,serializeGame,MAX_GAME_BYTES} from './engine';
import {RULE_ERROR_ZH} from './errors.zh';
import type {RuleError} from './contract';
const error=(e:RuleError):{ok:false;issues:{code:string;path:string;message:string}[]}=>({ok:false,issues:[{code:e.code,path:e.field??'/',message:RULE_ERROR_ZH[e.code]}]});
/** Adds rule replay to the existing storage service; it does not introduce another backend. */
export function createVerifiedGameStore(port:StoragePort){
 const store=createContentStore(port,{maxBytes:MAX_GAME_BYTES});
 return {
  save(state:GameState):StoreResult<GameState>{const json=serializeGame(state);if(!json.ok)return error(json.error);const verified=restoreGame(json.value);if(!verified.ok)return error(verified.error);const saved=store.save(verified.value);return saved.ok?{ok:true,value:verified.value}:saved;},
  load(id:string):StoreResult<GameState|null>{const loaded=store.load(id);if(!loaded.ok)return loaded;if(!loaded.value)return {ok:true,value:null};const verified=restoreGame(loaded.value.document);return verified.ok?verified:error(verified.error);},
  remove:store.remove
 };
}

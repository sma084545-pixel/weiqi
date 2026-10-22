import {describe,it,expect} from 'vitest';
import {clampFloating} from '../../src/features/online-game/BoardDisplayTools';
import {validateRoomChat,readClientMessage} from '../../src/features/online-game/protocol';
describe('window geometry and transient chat validation',()=>{
 it('clamps the floating panel within desktop, narrow and shrinking windows',()=>{
   expect(clampFloating(-20,900,320,400,1280,800)).toEqual({x:8,y:392});
   expect(clampFloating(1000,-4,320,400,360,740)).toEqual({x:32,y:8});
   expect(clampFloating(200,200,320,400,280,320)).toEqual({x:8,y:8});
 });
 it('accepts exact new messages and rejects transport version, impersonation and unsafe control text',()=>{
   expect(readClientMessage({protocolVersion:1,type:'chat-send',requestId:'c1',text:'这是文字，不执行 <script>'}).type).toBe('chat-send');
   for(const extra of [{color:'B'},{room:'AAAAAAAA'},{nickname:'other'}])expect(()=>readClientMessage({protocolVersion:1,type:'chat-send',requestId:'c1',text:'hi',...extra})).toThrow('BAD_MESSAGE');
   const valid={schemaVersion:1,id:'ONLINE-CHAT-ABCDEFGH',revision:2,rulesetId:'GO-CLUB-AREA-1',kind:'OnlineRoomChat',code:'ABCDEFGH',messages:[{id:'ABCDEFGH-1',sequence:1,color:'B',nickname:'匿名',text:'hello',sentAt:'2026-10-22T00:00:00.000Z'}]};
   expect(validateRoomChat(valid)).toEqual(valid);
   for(const bad of [{...valid,schemaVersion:2},{...valid,messages:[valid.messages[0],valid.messages[0]]},{...valid,messages:[{...valid.messages[0],text:'x'.repeat(501)}]},{...valid,revision:1}])expect(()=>validateRoomChat(bad)).toThrow();
 });
});

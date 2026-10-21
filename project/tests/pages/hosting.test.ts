import {describe,it,expect} from 'vitest';
import {onlineConnectionConfig as config} from '../../src/features/online-game/hosting';
describe('Pages deployment capability is distinct from a working room server',()=>{
  it('resolves local and subdirectory same-origin endpoints',()=>{expect(config('http://127.0.0.1:4190/#/play/online')).toEqual({endpoint:'ws://127.0.0.1:4190/api/online/ws',message:null});expect(config('https://school.example/weiqi/#/play/online').endpoint).toBe('wss://school.example/weiqi/api/online/ws');});
  it('does not attempt a nonexistent GitHub Pages socket',()=>{const value=config('https://sma084545-pixel.github.io/weiqi/#/play/online');expect(value.endpoint).toBeNull();expect(value.message).toContain('服务器尚未接入');});
  it('uses an explicit HTTPS room origin from the existing Pages address',()=>{expect(config('https://sma084545-pixel.github.io/weiqi/', 'https://rooms.example.org')).toEqual({endpoint:'wss://rooms.example.org/api/online/ws',message:null});});
  it('connects the published site to Render while keeping downloaded apps on their own server',()=>{
    const remote='https://weiqi-rooms.onrender.com',site='https://sma084545-pixel.github.io';
    expect(config(site+'/weiqi/#/play/online',remote,site).endpoint).toBe('wss://weiqi-rooms.onrender.com/api/online/ws');
    expect(config('http://127.0.0.1:4195/#/play/online',remote,site).endpoint).toBe('ws://127.0.0.1:4195/api/online/ws');
  });
  it('does not send a different GitHub Pages account to this room service',()=>{expect(config('https://another.github.io/weiqi/','https://weiqi-rooms.onrender.com','https://sma084545-pixel.github.io').endpoint).toBeNull();});
  it('rejects malformed publishing origins with a recovery message',()=>{for(const scope of ['https://sma084545-pixel.github.io/weiqi','file:///site','https://user:secret@example.org','bad']){const value=config('https://sma084545-pixel.github.io/weiqi/','https://weiqi-rooms.onrender.com',scope);expect(value.endpoint).toBeNull();expect(value.message).toContain('来源配置');}});
  it('rejects mixed content',()=>{expect(config('https://sma084545-pixel.github.io/weiqi/','http://rooms.example.org').endpoint).toBeNull();});
  it('never embeds credentials or query strings in room URLs',()=>{for(const value of ['https://user:secret@rooms.example.org','https://rooms.example.org?token=x','https://rooms.example.org#secret'])expect(config('https://school.example',value).endpoint).toBeNull();});
  it('rejects path, unknown protocol and malformed addresses',()=>{for(const value of ['https://rooms.example.org/prefix','wss://rooms.example.org','not a URL'])expect(config('https://school.example',value).endpoint).toBeNull();});
  it('retains explicitly configured HTTP service in local HTTP testing',()=>{expect(config('http://127.0.0.1:4190/','http://127.0.0.1:4195').endpoint).toBe('ws://127.0.0.1:4195/api/online/ws');});
  it('file and invalid page addresses fail with a recovery explanation',()=>{for(const value of ['file:///app/index.html','bad']){const result=config(value);expect(result.endpoint).toBeNull();expect(result.message).toBeTruthy();}});
});

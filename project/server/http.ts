import {APP_VERSION} from '../src/core/version';
import {createServer,type Server} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {WebSocketServer} from 'ws';
import {RoomHub,type RoomRepository} from './rooms';

export async function createOnlineServer(options:{distDir:string;repository:RoomRepository;publicOrigin?:string;maxRooms?:number;idleMs?:number;shareUrl?:string}){
  const hub=new RoomHub(options.repository,options.maxRooms,options.idleMs,options.shareUrl);await hub.load();
  const dist=resolve(options.distDir),types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
  const server:Server=createServer(async(request,response)=>{
    response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','same-origin');
    if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405);response.end();return;}
    let pathname:string;try{pathname=decodeURIComponent(new URL(request.url??'/','http://local.invalid').pathname);}catch{response.writeHead(400);response.end();return;}
    if(pathname==='/api/online/health'){response.setHeader('Content-Type',types['.json']);response.setHeader('Cache-Control','no-store');response.end(JSON.stringify({ready:true,protocolVersion:1,programVersion:APP_VERSION,rulesetId:'GO-CLUB-AREA-1'}));return;}
    if(pathname.length>4096||pathname.includes('\0')||pathname.includes('\\')){response.writeHead(400);response.end();return;}
    const filename=resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
    if(!filename.startsWith(dist+sep)||!types[extname(filename)]||pathname.split('/').some(part=>part.startsWith('.'))){response.writeHead(404);response.end();return;}
    try{
      const info=await stat(filename);if(!info.isFile())throw Error('not-file');
      response.setHeader('Content-Type',types[extname(filename)]);response.setHeader('Content-Length',info.size);
      response.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');
      if(request.method==='HEAD'){response.end();return;}const stream=createReadStream(filename);stream.on('error',()=>response.destroy());stream.pipe(response);
    }catch{response.writeHead(404);response.end('文件不存在。');}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
  server.on('upgrade',(request,socket,head)=>{
    let allowed=false;try{
      const origin=new URL(request.headers.origin??'');
      allowed=['http:','https:'].includes(origin.protocol)&&(options.publicOrigin?origin.origin===options.publicOrigin:origin.host===request.headers.host)&&new URL(request.url??'/','http://local.invalid').pathname==='/api/online/ws';
    }catch{/* An absent or malformed Origin is not a browser room connection. */}
    if(!allowed){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    socket.on('error',()=>{});wss.handleUpgrade(request,socket,head,connection=>wss.emit('connection',connection,request));
  });
  const alive=new WeakMap<object,boolean>();
  wss.on('connection',socket=>{alive.set(socket,true);socket.on('pong',()=>alive.set(socket,true));hub.attach(socket);});
  const heartbeat=setInterval(()=>{for(const socket of wss.clients){if(alive.get(socket)===false){socket.terminate();continue;}alive.set(socket,false);socket.ping();}},15000);heartbeat.unref();
  return {server,hub,
    listen:(port:number,host='127.0.0.1')=>new Promise<number>((accept,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);accept((server.address() as {port:number}).port);});}),
    close:async()=>{clearInterval(heartbeat);await hub.close();for(const socket of wss.clients)socket.terminate();await new Promise<void>(accept=>wss.close(()=>accept()));if(server.listening)await new Promise<void>((accept,reject)=>server.close(error=>error?reject(error):accept()));},
  };
}

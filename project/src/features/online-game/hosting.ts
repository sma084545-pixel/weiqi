/** Resolve deployment capabilities without starting a network request. */
export interface OnlineHosting {endpoint:string|null;message:string|null}
export function onlineConnectionConfig(pageAddress:string,serverOrigin?:string):OnlineHosting {
  let page:URL;try{page=new URL(pageAddress);}catch{return {endpoint:null,message:'网站地址无法识别，请从正常的网站或本地服务打开。'};}
  if(!['http:','https:'].includes(page.protocol))return {endpoint:null,message:'联机需要通过网站或本地服务打开，直接打开文件不能建立房间。'};
  const configured=serverOrigin?.trim();
  if(configured){
    try{
      const service=new URL(configured);
      if(!['http:','https:'].includes(service.protocol)||service.username||service.password||service.search||service.hash||service.pathname!=='/')throw Error('origin');
      if(page.protocol==='https:'&&service.protocol!=='https:')throw Error('mixed');
      service.pathname='/api/online/ws';service.protocol=service.protocol==='https:'?'wss:':'ws:';
      return {endpoint:service.href,message:null};
    }catch{return {endpoint:null,message:'联机服务地址配置不正确；HTTPS网站需要配置不含密码、路径或查询参数的HTTPS服务器地址。请联系网站维护者。'};}
  }
  if(page.hostname.endsWith('.github.io'))return {endpoint:null,message:'此网址由GitHub Pages提供。学习工具和同屏对弈已可使用；联机房间服务器尚未接入。'};
  const service=new URL('./api/online/ws',page);service.protocol=page.protocol==='https:'?'wss:':'ws:';service.hash='';return {endpoint:service.href,message:null};
}

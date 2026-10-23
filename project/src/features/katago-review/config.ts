const loopback=(hostname:string)=>hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]';

/** A single public service address; never a credential or a client-selected URL. */
export function analysisOrigin(configured=import.meta.env.VITE_KATAGO_API_ORIGIN??'',pageOrigin=globalThis.location?.origin??''):string|null {
  if(!configured.trim())return null;
  try{
    const url=new URL(configured),page=new URL(pageOrigin);
    if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback(url.hostname)&&loopback(page.hostname)))return null;
    return url.origin;
  }catch{return null;}
}

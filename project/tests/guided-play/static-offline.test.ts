import {it,expect} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOnlineServer} from '../../server/http';

it.each([
  ['ONLINE_SETUP.md','# Local instructions','text/plain'],
  ['app.webmanifest','{"name":"Go Club"}','application/manifest+json'],
])('local production host serves required offline resource %s with a safe MIME type',async(filename,content,mime)=>{
  const dir=await mkdtemp(join(tmpdir(),'guided-offline-static-'));
  const app=await createOnlineServer({distDir:dir,repository:{load:async()=>[],save:async()=>{}}});
  try{
    await writeFile(join(dir,filename),content);const port=await app.listen(0);
    const response=await fetch(`http://127.0.0.1:${port}/${filename}`);
    expect(response.status).toBe(200);expect(response.headers.get('content-type')).toContain(mime);expect(response.headers.get('x-content-type-options')).toBe('nosniff');expect(await response.text()).toBe(content);
    expect((await fetch(`http://127.0.0.1:${port}/.env`)).status).toBe(404);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});

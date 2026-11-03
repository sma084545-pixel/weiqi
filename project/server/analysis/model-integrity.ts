import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';

/** Stream the pinned file before spawning the model. Some checkpoints share a generic internal name. */
export async function verifyPinnedModel(path:string,expectedSha256:string):Promise<void>{
  if(!/^[0-9a-f]{64}$/.test(expectedSha256))throw Error('Invalid pinned model checksum');
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(path,{highWaterMark:64*1024}))hash.update(chunk);
  if(hash.digest('hex')!==expectedSha256)throw Error('Model SHA-256 mismatch; refusing to start');
}

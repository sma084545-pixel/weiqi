import {compile} from 'json-schema-to-typescript';
import {readFile, writeFile} from 'node:fs/promises';
const schema=JSON.parse(await readFile('schemas/content.schema.json','utf8'));
const out=await compile(schema,'ContentDocument',{bannerComment:'/* Generated from schemas/content.schema.json. Run pnpm schema:types. */',ignoreMinAndMaxItems:true,unreachableDefinitions:true,additionalProperties:false});
const path='src/core/content.generated.d.ts';
if(process.argv.includes('--check')) {if(await readFile(path,'utf8')!==out) throw Error('Generated types drift: run pnpm schema:types');}
else await writeFile(path,out);

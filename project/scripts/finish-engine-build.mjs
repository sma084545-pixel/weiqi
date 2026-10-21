import {copyFileSync,writeFileSync,readFileSync,mkdirSync} from 'node:fs';
mkdirSync('dist-engine/types',{recursive:true});
copyFileSync('src/core/content.generated.d.ts','dist-engine/types/content.generated.d.ts');
const {version}=JSON.parse(readFileSync('package.json','utf8'));
writeFileSync('dist-engine/package.json',JSON.stringify({name:'go-club-rules',version,type:'module',private:true,exports:{'.':{types:'./types/rules/index.d.ts',import:'./go-club-rules.mjs'}}},null,2)+'\n');
copyFileSync('docs/t01/ENGINE_USAGE.md','dist-engine/README.md');
// Preserve notices for runtime dependencies actually included by the bundle.
const map=JSON.parse(readFileSync('dist-engine/go-club-rules.mjs.map','utf8'));
const packages=new Set(map.sources.flatMap(s=>{const m=/node_modules\/\.pnpm\/([^/]+)\/node_modules\/([^/]+)\//.exec(s);return m?[`${m[1]}/node_modules/${m[2]}`]:[];}));
let notices='---\nschemaVersion: 1\nid: DOC-T01-THIRD-PARTY\nrevision: 1\nrulesetId: GO-CLUB-AREA-1\n---\n\n# Bundled runtime dependency notices\n\nOriginal project rules, expressions and code are identified separately in SOURCES.md. These dependency notices preserve their respective licenses.\n';
for(const p of [...packages].sort()){
 const base=`node_modules/.pnpm/${p}`,pkg=JSON.parse(readFileSync(`${base}/package.json`,'utf8'));
 const license=readFileSync(`${base}/LICENSE`,'utf8');
 notices+=`\n## ${pkg.name} ${pkg.version}\n\n${license}\n`;
}
writeFileSync('dist-engine/THIRD_PARTY_NOTICES.md',notices);

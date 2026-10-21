import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=(file:string)=>readFileSync(file,'utf8');
it('includes all mandatory documents and schema identity',()=>{for(const name of ['PROJECT_CONTRACT','RULES','CURRICULUM','TERMINOLOGY','CONTENT_SCHEMA','INTERFACES','requirements-matrix']){const text=read(`docs/${name}.md`);expect(text).toContain('schemaVersion: 1');expect(text).toContain('rulesetId: GO-CLUB-AREA-1');}});
it('reserves six stages and all 25 actual tasks',()=>{const curriculum=read('docs/CURRICULUM.md');for(let i=1;i<=6;i++)expect(curriculum).toContain(`STAGE-0${i}`);const matrix=read('docs/requirements-matrix.md');for(let i=0;i<=24;i++)expect(matrix).toContain(`| T${String(i).padStart(2,'0')} |`);});
it('preserves required history, pass, score and evidence boundaries',()=>{const rules=read('docs/RULES.md');for(const phrase of ['positional superko','包含初始布局','不做重复检查','不清空历史','两次停手','默认0','提子数','fresh-setup','双活','不实现未经证明的通用死活'])expect(rules).toContain(phrase);});

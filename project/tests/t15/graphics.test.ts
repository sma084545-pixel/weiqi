import {describe,expect,it} from 'vitest';
import {batchDiagramZip,diagramSource,pdfForDiagram,svgForDiagram,zipStored} from '../../src/features/file-exchange/graphics';
import {T14_TEMPLATES} from '../../src/features/teacher-editor/templates';

describe('T15 diagram exports',()=>{
  const source=diagramSource(T14_TEMPLATES[0])!;
  it('separates question and answer layers and keeps ID/revision',()=>{const question=svgForDiagram(source,{preset:'question'}),answer=svgForDiagram(source,{preset:'answer'});expect(question).toContain('data-preset="question"');expect(question).toContain('TEMPLATE-LIB-001 · revision 1 · 不带答案');expect(question).not.toContain('data-answer="true"');expect(answer).toContain('data-answer="true"');expect(answer).toContain('答案：4');});
  it('marks crops as views rather than real board edges and preserves coordinates',()=>{const svg=svgForDiagram(source,{crop:{rowStart:1,colStart:1,rowEnd:4,colEnd:4}});expect(svg).toContain('虚线不是实际棋盘边界');expect(svg).toContain('crop-frame');expect(svg).toContain('>B<');expect(svg).toContain('>4<');});
  it('creates an A4 PDF with vector drawing commands and visible coordinate fill',()=>{const pdf=pdfForDiagram(source,{printWidthMm:160}),text=new TextDecoder('latin1').decode(pdf);expect(text.startsWith('%PDF-1.4')).toBe(true);expect(text).toContain('/MediaBox [0 0 595.28 841.89]');expect(text).toContain('0.12 0.12 0.12 rg');expect(text).toContain('(A) Tj');expect(text).toContain('TEMPLATE-LIB-001 r1 QUESTION');});
  it('creates a valid stored ZIP and manifest using stable filenames',async()=>{const result=await batchDiagramZip(T14_TEMPLATES.map(item=>diagramSource(item)!), 'svg',{preset:'question'});expect(result.files).toHaveLength(5);expect(result.manifest.files[0].filename).toBe('TEMPLATE-LIB-001-r1-question.svg');expect(new TextDecoder('latin1').decode(result.zip.slice(0,4))).toBe('PK\u0003\u0004');expect(zipStored(result.files).length).toBeGreaterThan(1000);});
});

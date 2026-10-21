import {describe,expect,it} from 'vitest';
import {listSgfLines,materializeSgfLine,previewSgf,serializeGameToSgf,serializeSgfTree} from '../../src/features/file-exchange/sgf';

const tree='(;GM[1]FF[4]CA[UTF-8]SZ[19]RU[GO-CLUB-AREA-1]KM[0]PL[B]AB[aa]AW[ss]C[中文与转义 \\] 和 \\\\ 以及 (括号)];B[as];W[](;B[sa]C[右上角])(;B[bb]C[第二分支]))';

describe('T15 SGF FF[4] subset',()=>{
  it('keeps setup, corners, pass, UTF-8 comment, escaping and two branches',()=>{
    const preview=previewSgf(tree,'tree.sgf');expect(preview.ok).toBe(true);expect(preview.size).toBe(19);expect(preview.position?.stones).toEqual([{row:0,col:0,color:'B'},{row:18,col:18,color:'W'}]);expect(preview.nodeCount).toBe(5);expect(preview.branchCount).toBe(1);
    const lines=listSgfLines(preview);expect(lines).toHaveLength(2);const one=materializeSgfLine(preview,lines[0]);expect(one.ok).toBe(true);if(one.ok){expect(one.value.game.moves.map(move=>move.type)).toEqual(['place','pass','place']);expect(one.value.omittedBranchCount).toBe(1);}
    const serialized=serializeSgfTree(preview.games[0]);expect(serialized).toContain('C[中文与转义 \\] 和 \\\\ 以及 (括号)]');const again=previewSgf(serialized,'again.sgf');expect(again.ok).toBe(true);expect(listSgfLines(again)).toHaveLength(2);
  });

  it('accepts legacy tt pass for <=19 and preserves top-left coordinate direction',()=>{const preview=previewSgf('(;GM[1]FF[4]CA[UTF-8]SZ[19]RU[GO-CLUB-AREA-1]PL[B];B[aa];W[tt])','pass.sgf');expect(preview.ok).toBe(true);const result=materializeSgfLine(preview,listSgfLines(preview)[0]);expect(result.ok).toBe(true);if(result.ok){expect(result.value.game.board[0][0]).toBe('B');expect(result.value.game.moves[1].type).toBe('pass');}});

  it('warns for unsupported properties and refuses silent rules conversion',()=>{const preview=previewSgf('(;GM[1]FF[4]CA[UTF-8]SZ[9]RU[Japanese]PL[B]PB[甲];B[aa])','rules.sgf');expect(preview.ok).toBe(true);expect(preview.ruleDisposition).toBe('conflict');expect(preview.warnings.join(' ')).toContain('Japanese');expect(preview.warnings.join(' ')).toContain('PB');const unknown=previewSgf('(;GM[1]FF[4]CA[UTF-8]SZ[9]PL[B])','unknown.sgf');expect(unknown.ruleDisposition).toBe('unknown');});

  it('blocks non-root setup, invalid charset, bad syntax and node limit',()=>{expect(previewSgf('(;GM[1]FF[4]CA[UTF-8]SZ[9]PL[B];AB[aa])','setup.sgf').issues.some(item=>item.code==='SGF_NON_ROOT_SETUP')).toBe(true);expect(previewSgf('(;GM[1]FF[4]CA[Big5]SZ[9]PL[B])','charset.sgf').issues.some(item=>item.code==='SGF_CHARSET')).toBe(true);expect(previewSgf('(;GM[1]FF[4]SZ[9]','broken.sgf').ok).toBe(false);expect(previewSgf('(;GM[1]FF[4]CA[UTF-8]SZ[9]PL[B];B[aa];W[bb])','nodes.sgf',{limits:{maxSgfNodes:2}}).issues.some(item=>item.code==='SGF_NODE_LIMIT')).toBe(true);});

  it('exports a verified GameState with setup, KM, RU and pass',()=>{const preview=previewSgf('(;GM[1]FF[4]CA[UTF-8]SZ[9]RU[GO-CLUB-AREA-1]KM[0.5]PL[B]AB[cc];B[dd];W[])','game.sgf');const materialized=materializeSgfLine(preview,listSgfLines(preview)[0]);if(!materialized.ok)throw new Error(materialized.issue.message);const output=serializeGameToSgf(materialized.value.game);expect(output.text).toContain('RU[GO-CLUB-AREA-1]');expect(output.text).toContain('KM[0.5]');expect(output.text).toContain('AB[cc]');expect(output.text).toContain(';W[]');expect(previewSgf(output.text,'roundtrip.sgf').ok).toBe(true);});
});

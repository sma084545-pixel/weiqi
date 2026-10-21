// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {Board} from '../src/components/Board';
import type {BoardMarker,BoardMode} from '../src/components/board.types';
import type {Coord,Size,StoneValue} from '../src/core/content.generated';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|undefined;
afterEach(()=>{if(root)act(()=>root?.unmount());root=undefined;document.body.innerHTML='';});
const matrix=(size:Size):StoneValue[][]=>Array.from({length:size},()=>Array<StoneValue>(size).fill(null));
function mount(options:{size?:Size;mode?:BoardMode;board?:StoneValue[][];markers?:BoardMarker[];unavailablePoints?:Coord[];focusPoint?:Coord|null}={}){
  const size=options.size??9,board=options.board??matrix(size),onSelect=vi.fn(),onPlay=vi.fn(),onFocusChange=vi.fn();
  const host=document.createElement('div');document.body.append(host);root=createRoot(host);
  act(()=>root!.render(<Board size={size} board={board} mode={options.mode} selected={null} onSelect={onSelect} onPlay={onPlay} label="坐标示意棋盘" markers={options.markers} unavailablePoints={options.unavailablePoints} focusPoint={options.focusPoint} onFocusChange={onFocusChange}/>));
  return {size,board,onSelect,onPlay,onFocusChange,host,cells:host.querySelectorAll<HTMLButtonElement>('[role=gridcell]')};
}

describe('固定几何与坐标',()=>{
  it.each([5,9,13,19] as const)('renders complete %i board with N² points and N+N lines',size=>{
    const {host}=mount({size});
    expect(host.querySelectorAll('[role=gridcell]')).toHaveLength(size*size);
    expect(host.querySelectorAll('[data-board-line-axis="horizontal"]')).toHaveLength(size);
    expect(host.querySelectorAll('[data-board-line-axis="vertical"]')).toHaveLength(size);
    expect(host.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(host.querySelector('[role=gridcell]')?.getAttribute('aria-label')).toBe(`A${size}，空点，可选择`);
  });
  it('uses display columns that skip I and rows counted bottom-up',()=>{
    const {cells}=mount({size:9});
    expect(cells[8].getAttribute('aria-label')).toContain('J9');
    expect(cells[72].getAttribute('aria-label')).toContain('A1');
    expect(cells[80].getAttribute('aria-label')).toContain('J1');
  });
});

describe('controlled interaction',()=>{
  it('arrow navigation clamps at corners and emits controlled focus',()=>{
    const {cells,onFocusChange}=mount({size:5});
    act(()=>cells[0].focus());
    act(()=>cells[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true})));
    expect(document.activeElement).toBe(cells[0]);
    act(()=>cells[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
    expect(document.activeElement).toBe(cells[1]);
    act(()=>cells[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));
    expect(document.activeElement).toBe(cells[6]);
    expect(onFocusChange).toHaveBeenLastCalledWith({row:1,col:1});
  });
  it('reports all four corners exactly once without altering the controlled board',()=>{
    const {cells,board,onSelect}=mount({size:9});const before=JSON.stringify(board);
    for(const [index,row,col] of [[0,0,0],[8,0,8],[72,8,0],[80,8,8]]){act(()=>cells[index].click());expect(onSelect).toHaveBeenLastCalledWith({row,col});}
    expect(onSelect).toHaveBeenCalledTimes(4);expect(JSON.stringify(board)).toBe(before);expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
  });
  it('routes play to onPlay while readonly, occupied, and unavailable points stay inert',()=>{
    const board=matrix(5);board[0][0]='B';
    const played=mount({size:5,mode:'play',board,unavailablePoints:[{row:0,col:1}]});
    act(()=>played.cells[0].click());act(()=>played.cells[1].click());act(()=>played.cells[2].click());
    expect(played.onPlay).toHaveBeenCalledOnce();expect(played.onPlay).toHaveBeenCalledWith({row:0,col:2});expect(played.onSelect).not.toHaveBeenCalled();
    act(()=>root?.unmount());root=undefined;document.body.innerHTML='';
    const readonly=mount({size:5,mode:'readonly'});act(()=>readonly.cells[0].click());expect(readonly.onSelect).not.toHaveBeenCalled();expect(readonly.cells[0].getAttribute('aria-label')).toContain('只读');
  });
});

describe('markers and safe text',()=>{
  it('exposes every marker in text and rejects out-of-board markers from rendering',()=>{
    const markers:BoardMarker[]=[
      {markerId:'a',kind:'liberty',at:{row:0,col:0}},{markerId:'b',kind:'target',at:{row:0,col:1}},
      {markerId:'c',kind:'last-move',at:{row:0,col:2}},{markerId:'d',kind:'sequence',at:{row:0,col:3},number:4},
      {markerId:'e',kind:'candidate',at:{row:0,col:4}},{markerId:'f',kind:'ownership',at:{row:1,col:0},owner:'neutral'},
      {markerId:'g',kind:'group',at:{row:1,col:1}},
      {markerId:'bad',kind:'target',at:{row:5,col:5}},
    ];
    const {host,cells}=mount({size:5,mode:'mark',markers});
    expect(host.querySelectorAll('[data-marker-kind]')).toHaveLength(7);
    expect(cells[0].getAttribute('aria-label')).toContain('气');expect(cells[3].getAttribute('aria-label')).toContain('顺序 4');expect(cells[5].getAttribute('aria-label')).toContain('中立区域');expect(cells[6].getAttribute('aria-label')).toContain('已选棋块');
    expect(host.querySelector('[role=status]')?.textContent).toContain('1 个超出完整棋盘');
  });
  it('renders an untrusted label as text without creating markup',()=>{
    const {host}=mount();
    act(()=>root!.render(<Board size={5} board={matrix(5)} selected={null} onSelect={()=>{}} label={'<script>alert(1)</script>'}/>));
    expect(host.querySelector('script')).toBeNull();expect(host.querySelector('figcaption')?.textContent).toContain('<script>alert(1)</script>');
  });
});

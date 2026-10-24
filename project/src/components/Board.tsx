import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import type {BoardMarker,BoardProps} from '../core/rules/contract';
import {displayCoord,inBounds} from '../core/coordinates';
import {COLUMNS} from '../core/constants';
import './Board.css';

const pointKey=(row:number,col:number)=>`${row},${col}`;
const MARKER_ORDER:Record<BoardMarker['kind'],number>={
  ownership:0,candidate:1,liberty:2,group:3,target:4,'last-move':5,sequence:6,
};

function markerDescription(marker:BoardMarker):string {
  if(marker.label?.trim())return marker.label.trim();
  switch(marker.kind){
    case 'liberty':return '气';
    case 'group':return '已选棋块';
    case 'target':return '目标';
    case 'last-move':return '最后一手';
    case 'sequence':return `顺序 ${marker.number??'未编号'}`;
    case 'candidate':return '候选点';
    case 'ownership':return marker.owner==='B'?'黑方区域':marker.owner==='W'?'白方区域':'中立区域';
  }
}

function markerNode(marker:BoardMarker){
  const common={className:`board-marker marker-${marker.kind}${marker.owner?` owner-${marker.owner}`:''}`,'data-marker-kind':marker.kind,'data-marker-text':marker.text,'aria-hidden':true} as const;
  if((marker.kind==='candidate'||marker.kind==='liberty')&&marker.text)return <span {...common}>{marker.text.slice(0,3)}</span>;
  if(marker.kind==='sequence')return <span {...common}>{marker.number??'?'}</span>;
  if(marker.kind==='ownership')return <span {...common}>{marker.owner==='B'?'黑':marker.owner==='W'?'白':'中'}</span>;
  return <span {...common}/>;
}

/** Controlled rendering surface. It never edits board data or decides move legality. */
export function Board({
  size,board,label,mode='select',disabled=false,selected,onSelect,onPlay,
  focusPoint,onFocusChange,markers=[],unavailablePoints=[],showCoordinates=true,
  displayMode='standard',zoom=1,resetViewKey=0,
}:BoardProps){
  const descriptionId=useId();
  const issueId=useId();
  const viewport=useRef<HTMLDivElement>(null);
  const grid=useRef<HTMLDivElement>(null);
  const cells=useRef(new Map<number,HTMLButtonElement>());
  const [internalFocus,setInternalFocus]=useState({row:0,col:0});
  const indices=useMemo(()=>Array.from({length:size},(_,i)=>i),[size]);
  const unavailable=useMemo(()=>new Set(unavailablePoints.filter(p=>inBounds(p,size)).map(p=>pointKey(p.row,p.col))),[size,unavailablePoints]);
  const validMarkers=useMemo(()=>markers.filter(m=>inBounds(m.at,size)).slice().sort((a,b)=>MARKER_ORDER[a.kind]-MARKER_ORDER[b.kind]),[markers,size]);
  const markersByPoint=useMemo(()=>{
    const result=new Map<string,BoardMarker[]>();
    for(const marker of validMarkers){const key=pointKey(marker.at.row,marker.at.col);result.set(key,[...(result.get(key)??[]),marker]);}
    return result;
  },[validMarkers]);
  const invalidMarkerCount=markers.length-validMarkers.length;
  const requestedFocus=focusPoint&&inBounds(focusPoint,size)?focusPoint:internalFocus;
  const activeFocus=inBounds(requestedFocus,size)?requestedFocus:{row:0,col:0};
  const activeIndex=activeFocus.row*size+activeFocus.col;
  const normalizedZoom=Number.isFinite(zoom)?Math.min(1.5,Math.max(.75,zoom)):1;
  const minPoint=displayMode==='projector'?40:32;
  const idealPoint=displayMode==='projector'?64:54;
  const style={
    '--board-min':`${Math.round(size*minPoint*normalizedZoom+2)}px`,
    '--board-ideal':`${Math.round(size*idealPoint*normalizedZoom+2)}px`,
    '--board-size':size,
  } as CSSProperties;

  useEffect(()=>{
    if(!inBounds(internalFocus,size))setInternalFocus({row:0,col:0});
  },[internalFocus,size]);

  useEffect(()=>{
    const node=viewport.current;
    if(node){node.scrollLeft=0;node.scrollTop=0;}
  },[resetViewKey,size]);

  useEffect(()=>{
    if(!focusPoint||!grid.current?.contains(grid.current.ownerDocument.activeElement))return;
    cells.current.get(activeIndex)?.focus({preventScroll:true});
  },[activeIndex,focusPoint]);

  const moveFocus=(row:number,col:number)=>{
    const next={row,col};setInternalFocus(next);onFocusChange?.(next);
    cells.current.get(row*size+col)?.focus({preventScroll:true});
  };

  const navigate=(event:KeyboardEvent<HTMLButtonElement>,row:number,col:number)=>{
    const next:Record<string,[number,number]>={
      ArrowUp:[Math.max(0,row-1),col],ArrowDown:[Math.min(size-1,row+1),col],
      ArrowLeft:[row,Math.max(0,col-1)],ArrowRight:[row,Math.min(size-1,col+1)],
      Home:[row,0],End:[row,size-1],
    };
    if(!next[event.key])return;
    event.preventDefault();moveFocus(...next[event.key]);
  };

  return <figure className={`shared-board display-${displayMode}`} data-board-size={size} data-board-mode={mode}>
    <figcaption id={descriptionId} className="visually-hidden">{label}。方向键移动焦点；可操作模式中按 Enter 或空格执行。</figcaption>
    <div ref={viewport} className="board-viewport" aria-label={`${size}路完整棋盘区域，局部滚动`} tabIndex={-1}>
      <div className={`board-frame${showCoordinates?'':' coordinates-hidden'}`} style={style}>
        {showCoordinates&&<div className="column-labels" aria-hidden="true">{indices.map(col=><span key={col}>{COLUMNS[col]}</span>)}</div>}
        {showCoordinates&&<div className="row-labels" aria-hidden="true">{indices.map(row=><span key={row}>{size-row}</span>)}</div>}
        <div ref={grid} className="board-grid" role="grid" aria-labelledby={descriptionId} aria-describedby={invalidMarkerCount?issueId:undefined} aria-rowcount={size} aria-colcount={size}>
          <svg className="board-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {indices.map(i=>{const p=(i+.5)*100/size,edge=50/size;return <g key={i}><line data-board-line-axis="horizontal" x1={edge} x2={100-edge} y1={p} y2={p}/><line data-board-line-axis="vertical" y1={edge} y2={100-edge} x1={p} x2={p}/></g>;})}
          </svg>
          {indices.map(row=><div className="board-row" role="row" key={row}>{indices.map(col=>{
            const value=board[row]?.[col]??null;
            const index=row*size+col;
            const key=pointKey(row,col);
            const pointMarkers=markersByPoint.get(key)??[];
            const isSelected=selected?.row===row&&selected.col===col;
            const unavailableHere=unavailable.has(key);
            const canAct=!disabled&&mode!=='readonly'&&!unavailableHere&&!(mode==='play'&&value!==null);
            const state=value==='B'?'黑子':value==='W'?'白子':'空点';
            const action=mode==='readonly'?'只读':mode==='play'?(value?'占用，不可落':unavailableHere?'不可落':'可落'):unavailableHere?'不可操作':mode==='mark'?'可标记':'可选择';
            const accessibleName=[displayCoord({row,col},size),state,action,...pointMarkers.map(markerDescription)].join('，');
            const activate=()=>{if(!canAct)return;if(mode==='play')onPlay?.({row,col});else onSelect({row,col});};
            return <button
              key={col} type="button" role="gridcell"
              className={`intersection${isSelected?' selected':''}${canAct?' actionable':''}${unavailableHere?' unavailable':''}`}
              ref={el=>{if(el)cells.current.set(index,el);else cells.current.delete(index);}}
              tabIndex={index===activeIndex?0:-1}
              aria-disabled={!canAct}
              aria-selected={isSelected}
              aria-rowindex={row+1} aria-colindex={col+1}
              aria-label={accessibleName}
              data-row={row} data-col={col} data-stone={value??'empty'}
              onFocus={()=>{setInternalFocus({row,col});onFocusChange?.({row,col});}}
              onKeyDown={event=>navigate(event,row,col)}
              onClick={activate}
            >
              <span className="point-preview" aria-hidden="true"/>
              {pointMarkers.map(marker=><span className="marker-slot" key={marker.markerId}>{markerNode(marker)}</span>)}
              {value&&<span className={`stone ${value==='B'?'black':'white'}`} aria-hidden="true"><span>{value==='B'?'黑':'白'}</span></span>}
              {isSelected&&<span className="selection-ring" aria-hidden="true"/>}
            </button>;
          })}</div>)}
        </div>
      </div>
    </div>
    {invalidMarkerCount>0&&<p id={issueId} className="board-render-issue" role="status">有 {invalidMarkerCount} 个超出完整棋盘的标记未显示。</p>}
  </figure>;
}

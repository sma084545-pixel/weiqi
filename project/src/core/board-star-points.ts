import type {Coord,Size} from './content.generated';

/** Visual orientation marks only. They never affect rules, handicap placement or saves. */
const STAR_POINTS:Readonly<Record<Size,readonly Coord[]>>={
  5:[{row:2,col:2}],
  9:[{row:2,col:2},{row:2,col:6},{row:4,col:4},{row:6,col:2},{row:6,col:6}],
  13:[{row:3,col:3},{row:3,col:9},{row:6,col:6},{row:9,col:3},{row:9,col:9}],
  19:[3,9,15].flatMap(row=>[3,9,15].map(col=>({row,col}))),
};

export const boardStarPoints=(size:Size):readonly Coord[]=>STAR_POINTS[size];

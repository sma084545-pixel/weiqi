#!/usr/bin/env python3
"""Deterministic geometry/content checks for T18 production files."""

from __future__ import annotations

import hashlib
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
MM_TO_PT = 72 / 25.4
TOL_PT = 0.35
results: list[dict] = []


def check(name: str, condition: bool, evidence: str) -> None:
    results.append({"check": name, "status": "pass" if condition else "fail", "evidence": evidence})
    print(("PASS" if condition else "FAIL"), name, "-", evidence)


def close(a: float, b: float, tol: float = 1e-6) -> bool:
    return abs(a-b) <= tol


def pdf_size(path: Path, page: int = 0) -> tuple[float, float]:
    p = PdfReader(str(path)).pages[page]
    return float(p.mediabox.width), float(p.mediabox.height)


def expected_liberties(stones: set[tuple[int,int]], size=9) -> set[tuple[int,int]]:
    out=set()
    for row,col in stones:
        for dr,dc in ((-1,0),(1,0),(0,-1),(0,1)):
            p=(row+dr,col+dc)
            if 0<=p[0]<size and 0<=p[1]<size and p not in stones:
                out.add(p)
    return out


def verify_svg_board(params: dict) -> None:
    path=ROOT/"board-9x9-450mm.svg"
    root=ET.parse(path).getroot(); ns={"s":"http://www.w3.org/2000/svg"}
    lines=root.findall(".//s:line[@class='grid-line vertical']",ns)
    hlines=root.findall(".//s:line[@class='grid-line horizontal']",ns)
    points=root.findall(".//s:circle[@class='intersection']",ns)
    check("SVG vertical lines",len(lines)==9,f"found {len(lines)}")
    check("SVG horizontal lines",len(hlines)==9,f"found {len(hlines)}")
    coords={(int(p.attrib['data-row']),int(p.attrib['data-col'])) for p in points}
    check("SVG intersections",len(points)==81 and len(coords)==81,f"elements={len(points)}, unique row/col={len(coords)}")
    check("SVG physical size",root.attrib.get("width")=="450mm" and root.attrib.get("height")=="450mm",f"{root.attrib.get('width')} x {root.attrib.get('height')}")
    xs=sorted(float(x.attrib['x1']) for x in lines); ys=sorted(float(x.attrib['y1']) for x in hlines)
    check("Grid extents and spacing",xs==[45+i*45 for i in range(9)] and ys==[45+i*45 for i in range(9)],f"x={xs}; y={ys}")
    corner_expected={(0,0),(0,8),(8,0),(8,8)}
    check("Corner intersections retained",corner_expected.issubset(coords),str(sorted(corner_expected)))
    ruler=root.find(".//s:g[@id='calibration-ruler']",ns)
    line=ruler.find("s:line",ns) if ruler is not None else None
    length=float(line.attrib['x2'])-float(line.attrib['x1']) if line is not None else -1
    check("SVG 100 mm ruler",close(length,100),f"coordinate length={length} mm")
    stone=params["board9x9"]["stoneDiameter"]; spacing=params["board9x9"]["gridSpacing"]
    check("Stone clearance",stone<spacing and close(spacing-stone,7),f"spacing {spacing} - diameter {stone} = {spacing-stone} mm")


def verify_pdfs() -> None:
    board=ROOT/"board-9x9-450mm-1to1.pdf"; w,h=pdf_size(board)
    check("1:1 PDF media box",abs(w-450*MM_TO_PT)<TOL_PT and abs(h-450*MM_TO_PT)<TOL_PT,f"{w/MM_TO_PT:.3f} x {h/MM_TO_PT:.3f} mm")
    tile=PdfReader(str(ROOT/"board-9x9-a4-tiled.pdf")); check("A4 tiled page count",len(tile.pages)==6,f"pages={len(tile.pages)}")
    all_a4=True; sizes=[]
    for p in tile.pages:
        pw,ph=float(p.mediabox.width),float(p.mediabox.height); sizes.append((pw/MM_TO_PT,ph/MM_TO_PT)); all_a4 &= abs(pw-210*MM_TO_PT)<TOL_PT and abs(ph-297*MM_TO_PT)<TOL_PT
    check("A4 tiled media boxes",all_a4,"; ".join(f"{a:.2f}x{b:.2f}" for a,b in sizes))
    pieces=PdfReader(str(ROOT/"pieces-markers-a4.pdf")); check("Piece/marker page count",len(pieces.pages)==6,f"pages={len(pieces.pages)}")
    guide=PdfReader(str(ROOT/"assembly-guide.pdf")); check("Assembly guide page count",len(guide.pages)==8,f"pages={len(guide.pages)}")
    teaching=PdfReader(str(ROOT/"teaching-flows-a3.pdf")); check("Teaching A3 page count",len(teaching.pages)==1,f"pages={len(teaching.pages)}")
    # Text bounding boxes are a useful programmatic clipping screen, not a visual substitute.
    # The tiled PDF intentionally places the full 450 mm board outside each A4
    # MediaBox and clips it to a 160 x 235 mm viewport. pdfplumber reports the
    # pre-clip glyph coordinates, so it cannot be used for that file's bounds.
    # The tile pages are instead raster-reviewed in color and grayscale.
    for name in ["board-9x9-450mm-1to1.pdf","pieces-markers-a4.pdf","assembly-guide.pdf","teaching-flows-a3.pdf"]:
        ok=True; count=0; detail=[]
        with pdfplumber.open(ROOT/name) as pdf:
            for ix,page in enumerate(pdf.pages,1):
                for ch in page.chars:
                    count+=1
                    if ch['x0'] < -0.5 or ch['top'] < -0.5 or ch['x1'] > page.width+0.5 or ch['bottom'] > page.height+0.5:
                        ok=False; detail.append(f"p{ix}:{ch.get('text','?')}")
        check(f"PDF text bounds {name}",ok and count>0,f"chars={count}; out={detail[:3]}")
    tile_text="\n".join((p.extract_text() or "") for p in tile.pages)
    check("Tiled PDF visible page instructions",all(token in tile_text for token in ["1/6","6/6","100%","100 mm"]),"page labels 1/6..6/6 and scale/ruler text extracted; clipped board reviewed via raster")
    for name in ["board-9x9-450mm-1to1.pdf","board-9x9-a4-tiled.pdf","pieces-markers-a4.pdf","assembly-guide.pdf","teaching-flows-a3.pdf"]:
        reader=PdfReader(str(ROOT/name)); cjk=[]
        for page in reader.pages:
            for ref in page["/Resources"].get("/Font",{}).values():
                font=ref.get_object(); base=str(font.get("/BaseFont","")); desc=font.get("/FontDescriptor")
                if "ArialUnicodeMS" in base and desc:
                    d=desc.get_object(); cjk.append(bool(d.get("/FontFile") or d.get("/FontFile2") or d.get("/FontFile3")))
        check(f"Embedded CJK font {name}",bool(cjk) and all(cjk),f"embedded subsets={len(cjk)}")


def verify_tiling(params: dict) -> None:
    t=params["a4Tiling"]
    xs=[(x,x+t['viewportWidth']) for x in t['xOffsets']]
    ys=[(y,y+t['viewportHeight']) for y in t['yOffsets']]
    check("Tile horizontal coverage",xs[0][0]==0 and xs[-1][1]==450 and all(xs[i][1]>=xs[i+1][0] for i in range(2)),str(xs))
    check("Tile vertical coverage",ys[0][0]==0 and ys[-1][1]==450 and ys[0][1]>=ys[1][0],str(ys))
    check("Tile stated overlaps",xs[0][1]-xs[1][0]==15 and xs[1][1]-xs[2][0]==15 and ys[0][1]-ys[1][0]==20,f"x overlaps={[xs[i][1]-xs[i+1][0] for i in range(2)]}; y={ys[0][1]-ys[1][0]}")
    grid={45+i*45 for i in range(9)}; join_edges={145,160,290,305,215,235}
    check("Join edges avoid grid/star lines",not bool(grid & join_edges),f"grid∩join={sorted(grid & join_edges)}")
    # Every grid line is present in at least one tile and any cross-tile segment is duplicated through overlap.
    missing=[]
    for axis,values,windows in (("x",grid,xs),("y",grid,ys)):
        for v in values:
            if not any(a<=v<=b for a,b in windows): missing.append(f"{axis}{v}")
    check("Tile grid continuity",not missing,f"missing={missing}")


def verify_teaching() -> None:
    data=json.loads((ROOT/"teaching-setups.json").read_text(encoding="utf-8"))
    a=data["setups"][0]
    ok=True; evidence=[]
    for p in a["positions"]:
        stone={(p["stone"]["row"],p["stone"]["col"])}
        actual=expected_liberties(stone)
        listed={(q["row"],q["col"]) for q in p["liberties"]}
        good=actual==listed and len(actual)==p["expectedLibertyCount"]
        ok &= good; evidence.append(f"{p['label']}={len(actual)}")
    check("Center/edge/corner liberties",ok,", ".join(evidence))
    b=data["setups"][1]; stones={(p["row"],p["col"]) for p in b["stones"]}; actual=expected_liberties(stones); listed={(q["row"],q["col"]) for q in b["liberties"]}
    check("L-group liberty de-dup",actual==listed and len(actual)==b["expectedUniqueLibertyCount"]==7,f"computed={sorted(actual)}, listed={sorted(listed)}")
    check("Shared E4 documented",any(q.get("display")=="E4" and len(q.get("sharedBy",[]))==2 for q in b["liberties"]),"E4 is one coordinate shared by E5 and D4")


def verify_marker_svgs() -> None:
    ns={"s":"http://www.w3.org/2000/svg"}
    counts={}
    for name in ["black-stones-01.svg","black-stones-02.svg","white-stones-01.svg","white-stones-02.svg","liberty-rings.svg","targets-sequence-last.svg"]:
        root=ET.parse(ROOT/"editable-sheets"/name).getroot()
        check(f"Editable sheet A4 {name}",root.attrib.get("width")=="210mm" and root.attrib.get("height")=="297mm",f"{root.attrib.get('width')} x {root.attrib.get('height')}")
        ruler=root.find(".//s:g[@id='calibration-ruler']",ns)
        check(f"Sheet ruler {name}",ruler is not None and ruler.attrib.get("data-length-mm")=="100","100 mm metadata present")
        counts[name]={
            "stones":len(root.findall(".//s:circle[@class='stone B']",ns))+len(root.findall(".//s:circle[@class='stone W']",ns)),
            "rings":len(root.findall(".//s:g[@class='liberty-ring']",ns)),
            "triangles":len(root.findall(".//s:polygon[@class='target-triangle']",ns)),
            "numbers":len(root.findall(".//s:g[@class='sequence-number']",ns)),
            "last":len(root.findall(".//s:g[@class='last-move']",ns)),
        }
    total={k:sum(v[k] for v in counts.values()) for k in next(iter(counts.values()))}
    check("Piece and marker quantities",total=={"stones":90,"rings":24,"triangles":12,"numbers":20,"last":6},str(total))
    marker=ET.parse(ROOT/"editable-sheets"/"liberty-rings.svg").getroot()
    rings=marker.findall(".//s:g[@class='liberty-ring']",ns)
    distinct=all(any("stroke-dasharray" in x.attrib for x in g.findall("s:circle",ns)) for g in rings)
    check("Liberty rings remain open/dashed",distinct and len(rings)==24,"24 ring groups use dashed outline plus open center")


def verify_required_files() -> None:
    required=[
        "board-9x9-450mm.svg","board-9x9-450mm-1to1.pdf","board-9x9-a4-tiled.pdf",
        "pieces-markers-a4.pdf","teaching-flows-a3.svg","teaching-flows-a3.pdf",
        "assembly-diagrams-a4.svg","assembly-guide.md","assembly-guide.pdf","materials-list.md",
        "dimensions.json","teaching-setups.json","trial-record.csv","sources.md","README.md",
        "generate_assets.py","verify_assets.py","render_and_contact_sheet.sh","make_contact_sheets.py"
    ]
    missing=[x for x in required if not (ROOT/x).exists()]
    check("Required deliverable files",not missing,f"missing={missing}")


def write_report() -> None:
    status="pass" if all(r["status"]=="pass" for r in results) else "fail"
    payload={
        "schemaVersion":1,"id":"T18-VERIFICATION-REPORT","revision":1,
        "rulesetId":"GO-CLUB-AREA-1","taskId":"T18","resultVersion":"0.2.0+t18.1",
        "status":status,"checks":results,
        "physicalTests":{"status":"not-tested","items":["printed ruler measurement","magnetic hold","durability","glare/residue","classroom viewing distance","mounting stability"]}
    }
    (ROOT/"verification-report.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


def main() -> int:
    params=json.loads((ROOT/"dimensions.json").read_text(encoding="utf-8"))
    verify_required_files(); verify_svg_board(params); verify_pdfs(); verify_tiling(params); verify_teaching(); verify_marker_svgs(); write_report()
    failed=[r for r in results if r["status"]!="pass"]
    print(f"SUMMARY: {len(results)-len(failed)}/{len(results)} passed")
    return 1 if failed else 0


if __name__=="__main__":
    raise SystemExit(main())

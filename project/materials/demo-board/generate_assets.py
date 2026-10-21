#!/usr/bin/env python3
"""Generate all T18 vector/PDF production assets from dimensions.json.

The board and teaching shapes are deterministic geometry, not generated images.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.lib.pagesizes import A3, A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent
EDITABLE = ROOT / "editable-sheets"
EDITABLE.mkdir(exist_ok=True)
PARAMS = json.loads((ROOT / "dimensions.json").read_text(encoding="utf-8"))
B = PARAMS["board9x9"]
M = PARAMS["markers"]

FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
if not FONT_PATH.exists():
    raise SystemExit(f"Required local CJK font not found: {FONT_PATH}")
pdfmetrics.registerFont(TTFont("T18CJK", str(FONT_PATH)))
FONT = "T18CJK"

BOARD_BG = "#EDC585"
INK = "#18211C"
GREEN = "#23583D"
BLUE = "#007C91"
PALE = "#F3F6F4"
LINE = "#263028"
RED = "#A13B2B"


def svg_doc(width: float, height: float, body: str, title: str, desc: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}mm" height="{height}mm" viewBox="0 0 {width} {height}">
  <title>{escape(title)}</title>
  <desc>{escape(desc)}</desc>
  <metadata>schemaVersion=1; id=T18-DEMO-BOARD; revision=1; rulesetId=GO-CLUB-AREA-1; units=mm</metadata>
  <style>
    text {{ font-family: "Arial Unicode MS", "PingFang SC", sans-serif; fill: {INK}; }}
    .grid-line {{ stroke: {LINE}; stroke-width: 1.2; vector-effect: non-scaling-stroke; }}
    .cut-line {{ stroke: #777; stroke-width: .35; stroke-dasharray: 2 1; fill: none; }}
    .note {{ font-size: 4px; }} .small {{ font-size: 3.2px; }} .label {{ font-size: 5px; font-weight: 700; }}
  </style>
{body}
</svg>
'''


def svg_text(x: float, y: float, text: str, cls: str = "note", anchor: str = "start", extra: str = "") -> str:
    return f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}" {extra}>{escape(text)}</text>'


def calibration_svg(x: float, y: float, length: float = 100) -> str:
    parts = [f'<g id="calibration-ruler" data-length-mm="{length}">',
             f'<line x1="{x}" y1="{y}" x2="{x+length}" y2="{y}" stroke="{INK}" stroke-width="0.7"/>']
    for i in range(11):
        h = 4 if i in (0, 10) else 2.5 if i % 5 == 0 else 1.8
        parts.append(f'<line x1="{x+i*10}" y1="{y-h}" x2="{x+i*10}" y2="{y+h}" stroke="{INK}" stroke-width="0.6"/>')
    parts.append(svg_text(x + length / 2, y - 5, "100 mm 校准尺", "small", "middle"))
    parts.append("</g>")
    return "\n".join(parts)


def generate_board_svg() -> None:
    parts = [f'<rect id="board-background" x="0" y="0" width="450" height="450" fill="{BOARD_BG}"/>',
             '<rect x="1" y="1" width="448" height="448" rx="2" fill="none" stroke="#3B2F22" stroke-width="2"/>',
             '<g id="grid">']
    origin, end, spacing = B["gridOrigin"]["x"], B["gridEnd"]["x"], B["gridSpacing"]
    for i in range(9):
        p = origin + i * spacing
        parts.append(f'<line class="grid-line vertical" data-index="{i}" x1="{p}" y1="{origin}" x2="{p}" y2="{end}"/>')
        parts.append(f'<line class="grid-line horizontal" data-index="{i}" x1="{origin}" y1="{p}" x2="{end}" y2="{p}"/>')
    parts.append('</g>')
    parts.append('<g id="intersections" fill="none" stroke="none">')
    for row in range(9):
        for col in range(9):
            x, y = origin + col * spacing, origin + row * spacing
            parts.append(f'<circle class="intersection" data-row="{row}" data-col="{col}" cx="{x}" cy="{y}" r="0.25"/>')
    parts.append('</g>')
    for row, col in [(2, 2), (2, 6), (4, 4), (6, 2), (6, 6)]:
        x, y = origin + col * spacing, origin + row * spacing
        parts.append(f'<circle class="star-point" data-row="{row}" data-col="{col}" cx="{x}" cy="{y}" r="3" fill="{INK}"/>')
    columns = list("ABCDEFGHJ")
    for i, letter in enumerate(columns):
        x = origin + i * spacing
        parts.append(svg_text(x, 28, letter, "label", "middle"))
        parts.append(svg_text(x, 425, letter, "label", "middle"))
    for row in range(9):
        y = origin + row * spacing + 1.8
        display = str(9 - row)
        parts.append(svg_text(25, y, display, "label", "middle"))
        parts.append(svg_text(425, y, display, "label", "middle"))
    parts.append(svg_text(225, 12, "围棋社 9×9 演示盘｜交叉点落子", "label", "middle"))
    parts.append(svg_text(225, 435, "45 mm 网格｜38 mm 棋子｜打印 100%", "small", "middle"))
    parts.append(calibration_svg(45, 444, 100))
    (ROOT / "board-9x9-450mm.svg").write_text(svg_doc(450, 450, "\n".join(parts), "9×9 围棋演示盘 450 mm", "九横九竖、81交叉点、45 mm网格的可编辑矢量图。"), encoding="utf-8")


def pdf_text(c: canvas.Canvas, x: float, y: float, text: str, size: float, color=INK, anchor="left") -> None:
    c.setFillColor(HexColor(color) if isinstance(color, str) else color)
    c.setFont(FONT, size)
    if anchor == "center":
        c.drawCentredString(x, y, text)
    elif anchor == "right":
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)


def draw_calibration_pdf(c: canvas.Canvas, x: float, y: float, length_mm: float = 100, label_above: bool = True) -> None:
    c.setStrokeColor(HexColor(INK)); c.setLineWidth(0.65)
    c.line(x, y, x + length_mm * mm, y)
    for i in range(11):
        h = (4 if i in (0, 10) else 2.5 if i % 5 == 0 else 1.8) * mm
        c.line(x + i * 10 * mm, y - h, x + i * 10 * mm, y + h)
    label_y = y + 5 * mm if label_above else y - 7 * mm
    pdf_text(c, x + length_mm * mm / 2, label_y, "100 mm 校准尺", 8, anchor="center")


def draw_board_pdf(c: canvas.Canvas, x0: float, y0: float, scale: float = 1.0, labels: bool = True, ruler: bool = True) -> None:
    """Draw full 450mm board. x0/y0 are PDF bottom-left in points."""
    s = mm * scale
    c.setFillColor(HexColor(BOARD_BG)); c.rect(x0, y0, 450*s, 450*s, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#3B2F22")); c.setLineWidth(2*scale)
    c.roundRect(x0+1*s, y0+1*s, 448*s, 448*s, 2*s, fill=0, stroke=1)
    c.setStrokeColor(HexColor(LINE)); c.setLineWidth(1.2*scale)
    origin, spacing = 45, 45
    for i in range(9):
        p = origin + i*spacing
        c.line(x0+p*s, y0+(450-45)*s, x0+p*s, y0+(450-405)*s)
        c.line(x0+45*s, y0+(450-p)*s, x0+405*s, y0+(450-p)*s)
    c.setFillColor(HexColor(INK))
    for row, col in [(2,2),(2,6),(4,4),(6,2),(6,6)]:
        x = x0 + (45+col*45)*s
        y = y0 + (450-(45+row*45))*s
        c.circle(x, y, 3*s, fill=1, stroke=0)
    if labels:
        columns = list("ABCDEFGHJ")
        font_size = max(5, 13*scale)
        for i, letter in enumerate(columns):
            x = x0+(45+i*45)*s
            pdf_text(c, x, y0+(450-29)*s, letter, font_size, anchor="center")
            pdf_text(c, x, y0+(450-428)*s, letter, font_size, anchor="center")
        for row in range(9):
            y = y0+(450-(45+row*45))*s-font_size*.35
            pdf_text(c, x0+25*s, y, str(9-row), font_size, anchor="center")
            pdf_text(c, x0+425*s, y, str(9-row), font_size, anchor="center")
        pdf_text(c, x0+225*s, y0+(450-13)*s, "围棋社 9×9 演示盘｜交叉点落子", max(6, 12*scale), anchor="center")
        pdf_text(c, x0+225*s, y0+(450-437)*s, "45 mm 网格｜38 mm 棋子｜打印 100%", max(5, 9*scale), anchor="center")
    if ruler:
        draw_calibration_pdf(c, x0+45*s, y0+(450-444)*s, 100*scale, label_above=True)


def generate_board_pdf() -> None:
    path = ROOT / "board-9x9-450mm-1to1.pdf"
    size = 450 * mm
    c = canvas.Canvas(str(path), pagesize=(size, size), pageCompression=1)
    c.setTitle("T18 9x9 demo board 450mm 1:1")
    c.setAuthor("Go Club CAS project")
    c.setSubject("GO-CLUB-AREA-1; vector production board; print at 100 percent")
    draw_board_pdf(c, 0, 0, 1.0, True, True)
    c.showPage(); c.save()


def alignment_cross(c: canvas.Canvas, x: float, y: float, size=4*mm) -> None:
    c.setStrokeColor(HexColor("#555555")); c.setLineWidth(.4); c.setDash(2, 2)
    c.line(x-size, y, x+size, y); c.line(x, y-size, x, y+size); c.setDash()


def generate_tiled_pdf() -> None:
    cfg = PARAMS["a4Tiling"]
    pw, ph = A4
    left = 25 * mm
    top = 31 * mm
    vw, vh = cfg["viewportWidth"] * mm, cfg["viewportHeight"] * mm
    c = canvas.Canvas(str(ROOT / "board-9x9-a4-tiled.pdf"), pagesize=A4, pageCompression=1)
    c.setTitle("T18 9x9 demo board A4 tiled 100 percent")
    pages = [(r, col, cfg["xOffsets"][col], cfg["yOffsets"][r]) for r in range(2) for col in range(3)]
    for page_no, (row, col, xoff, yoff) in enumerate(pages, 1):
        pdf_text(c, pw/2, ph-13*mm, f"9×9 演示盘拼接页 {page_no}/6｜上排 1–3，下排 4–6", 11, GREEN, "center")
        pdf_text(c, pw/2, ph-20*mm, f"视窗：x {xoff}–{xoff+cfg['viewportWidth']} mm；y {yoff}–{yoff+cfg['viewportHeight']} mm", 7.5, anchor="center")
        clip_y = ph - top - vh
        c.saveState()
        path = c.beginPath(); path.rect(left, clip_y, vw, vh); c.clipPath(path, stroke=0, fill=0)
        board_x = left - xoff*mm
        board_y = ph - top - (450-yoff)*mm
        draw_board_pdf(c, board_x, board_y, 1.0, True, True)
        c.restoreState()
        c.setStrokeColor(HexColor("#666666")); c.setLineWidth(.5); c.setDash(3, 2)
        c.rect(left, clip_y, vw, vh, fill=0, stroke=1); c.setDash()
        for xx in (left, left+vw):
            for yy in (clip_y, clip_y+vh): alignment_cross(c, xx, yy)
        pdf_text(c, left, 24*mm, f"列 {col+1}/3｜行 {row+1}/2｜灰虚线为裁切/对齐边", 7.5)
        pdf_text(c, pw-left, 24*mm, "实际尺寸 100%｜勿适合页面", 7.5, RED, "right")
        draw_calibration_pdf(c, 55*mm, 13*mm, 100, True)
        c.showPage()
    c.save()


def page_ruler_svg() -> str:
    return calibration_svg(55, 286, 100)


def stone_sheet_svg(color: str, count: int, page_label: str) -> str:
    fill = "#111111" if color == "B" else "#FFFFFF"
    stroke = "#111111"
    parts = [f'<rect width="210" height="297" fill="#FFFFFF"/>',
             svg_text(105, 12, f"{page_label}｜38 mm 棋子｜实际尺寸 100%", "label", "middle"),
             svg_text(105, 19, "实线为成品边，灰虚线为裁切辅助；背面标 B/W", "small", "middle")]
    for idx in range(count):
        col, row = idx % 5, idx // 5
        cx, cy = 25 + col*40, 45 + row*40
        parts.append(f'<circle class="stone {color}" data-piece-index="{idx+1}" cx="{cx}" cy="{cy}" r="19" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')
        parts.append(f'<circle class="cut-line" cx="{cx}" cy="{cy}" r="19.5"/>')
        if color == "B":
            parts.append(f'<circle cx="{cx-5}" cy="{cy-6}" r="2" fill="#3C3C3C" opacity=".65"/>')
    parts += [svg_text(10, 278, f"本页 {count} 枚｜磁背建议 34–36 mm", "small"), page_ruler_svg()]
    return svg_doc(210, 297, "\n".join(parts), page_label, f"A4 1:1 {count}枚{color}棋切割排版")


def marker_liberty_svg() -> str:
    parts = ['<rect width="210" height="297" fill="#FFFFFF"/>',
             svg_text(105, 12, "气环 24 枚｜外径 30 / 内径 16 mm｜100%", "label", "middle"),
             svg_text(105, 19, "双虚线空心环；中央必须透明或镂空以露出交叉点", "small", "middle")]
    for i in range(24):
        col, row = i % 4, i // 4
        cx, cy = 30 + col*50, 45 + row*38
        parts.append(f'<g class="liberty-ring" data-marker-index="{i+1}"><circle cx="{cx}" cy="{cy}" r="15" fill="none" stroke="{BLUE}" stroke-width="3" stroke-dasharray="7 4"/><circle cx="{cx}" cy="{cy}" r="8" fill="none" stroke="{INK}" stroke-width="0.8" stroke-dasharray="2 2"/><path d="M {cx-4} {cy} H {cx+4} M {cx} {cy-4} V {cx} {cy+4}" stroke="#777" stroke-width=".5"/></g>')
    parts += [svg_text(10, 278, "灰度识别：双虚线环；不要用实心圆代替", "small"), page_ruler_svg()]
    return svg_doc(210, 297, "\n".join(parts), "气环排版", "A4 1:1 气环24枚")


def triangle_points(cx: float, cy: float, r: float) -> str:
    return " ".join(f"{cx + r*math.cos(math.radians(a)):.2f},{cy + r*math.sin(math.radians(a)):.2f}" for a in (-90, 30, 150))


def marker_other_svg() -> str:
    parts = ['<rect width="210" height="297" fill="#FFFFFF"/>',
             svg_text(105, 12, "目标、顺序与最后一手｜实际尺寸 100%", "label", "middle"),
             svg_text(105, 19, "三角=目标｜带圆数字=顺序｜方框斜十字=最后一手", "small", "middle")]
    for i in range(12):
        col, row = i % 6, i // 6
        cx, cy = 20 + col*34, 42 + row*32
        parts.append(f'<polygon class="target-triangle" data-marker-index="{i+1}" points="{triangle_points(cx,cy,12)}" fill="none" stroke="{GREEN}" stroke-width="3"/>')
        parts.append(f'<circle class="cut-line" cx="{cx}" cy="{cy}" r="14"/>')
    for i in range(20):
        col, row = i % 5, i // 5
        cx, cy = 25 + col*40, 116 + row*27
        parts.append(f'<g class="sequence-number" data-number="{i+1}"><circle cx="{cx}" cy="{cy}" r="10" fill="#FFFFFF" stroke="{INK}" stroke-width="1.4"/><text x="{cx}" y="{cy+2.5}" font-size="7" font-weight="700" text-anchor="middle">{i+1}</text></g>')
    for i in range(6):
        cx, cy = 25 + i*32, 236
        parts.append(f'<g class="last-move" data-marker-index="{i+1}"><rect x="{cx-9}" y="{cy-9}" width="18" height="18" rx="2" fill="#FFFFFF" stroke="{RED}" stroke-width="1.5"/><path d="M {cx-6} {cy-6} L {cx+6} {cy+6} M {cx+6} {cy-6} L {cx-6} {cy+6}" stroke="{INK}" stroke-width="3" stroke-linecap="round"/></g>')
    parts += [svg_text(10, 272, "所有标记轮廓均不同，灰度不依赖颜色", "small"), page_ruler_svg()]
    return svg_doc(210, 297, "\n".join(parts), "目标、顺序和最后一手排版", "A4 1:1 标记排版")


def write_editable_sheets() -> None:
    sheets = {
        "black-stones-01.svg": stone_sheet_svg("B", 30, "黑棋 1/2"),
        "black-stones-02.svg": stone_sheet_svg("B", 15, "黑棋 2/2"),
        "white-stones-01.svg": stone_sheet_svg("W", 30, "白棋 1/2"),
        "white-stones-02.svg": stone_sheet_svg("W", 15, "白棋 2/2"),
        "liberty-rings.svg": marker_liberty_svg(),
        "targets-sequence-last.svg": marker_other_svg(),
    }
    for name, content in sheets.items():
        (EDITABLE / name).write_text(content, encoding="utf-8")


def draw_stone(c, cx, cy, color):
    c.setFillColor(HexColor("#111111") if color == "B" else white)
    c.setStrokeColor(HexColor("#111111")); c.setLineWidth(1.2)
    c.circle(cx, cy, 19*mm, fill=1, stroke=1)
    c.setStrokeColor(HexColor("#777777")); c.setLineWidth(.35); c.setDash(2, 2)
    c.circle(cx, cy, 19.5*mm, fill=0, stroke=1); c.setDash()


def pieces_pdf() -> None:
    c = canvas.Canvas(str(ROOT / "pieces-markers-a4.pdf"), pagesize=A4, pageCompression=1)
    pw, ph = A4
    pages = [("B",30,"黑棋 1/2"),("B",15,"黑棋 2/2"),("W",30,"白棋 1/2"),("W",15,"白棋 2/2")]
    for color, count, title in pages:
        pdf_text(c, pw/2, ph-12*mm, f"{title}｜38 mm｜实际尺寸 100%", 12, GREEN, "center")
        pdf_text(c, pw/2, ph-19*mm, "实线成品边；灰虚线裁切辅助；背面标 B/W", 8, anchor="center")
        for i in range(count):
            col,row=i%5,i//5; cx=(25+col*40)*mm; cy=ph-(45+row*40)*mm
            draw_stone(c,cx,cy,color)
        pdf_text(c,10*mm,19*mm,f"本页 {count} 枚｜磁背建议 34–36 mm",8)
        draw_calibration_pdf(c,55*mm,11*mm,100,True); c.showPage()
    pdf_text(c,pw/2,ph-12*mm,"气环 24 枚｜外径 30 / 内径 16 mm｜100%",12,GREEN,"center")
    pdf_text(c,pw/2,ph-19*mm,"双虚线空心环；中央必须透明或镂空",8,anchor="center")
    for i in range(24):
        col,row=i%4,i//4; cx=(30+col*50)*mm; cy=ph-(45+row*38)*mm
        c.setStrokeColor(HexColor(BLUE)); c.setLineWidth(3); c.setDash(7,4); c.circle(cx,cy,15*mm,fill=0,stroke=1)
        c.setStrokeColor(HexColor(INK)); c.setLineWidth(.8); c.setDash(2,2); c.circle(cx,cy,8*mm,fill=0,stroke=1); c.setDash()
        c.setStrokeColor(HexColor("#777777")); c.setLineWidth(.5); c.line(cx-4*mm,cy,cx+4*mm,cy); c.line(cx,cy-4*mm,cx,cy+4*mm)
    pdf_text(c,10*mm,19*mm,"灰度识别：双虚线环；不要用实心圆代替",8)
    draw_calibration_pdf(c,55*mm,11*mm,100,True); c.showPage()
    pdf_text(c,pw/2,ph-12*mm,"目标、顺序与最后一手｜实际尺寸 100%",12,GREEN,"center")
    pdf_text(c,pw/2,ph-19*mm,"三角=目标｜带圆数字=顺序｜方框斜十字=最后一手",8,anchor="center")
    for i in range(12):
        col,row=i%6,i//6; cx=(20+col*34)*mm; cy=ph-(42+row*32)*mm
        pts=[(cx+12*mm*math.cos(math.radians(a)),cy-12*mm*math.sin(math.radians(a))) for a in (-90,30,150)]
        p=c.beginPath(); p.moveTo(*pts[0]); p.lineTo(*pts[1]); p.lineTo(*pts[2]); p.close()
        c.setStrokeColor(HexColor(GREEN)); c.setLineWidth(3); c.drawPath(p,fill=0,stroke=1)
    for i in range(20):
        col,row=i%5,i//5; cx=(25+col*40)*mm; cy=ph-(116+row*27)*mm
        c.setFillColor(white); c.setStrokeColor(HexColor(INK)); c.setLineWidth(1.4); c.circle(cx,cy,10*mm,fill=1,stroke=1)
        pdf_text(c,cx,cy-2.5*mm,str(i+1),15,anchor="center")
    for i in range(6):
        cx=(25+i*32)*mm; cy=ph-236*mm
        c.setFillColor(white); c.setStrokeColor(HexColor(RED)); c.setLineWidth(1.5); c.roundRect(cx-9*mm,cy-9*mm,18*mm,18*mm,2*mm,fill=1,stroke=1)
        c.setStrokeColor(HexColor(INK)); c.setLineWidth(3); c.line(cx-6*mm,cy-6*mm,cx+6*mm,cy+6*mm); c.line(cx+6*mm,cy-6*mm,cx-6*mm,cy+6*mm)
    pdf_text(c,10*mm,25*mm,"所有标记轮廓均不同，灰度不依赖颜色",8)
    draw_calibration_pdf(c,55*mm,11*mm,100,True); c.showPage(); c.save()


def mini_board_svg(x, y, size, stones, liberties, label, count):
    gap=size/8; parts=[f'<g transform="translate({x} {y})">',f'<rect width="{size}" height="{size}" fill="{BOARD_BG}" stroke="{INK}" stroke-width=".8"/>']
    for i in range(9):
        p=i*gap; parts.append(f'<line x1="0" y1="{p}" x2="{size}" y2="{p}" stroke="{LINE}" stroke-width=".45"/><line x1="{p}" y1="0" x2="{p}" y2="{size}" stroke="{LINE}" stroke-width=".45"/>')
    for row,col in stones:
        parts.append(f'<circle cx="{col*gap}" cy="{row*gap}" r="{gap*.38}" fill="#111" stroke="#111"/>')
    for row,col in liberties:
        parts.append(f'<circle cx="{col*gap}" cy="{row*gap}" r="{gap*.30}" fill="white" fill-opacity=".68" stroke="{BLUE}" stroke-width="1.4" stroke-dasharray="3 2"/>')
    parts.append('</g>'); parts.append(svg_text(x+size/2,y+size+8,label,"label","middle")); parts.append(svg_text(x+size/2,y+size+15,f"去重气数：{count}","note","middle"))
    return "\n".join(parts)


def teaching_svg() -> None:
    parts=['<rect width="420" height="297" fill="#FFFFFF"/>',svg_text(210,15,"两组可操作摆棋流程｜GO-CLUB-AREA-1","label","middle"),svg_text(210,23,"坐标 row,col 从左上 0 开始；以下均为摆棋模式，不代表合法棋谱","note","middle")]
    examples=[
        (20,40,70,[(4,4)],[(3,4),(4,3),(4,5),(5,4)],"中心 E5 (4,4)",4),
        (120,40,70,[(0,4)],[(0,3),(0,5),(1,4)],"上边 E9 (0,4)",3),
        (220,40,70,[(0,0)],[(0,1),(1,0)],"左上角 A9 (0,0)",2),
        (320,40,70,[(4,3),(4,4),(5,3)],[(3,3),(4,2),(3,4),(4,5),(5,4),(5,2),(6,3)],"L形 D5/E5/D4",7)
    ]
    for e in examples: parts.append(mini_board_svg(*e))
    parts += [svg_text(20,142,"流程 A｜中心、边、角", "label"),
              svg_text(20,152,"① E5 放黑棋；成员用气环圈 E6/D5/F5/E4 → 4 气。", "note"),
              svg_text(20,161,"② 清空后移到 E9；圈 D9/F9/E8 → 3 气；板外不算。", "note"),
              svg_text(20,170,"③ 清空后移到 A9；圈 B9/A8 → 2 气。", "note"),
              svg_text(20,179,"④ 成员把数字 4/3/2 放到三个标题旁，说出差异来自边界。", "note"),
              svg_text(220,142,"流程 B｜L 形连通块与共享气去重", "label"),
              svg_text(220,152,"① 放 D5、E5、D4；目标三角指出同一正交连通块。", "note"),
              svg_text(220,161,"② 在 D6/C5/E6/F5/E4/C4/D3 放 7 个气环。", "note"),
              svg_text(220,170,"③ E4 同时邻接 E5 和 D4；重复放第二个环后立即移走。", "note"),
              svg_text(220,179,"④ 8 个相邻空位槽中 E4 重复一次；去重集合为 7 气。", "note"),
              f'<rect x="20" y="200" width="380" height="70" rx="4" fill="{PALE}" stroke="#CED8D1"/>',
              svg_text(30,214,"教师语言模板", "label"),
              svg_text(30,225,"“气只沿棋盘线找；斜角不算。数整块时，同一个空交叉点只报一次。”", "note"),
              svg_text(30,238,"成员动作：每找到一个不同空点就放一个双虚线气环；重复点必须拿掉重复环。", "note"),
              svg_text(30,251,"预期观察：单子中心/边/角为 4/3/2；L 形三子块为 7 个不同气点。", "note"),
              svg_text(30,263,"证据边界：这是准确坐标生成的教学示例；未填人类教师审核或学生成效。", "note")]
    out=svg_doc(420,297,"\n".join(parts),"T18 两组摆棋流程","中心边角与共享气去重的A3可编辑矢量教学页")
    (ROOT/"teaching-flows-a3.svg").write_text(out,encoding="utf-8")


def draw_mini_board_pdf(c,x,y,size,stones,liberties,label,count):
    c.setFillColor(HexColor(BOARD_BG)); c.setStrokeColor(HexColor(INK)); c.rect(x,y,size,size,fill=1,stroke=1); gap=size/8
    c.setLineWidth(.45)
    for i in range(9):
        p=i*gap; c.line(x,y+p,x+size,y+p); c.line(x+p,y,x+p,y+size)
    for row,col in stones:
        c.setFillColor(HexColor("#111111")); c.circle(x+col*gap,y+(8-row)*gap,gap*.38,fill=1,stroke=0)
    for row,col in liberties:
        c.setFillColor(Color(1,1,1,alpha=.8)); c.setStrokeColor(HexColor(BLUE)); c.setDash(3,2); c.setLineWidth(1.4); c.circle(x+col*gap,y+(8-row)*gap,gap*.30,fill=1,stroke=1); c.setDash()
    pdf_text(c,x+size/2,y-5*mm,label,8,anchor="center"); pdf_text(c,x+size/2,y-10*mm,f"去重气数：{count}",7,anchor="center")


def teaching_pdf() -> None:
    pw,ph=A3[1],A3[0]  # landscape
    c=canvas.Canvas(str(ROOT/"teaching-flows-a3.pdf"),pagesize=(pw,ph),pageCompression=1)
    pdf_text(c,pw/2,ph-15*mm,"两组可操作摆棋流程｜GO-CLUB-AREA-1",18,GREEN,"center")
    pdf_text(c,pw/2,ph-24*mm,"row,col 从左上 0 开始；以下均为摆棋模式，不代表合法棋谱",9,anchor="center")
    data=[
        (20,[(4,4)],[(3,4),(4,3),(4,5),(5,4)],"中心 E5 (4,4)",4),
        (120,[(0,4)],[(0,3),(0,5),(1,4)],"上边 E9 (0,4)",3),
        (220,[(0,0)],[(0,1),(1,0)],"左上角 A9 (0,0)",2),
        (320,[(4,3),(4,4),(5,3)],[(3,3),(4,2),(3,4),(4,5),(5,4),(5,2),(6,3)],"L形 D5/E5/D4",7)]
    for x,stones,libs,label,count in data: draw_mini_board_pdf(c,x*mm,ph-112*mm,70*mm,stones,libs,label,count)
    pdf_text(c,20*mm,ph-145*mm,"流程 A｜中心、边、角",12,GREEN)
    lines=["① E5 放黑棋；圈 E6/D5/F5/E4 → 4 气。","② 清空后移到 E9；圈 D9/F9/E8 → 3 气；板外不算。","③ 清空后移到 A9；圈 B9/A8 → 2 气。","④ 放数字 4/3/2，说出差异来自棋盘边界。"]
    for i,t in enumerate(lines): pdf_text(c,20*mm,ph-(157+i*10)*mm,t,9)
    pdf_text(c,220*mm,ph-145*mm,"流程 B｜L 形与共享气去重",12,GREEN)
    lines=["① 放 D5/E5/D4；三子为同一正交连通块。","② 圈 D6/C5/E6/F5/E4/C4/D3。","③ E4 同时邻接两子；第二个重复环必须移走。","④ 8 个相邻空位槽去重后是 7 个气点。"]
    for i,t in enumerate(lines): pdf_text(c,220*mm,ph-(157+i*10)*mm,t,9)
    c.setFillColor(HexColor(PALE)); c.setStrokeColor(HexColor("#CED8D1")); c.roundRect(20*mm,20*mm,380*mm,52*mm,4*mm,fill=1,stroke=1)
    pdf_text(c,30*mm,60*mm,"教师语言：“气只沿棋盘线找；斜角不算。数整块时，同一个空交叉点只报一次。”",10)
    pdf_text(c,30*mm,48*mm,"成员动作：每找到一个不同空点就放一个双虚线气环；重复点必须拿掉重复环。",10)
    pdf_text(c,30*mm,36*mm,"预期观察：中心/边/角为 4/3/2；L 形三子块为 7 气。未填人类审核或学生成效。",10)
    c.showPage();c.save()


def wrap_lines(text: str, width: float, size: float) -> list[str]:
    lines=[]
    for para in text.split("\n"):
        if not para: lines.append(""); continue
        current=""
        for ch in para:
            test=current+ch
            if pdfmetrics.stringWidth(test,FONT,size)<=width or not current: current=test
            else: lines.append(current); current=ch
        if current: lines.append(current)
    return lines


def wrapped(c,x,y,width,text,size=9,leading=14,color=INK,max_lines=None):
    lines=wrap_lines(text,width,size)
    if max_lines: lines=lines[:max_lines]
    for line in lines:
        pdf_text(c,x,y,line,size,color); y-=leading
    return y


def guide_page(c,page,title,subtitle=None):
    pw,ph=A4
    c.setFillColor(HexColor(GREEN)); c.rect(0,ph-25*mm,pw,25*mm,fill=1,stroke=0)
    pdf_text(c,15*mm,ph-16*mm,title,17,white)
    if subtitle: pdf_text(c,15*mm,ph-22*mm,subtitle,7.5,white)
    pdf_text(c,pw-15*mm,10*mm,f"T18｜{page}/8｜0.2.0+t18.1",7,"#5A655F","right")
    return ph-35*mm


def info_box(c,x,y,w,h,title,body,accent=GREEN):
    c.setFillColor(HexColor(PALE)); c.setStrokeColor(HexColor("#CBD5CE")); c.roundRect(x,y-h,w,h,3*mm,fill=1,stroke=1)
    pdf_text(c,x+5*mm,y-8*mm,title,11,accent)
    wrapped(c,x+5*mm,y-15*mm,w-10*mm,body,8.5,12)


def assembly_pdf() -> None:
    path=ROOT/"assembly-guide.pdf"; c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1); pw,ph=A4
    c.setTitle("T18 9x9 demo board assembly and teaching guide")
    # 1
    y=guide_page(c,1,"9×9 演示教具：装配与摆棋指南","可制作设计｜不代表已制造、采购或使用")
    pdf_text(c,15*mm,y,"交付内容",13,GREEN); y-=9*mm
    items=["450 × 450 mm 完整 9×9 盘；45 mm 网格；38 mm 棋子。","黑/白棋各 45；气环 24；三角 12；数字 1–20；最后一手 6。","整张 1:1 PDF、A4 六页拼接版、可编辑 SVG 与精确坐标数据。","磁性与无磁低成本两种制作路径；实体性能留待样品验证。"]
    for t in items: y=wrapped(c,20*mm,y,pw-40*mm,"• "+t,10,16); y-=2*mm
    info_box(c,15*mm,y,pw-30*mm,45*mm,"证据边界","文件几何与渲染由自动检查和逐页目视检查验证。磁吸强度、耐用性、反光、残胶、承重与教室后排可读性仍需真实样品和真实观察记录。",RED)
    y-=55*mm
    info_box(c,15*mm,y,pw-30*mm,42*mm,"规则边界","摆棋示例只演示正交连接与气的去重集合，属于 setup，不冒充合法棋谱。项目规则固定为 GO-CLUB-AREA-1；外部资料的计分、贴目和重复规则未混入。")
    c.showPage()
    # 2 geometry
    y=guide_page(c,2,"尺寸与标记图例","几何全部以 mm 参数生成")
    pdf_text(c,15*mm,y,"9×9 几何",13,GREEN); y-=8*mm
    y=wrapped(c,15*mm,y,pw-30*mm,"9×9 是九条横线和九条竖线，共 81 个交叉点。网格跨度=(9−1)×45=360 mm；总边长=45+360+45=450 mm。网格从 (45,45) 到 (405,405) mm。",10,16)
    draw_mini_board_pdf(c,25*mm,y-82*mm,72*mm,[],[],"比例示意（非 1:1）",81)
    info_box(c,110*mm,y,85*mm,75*mm,"相邻棋子","棋子直径 38 mm，小于 45 mm 线距；理论净间距 7 mm。实际裁切公差与磁背偏心仍要用样品检查。")
    y-=100*mm
    pdf_text(c,15*mm,y,"标记必须靠形状区分",13,GREEN); y-=12*mm
    # legend icons
    xs=[30,75,120,165]
    c.setStrokeColor(HexColor(BLUE)); c.setLineWidth(3); c.setDash(7,4); c.circle(xs[0]*mm,y,15*mm,fill=0,stroke=1); c.setDash(); pdf_text(c,xs[0]*mm,y-23*mm,"气环 30/16",8,anchor="center")
    pts=[((xs[1]+12*math.cos(math.radians(a)))*mm,y+12*mm*math.sin(math.radians(a))) for a in (-90,30,150)]; p=c.beginPath();p.moveTo(*pts[0]);p.lineTo(*pts[1]);p.lineTo(*pts[2]);p.close();c.setStrokeColor(HexColor(GREEN));c.setLineWidth(3);c.drawPath(p,fill=0,stroke=1);pdf_text(c,xs[1]*mm,y-23*mm,"目标三角 24",8,anchor="center")
    c.setFillColor(white);c.setStrokeColor(HexColor(INK));c.circle(xs[2]*mm,y,10*mm,fill=1,stroke=1);pdf_text(c,xs[2]*mm,y-2.5*mm,"12",14,anchor="center");pdf_text(c,xs[2]*mm,y-23*mm,"顺序 20",8,anchor="center")
    c.setStrokeColor(HexColor(RED));c.rect((xs[3]-9)*mm,y-9*mm,18*mm,18*mm,fill=0,stroke=1);c.setStrokeColor(HexColor(INK));c.setLineWidth(3);c.line((xs[3]-6)*mm,y-6*mm,(xs[3]+6)*mm,y+6*mm);c.line((xs[3]+6)*mm,y-6*mm,(xs[3]-6)*mm,y+6*mm);pdf_text(c,xs[3]*mm,y-23*mm,"最后一手 18",8,anchor="center")
    c.showPage()
    # 3 materials
    y=guide_page(c,3,"材料清单","未知价格不写作实时报价")
    info_box(c,15*mm,y,pw-30*mm,78*mm,"A｜磁性版本","含铁底板 450×450 mm；哑面棋盘面与保护膜；38 mm 黑/白棋面各 45；34–36 mm、0.5–0.8 mm 柔性磁片；气环 24、三角 12、数字 1–20、最后一手 6；包边约 2 m；按成品重量选择支架。优先柔性磁片，避免易脱落的小型强磁铁。")
    y-=90*mm
    info_box(c,15*mm,y,pw-30*mm,78*mm,"B｜无磁低成本版本","450×450 mm 硬背板；A4 拼接页六张；透明哑面保护膜；200–250 g/m² 卡纸棋子与标记；少量可移胶、可重复黏土或静电贴材料；分类拉链袋与隔页纸。先做残胶/滑移小样。")
    y-=90*mm
    info_box(c,15*mm,y,pw-30*mm,40*mm,"安全提示","金属板必须去毛刺和包边；未验证承重前不要悬挂于人员上方；磁片远离磁条卡、精密仪器和对磁场敏感物品。",RED)
    c.showPage()
    # 4 magnetic assembly diagram
    y=guide_page(c,4,"磁性版本装配","先做一枚样品，再批量")
    layers=[("哑面保护膜",HexColor("#E9F5F3")),("打印棋盘面",HexColor(BOARD_BG)),("含铁薄板",HexColor("#B7BDC1")),("3–5 mm 硬质背板",HexColor("#E7E1D7"))]
    for i,(name,color) in enumerate(layers):
        yy=y-i*27*mm; c.setFillColor(color);c.setStrokeColor(HexColor(INK));c.roundRect(25*mm,yy-17*mm,110*mm,16*mm,2*mm,fill=1,stroke=1);pdf_text(c,80*mm,yy-11*mm,name,10,anchor="center")
        if i<3: pdf_text(c,142*mm,yy-10*mm,"↓ 对齐 / 压实",8,RED)
    y-=118*mm
    steps=["1 去毛刺、包边、背板加固；画水平/垂直中心线。","2 量 100 mm 标尺；棋盘中心对中心，从中部向外刮贴。","3 裁 38 mm 棋面；背贴 34–36 mm 柔性磁片。","4 标记用透明片；磁条贴外缘，不遮气环中心。","5 直立轻推/轻振，记录滑移、掉落、取放和反光。"]
    for i,t in enumerate(steps):
        c.setFillColor(HexColor(GREEN));c.circle(23*mm,y+2*mm,5*mm,fill=1,stroke=0);pdf_text(c,23*mm,y-.5*mm,str(i+1),9,white,"center"); y=wrapped(c,33*mm,y,pw-48*mm,t,9,14); y-=5*mm
    c.showPage()
    # 5 budget, print, storage
    y=guide_page(c,5,"A4 拼接、收纳与修补","打印必须 100% 实际尺寸")
    info_box(c,15*mm,y,pw-30*mm,60*mm,"A4 六页拼接","关闭“适合页面/缩放到可打印区域”。逐页量 100 mm 标尺；建议误差不超过 1 mm。上排 1–3、下排 4–6；横向重叠 15 mm，纵向重叠 20 mm。沿灰色边界裁切/对齐，不沿网格线或星位切。")
    y-=72*mm
    pdf_text(c,15*mm,y,"页序示意",12,GREEN);y-=8*mm
    for r in range(2):
        for col in range(3):
            xx=(30+col*55)*mm; yy=y-r*45*mm
            c.setFillColor(HexColor(PALE));c.setStrokeColor(HexColor(INK));c.rect(xx,yy-35*mm,48*mm,35*mm,fill=1,stroke=1);pdf_text(c,xx+24*mm,yy-20*mm,str(r*3+col+1),18,GREEN,"center")
    y-=105*mm
    info_box(c,15*mm,y,85*mm,53*mm,"分类收纳","黑 45、白 45、气环 24、三角 12、数字 1–20、最后一手 6、修补件分袋；袋面写应有数量。棋子间放隔页纸。")
    info_box(c,110*mm,y,85*mm,53*mm,"修补","翘边先清洁再换胶；破损单枚按 100% 重印；接缝从背面加固；避免在旧胶上持续叠加。")
    c.showPage()
    # 6 flow A
    y=guide_page(c,6,"摆棋流程 A｜中心、边、角","setup 模式；每个位置先清空")
    mini=[(20,[(4,4)],[(3,4),(4,3),(4,5),(5,4)],"E5 中心",4),(80,[(0,4)],[(0,3),(0,5),(1,4)],"E9 上边",3),(140,[(0,0)],[(0,1),(1,0)],"A9 左上角",2)]
    for x,stones,libs,label,count in mini:draw_mini_board_pdf(c,x*mm,y-48*mm,45*mm,stones,libs,label,count)
    y-=75*mm
    rows=[("1","“E5。气只看沿线相邻空点。”","黑棋到 E5；气环到 E6/D5/F5/E4。","4 个不同空点。"),("2","“E9。棋盘外不是交叉点。”","清空；黑棋到 E9；环到 D9/F9/E8。","边上 3 气。"),("3","“A9。数真实相邻线。”","清空；黑棋到 A9；环到 B9/A8。","角上 2 气。"),("4","“把答案排成 4、3、2。”","数字 4/3/2 放到标题旁。","差异来自边界。")]
    headings=[("步",15),("教师说",28),("成员移动",84),("预期观察",150)]
    for h,x in headings:pdf_text(c,x*mm,y,h,9,GREEN)
    y-=8*mm
    for step,say,move,obs in rows:
        pdf_text(c,17*mm,y,step,9);wrapped(c,28*mm,y,52*mm,say,8,11);wrapped(c,84*mm,y,62*mm,move,8,11);wrapped(c,150*mm,y,45*mm,obs,8,11);y-=33*mm
    c.showPage()
    # 7 flow B
    y=guide_page(c,7,"摆棋流程 B｜共享气去重","D5、E5、D4 为同一正交连通块")
    draw_mini_board_pdf(c,20*mm,y-70*mm,65*mm,[(4,3),(4,4),(5,3)],[(3,3),(4,2),(3,4),(4,5),(5,4),(5,2),(6,3)],"L 形三子",7)
    info_box(c,100*mm,y,95*mm,72*mm,"准确集合","气点：D6、C5、E6、F5、E4、C4、D3。E4 同时邻接 E5 与 D4，但仍是一个交叉点。相邻空位槽 8 次，E4 重复 1 次，去重后 7 气。")
    y-=95*mm
    steps=[("1","“三枚棋沿线连着，数整块。”","依次放 D5、E5、D4；三角指出整块。","确认正交连接。"),("2","“圈出所有相邻空点。”","七个气点各放一环。","看见 7 个不同点。"),("3","“E4 挨着两子，但只有一个点。”","尝试叠第二个环，再拿走重复环。","共享气只算一次。"),("4","“按环报坐标，不按棋子相加。”","数字 1–7 逐个覆盖七个环。","集合计数为 7。")]
    for step,say,move,obs in steps:
        c.setFillColor(HexColor(GREEN));c.circle(20*mm,y+1*mm,5*mm,fill=1,stroke=0);pdf_text(c,20*mm,y-1.5*mm,step,9,white,"center")
        y=wrapped(c,31*mm,y,pw-46*mm,"教师："+say+"　成员："+move+"　观察："+obs,8.5,13);y-=8*mm
    c.showPage()
    # 8 QA
    y=guide_page(c,8,"打印与实体试用记录","自动几何通过 ≠ 实物通过")
    pdf_text(c,15*mm,y,"文件层面可验证",12,GREEN);y-=8*mm
    y=wrapped(c,20*mm,y,pw-40*mm,"• 9 横 + 9 竖；81 交叉点；角点完整。\n• 45 mm 线距、38 mm 棋子、7 mm 理论间隙。\n• 100 mm 标尺在文件坐标中为 100 mm。\n• A4 六页窗口连续覆盖 450×450 mm，重叠带不缺线。\n• 彩色/灰度渲染逐页无裁切；标记依靠轮廓可区分。",9,15)
    y-=8*mm;pdf_text(c,15*mm,y,"必须用真实样品填写",12,RED);y-=8*mm
    y=wrapped(c,20*mm,y,pw-40*mm,"日期、样品编号、版本、打印尺实测值、直立磁吸/滑落、反复取放次数、后排距离、棋子与四类标记可读性、反光/残胶、观察者角色、改进动作。空白表见 trial-record.csv；本包不预填任何测试结果。",9,15)
    y-=8*mm;pdf_text(c,15*mm,y,"来源与边界",12,GREEN);y-=8*mm
    y=wrapped(c,20*mm,y,pw-40*mm,"British Go Association 的新手教学页与 How to Play 用于核查演示盘/9×9 教学建议和中心/边/角 4/3/2 气的一般概念；访问 2026-09-06。AGA 解释页只提醒规则体系可能不同。项目计分、贴目、停手与位置超级劫均以 GO-CLUB-AREA-1 为准。",9,15)
    y-=8*mm;info_box(c,15*mm,y,pw-30*mm,40*mm,"使用目的","这套教具提供可操作的围棋思考练习与交流媒介；不证明提高智商、治疗压力或提升学业，也没有虚构学生反馈、出勤、照片、CAS 工时或实施效果。")
    c.showPage();c.save()


def assembly_diagram_svg() -> None:
    parts=['<rect width="210" height="297" fill="#FFFFFF"/>',svg_text(105,15,"磁性演示盘分层与收纳示意","label","middle")]
    layers=[("哑面保护膜","#E9F5F3"),("1:1 打印棋盘面",BOARD_BG),("含铁薄板 0.4–0.6 mm","#B7BDC1"),("硬质背板 3–5 mm","#E7E1D7")]
    for i,(name,color) in enumerate(layers):
        x=25+i*7;y=45+i*24;parts.append(f'<rect x="{x}" y="{y}" width="120" height="18" rx="2" fill="{color}" stroke="{INK}"/><text x="{x+60}" y="{y+12}" font-size="5" text-anchor="middle">{escape(name)}</text>')
        if i<3:parts.append(svg_text(160,y+12,"↓ 对齐并压实","small"))
    parts += [svg_text(20,155,"棋子截面", "label"),f'<circle cx="45" cy="185" r="19" fill="#111"/><rect x="29" y="207" width="32" height="4" rx="1" fill="#666"/>'+svg_text(75,184,"38 mm 棋面","note")+svg_text(75,210,"34–36 mm 柔性磁背","note"),svg_text(20,240,"收纳袋：黑｜白｜气环｜三角｜数字｜最后一手｜修补件","note"),svg_text(20,252,"先做各 1 枚样品；磁吸、耐用、反光、后排可读性待实测。","note"),page_ruler_svg()]
    (ROOT/"assembly-diagrams-a4.svg").write_text(svg_doc(210,297,"\n".join(parts),"装配分层示意","磁性棋盘、棋子磁背和收纳的可编辑A4图示"),encoding="utf-8")


def main() -> None:
    generate_board_svg()
    generate_board_pdf()
    generate_tiled_pdf()
    write_editable_sheets()
    pieces_pdf()
    teaching_svg()
    teaching_pdf()
    assembly_diagram_svg()
    assembly_pdf()
    print("Generated T18 SVG/PDF assets in", ROOT)


if __name__ == "__main__":
    main()

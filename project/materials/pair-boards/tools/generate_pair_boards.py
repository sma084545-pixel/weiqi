#!/usr/bin/env python3
"""Generate the editable SVG and print-ready PDF artifacts for T19.

All geometry is expressed in millimetres from the top-left corner.  The SVG and
PDF renderers consume the same drawing model so the editable and distribution
copies stay dimensionally aligned.
"""

from __future__ import annotations

import argparse
import html
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from pypdf import PdfReader, PdfWriter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor


MM = 72 / 25.4
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output"
BOARDS = OUT / "boards"
KIT = OUT / "portable-kit"
OVERLAYS = OUT / "overlays"
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
FONT_NAME = "ArialUnicode"
RULESET = "GO-CLUB-AREA-1"
SCHEMA_VERSION = 1
REVISION = 1
RESULT_VERSION = "0.2.0-t19.1"
OVERLAY_PATCH_VERSION = "0.2.1-t19.2"


@dataclass(frozen=True)
class BoardSpec:
    key: str
    size: int
    page_w: float
    page_h: float
    page_name: str
    spacing: float
    stone_min: float
    stone_max: float
    grid_x: float
    grid_y: float
    panel_x: float
    panel_y: float
    panel_w: float
    panel_h: float
    info_x: float
    info_y: float
    info_w: float
    info_h: float

    @property
    def grid_extent(self) -> float:
        return self.spacing * (self.size - 1)


SPECS = {
    "9x9-a4": BoardSpec(
        "9x9-a4", 9, 210, 297, "A4 竖向", 20, 16, 18,
        25, 52, 15, 40, 180, 184, 15, 232, 180, 55,
    ),
    "9x9-a3": BoardSpec(
        "9x9-a3", 9, 420, 297, "A3 横向", 28, 24, 26,
        24, 37, 12, 23, 248, 252, 278, 14, 122, 273,
    ),
    "13x13-a3": BoardSpec(
        "13x13-a3", 13, 420, 297, "A3 横向", 20, 16, 18,
        26, 29, 14, 15, 264, 272, 292, 14, 108, 273,
    ),
    "13x13-a4": BoardSpec(
        "13x13-a4", 13, 210, 297, "A4 竖向", 14, 11, 12,
        21, 50, 10, 37, 190, 194, 15, 234, 180, 53,
    ),
}


def esc(value: str) -> str:
    return html.escape(str(value), quote=True)


class SvgSurface:
    def __init__(self, path: Path, width: float, height: float, doc_id: str, metadata: dict):
        self.path = path
        self.w = width
        self.h = height
        self.parts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}mm" height="{height}mm" '
            f'viewBox="0 0 {width} {height}" id="{esc(doc_id)}">',
            f'<metadata>{esc(json.dumps(metadata, ensure_ascii=False, sort_keys=True))}</metadata>',
            '<style>text{font-family:"Arial Unicode MS","PingFang SC","Hiragino Sans GB",sans-serif}'
            '.cut{stroke-dasharray:2 1}.guide{stroke-dasharray:3 2}</style>',
        ]

    def rect(self, x, y, w, h, *, fill="none", stroke="#111111", sw=0.3, radius=0, cls=""):
        self.parts.append(
            f'<rect x="{x:.3f}" y="{y:.3f}" width="{w:.3f}" height="{h:.3f}" '
            f'rx="{radius:.3f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw:.3f}" class="{esc(cls)}"/>'
        )

    def line(self, x1, y1, x2, y2, *, stroke="#111111", sw=0.3, dash=None, cls=""):
        dash_attr = f' stroke-dasharray="{esc(dash)}"' if dash else ""
        self.parts.append(
            f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" '
            f'stroke="{stroke}" stroke-width="{sw:.3f}"{dash_attr} class="{esc(cls)}"/>'
        )

    def circle(self, cx, cy, r, *, fill="none", stroke="#111111", sw=0.3, dash=None, cls=""):
        dash_attr = f' stroke-dasharray="{esc(dash)}"' if dash else ""
        self.parts.append(
            f'<circle cx="{cx:.3f}" cy="{cy:.3f}" r="{r:.3f}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw:.3f}"{dash_attr} class="{esc(cls)}"/>'
        )

    def text(self, x, y, value, *, size=3.5, anchor="start", fill="#111111", weight="normal", cls=""):
        self.parts.append(
            f'<text x="{x:.3f}" y="{y:.3f}" font-size="{size:.3f}mm" text-anchor="{anchor}" '
            f'fill="{fill}" font-weight="{weight}" class="{esc(cls)}">{esc(value)}</text>'
        )

    def finish(self):
        self.parts.append("</svg>")
        self.path.write_text("\n".join(self.parts) + "\n", encoding="utf-8")


class PdfSurface:
    def __init__(self, path: Path, width: float, height: float, title: str, doc_id: str, metadata=None):
        self.path = path
        self.w = width
        self.h = height
        self.c = canvas.Canvas(str(path), pagesize=(width * MM, height * MM), pageCompression=1)
        self.c.setTitle(title)
        self.c.setAuthor("Go Club CAS project - original T19 vector layout")
        self.c.setSubject(
            f"schemaVersion={SCHEMA_VERSION}; id={doc_id}; revision={(metadata or {}).get('revision', REVISION)}; "
            f"rulesetId={RULESET}; resultVersion={(metadata or {}).get('resultVersion', RESULT_VERSION)}"
        )
        self.offset_x = 0.0

    def _x(self, x):
        return (x - self.offset_x) * MM

    def _y(self, y):
        return (self.h - y) * MM

    def rect(self, x, y, w, h, *, fill="none", stroke="#111111", sw=0.3, radius=0, cls=""):
        self.c.saveState()
        self.c.setLineWidth(sw * MM)
        self.c.setStrokeColor(HexColor(stroke))
        self.c.setFillColor(HexColor(fill if fill != "none" else "#FFFFFF"))
        do_fill = 0 if fill == "none" else 1
        if radius:
            self.c.roundRect(self._x(x), self._y(y + h), w * MM, h * MM, radius * MM, stroke=1, fill=do_fill)
        else:
            self.c.rect(self._x(x), self._y(y + h), w * MM, h * MM, stroke=1, fill=do_fill)
        self.c.restoreState()

    def line(self, x1, y1, x2, y2, *, stroke="#111111", sw=0.3, dash=None, cls=""):
        self.c.saveState()
        self.c.setStrokeColor(HexColor(stroke))
        self.c.setLineWidth(sw * MM)
        if dash:
            self.c.setDash(*[float(v) * MM for v in dash.split()])
        self.c.line(self._x(x1), self._y(y1), self._x(x2), self._y(y2))
        self.c.restoreState()

    def circle(self, cx, cy, r, *, fill="none", stroke="#111111", sw=0.3, dash=None, cls=""):
        self.c.saveState()
        self.c.setStrokeColor(HexColor(stroke))
        self.c.setFillColor(HexColor(fill if fill != "none" else "#FFFFFF"))
        self.c.setLineWidth(sw * MM)
        if dash:
            self.c.setDash(*[float(v) * MM for v in dash.split()])
        self.c.circle(self._x(cx), self._y(cy), r * MM, stroke=1, fill=0 if fill == "none" else 1)
        self.c.restoreState()

    def text(self, x, y, value, *, size=3.5, anchor="start", fill="#111111", weight="normal", cls=""):
        self.c.saveState()
        self.c.setFillColor(HexColor(fill))
        self.c.setFont(FONT_NAME, size * MM)
        tx = self._x(x)
        ty = self._y(y)
        if anchor == "middle":
            self.c.drawCentredString(tx, ty, str(value))
        elif anchor == "end":
            self.c.drawRightString(tx, ty, str(value))
        else:
            self.c.drawString(tx, ty, str(value))
        self.c.restoreState()

    def finish(self):
        self.c.save()


def surfaces(base: Path, width: float, height: float, doc_id: str, title: str, metadata: dict):
    return [
        SvgSurface(base.with_suffix(".svg"), width, height, doc_id, metadata),
        PdfSurface(base.with_suffix(".pdf"), width, height, title, doc_id, metadata),
    ]


def meta(doc_id: str, kind: str, **extra):
    return {
        "schemaVersion": SCHEMA_VERSION,
        "id": doc_id,
        "revision": REVISION,
        "rulesetId": RULESET,
        "resultVersion": RESULT_VERSION,
        "kind": kind,
        **extra,
    }


def draw_ruler(s, x: float, y: float, length: float = 100, label: str = "校准尺 100 mm"):
    s.line(x, y, x + length, y, sw=0.45, cls="calibration-ruler")
    for n in range(0, int(length) + 1, 10):
        tick = 3 if n % 50 == 0 else 2
        s.line(x + n, y - tick, x + n, y + tick, sw=0.4, cls="calibration-tick")
        s.text(x + n, y + 6, str(n), size=2.3, anchor="middle", cls="calibration-label")
    s.text(x + length / 2, y - 4, label, size=2.5, anchor="middle", cls="calibration-title")


def wrapped_lines(text: str, max_chars: int) -> list[str]:
    chunks = []
    for paragraph in text.split("\n"):
        while len(paragraph) > max_chars:
            cut = max_chars
            for sep in "；，、 ":
                idx = paragraph.rfind(sep, 0, max_chars + 1)
                if idx > max_chars // 2:
                    cut = idx + 1
                    break
            chunks.append(paragraph[:cut])
            paragraph = paragraph[cut:]
        chunks.append(paragraph)
    return chunks


def draw_text_block(s, x, y, text, *, size=3.2, leading=5.0, max_chars=30, color="#222222", bullet=False):
    for line in wrapped_lines(text, max_chars):
        prefix = "• " if bullet else ""
        s.text(x, y, prefix + line, size=size, fill=color)
        y += leading
    return y


def column_labels(size: int) -> list[str]:
    letters = [c for c in "ABCDEFGHJKLMNOPQRST"]
    return letters[:size]


def star_points(size: int) -> list[tuple[int, int]]:
    if size == 9:
        return [(2, 2), (2, 6), (4, 4), (6, 2), (6, 6)]
    if size == 13:
        return [(3, 3), (3, 9), (6, 6), (9, 3), (9, 9)]
    return []


def draw_board(s, spec: BoardSpec, coordinates: bool):
    variant = "坐标版" if coordinates else "无坐标版"
    s.rect(spec.panel_x, spec.panel_y, spec.panel_w, spec.panel_h,
           fill="#F6D88A", stroke="#7B5A20", sw=0.55, radius=2.5, cls="board-panel")

    extent = spec.grid_extent
    for i in range(spec.size):
        x = spec.grid_x + i * spec.spacing
        y = spec.grid_y + i * spec.spacing
        s.line(x, spec.grid_y, x, spec.grid_y + extent, sw=0.42, cls="grid-line vertical")
        s.line(spec.grid_x, y, spec.grid_x + extent, y, sw=0.42, cls="grid-line horizontal")

    for row, col in star_points(spec.size):
        s.circle(spec.grid_x + col * spec.spacing, spec.grid_y + row * spec.spacing,
                 1.4 if spec.spacing >= 24 else 1.15, fill="#111111", stroke="#111111", sw=0,
                 cls="navigation-dot")

    if coordinates:
        labels = column_labels(spec.size)
        top_y = spec.grid_y - 6
        bottom_y = spec.grid_y + extent + 9
        left_x = spec.grid_x - 8
        right_x = spec.grid_x + extent + 8
        for col, label in enumerate(labels):
            x = spec.grid_x + col * spec.spacing
            s.text(x, top_y, label, size=3.5, anchor="middle", weight="bold", cls="coordinate column top")
            s.text(x, bottom_y, label, size=3.5, anchor="middle", weight="bold", cls="coordinate column bottom")
        for row in range(spec.size):
            y = spec.grid_y + row * spec.spacing + 1.2
            label = str(spec.size - row)
            s.text(left_x, y, label, size=3.5, anchor="middle", weight="bold", cls="coordinate row left")
            s.text(right_x, y, label, size=3.5, anchor="middle", weight="bold", cls="coordinate row right")

    if spec.page_w == 210:
        s.text(105, 14, f"双人练习棋盘 | {spec.size}×{spec.size} {variant}", size=5.0,
               anchor="middle", weight="bold")
        s.text(105, 23, "棋子落在交叉点；黑先。显示坐标从左下 A1 起，列跳过 I。", size=3.1,
               anchor="middle", fill="#333333")
        y = spec.info_y + 5
        s.text(spec.info_x, y, "打印与使用", size=3.8, weight="bold")
        y += 7
        s.text(spec.info_x, y,
               f"{spec.page_name} 210×297 mm | 格距 {spec.spacing:g} mm | 适用棋子直径 {spec.stone_min:g}-{spec.stone_max:g} mm",
               size=2.7)
        y += 5
        s.text(spec.info_x, y, "按 100% / 实际大小打印；关闭“适合页面”。先量校准尺，再使用或覆膜。", size=2.7)
        y += 5
        s.text(spec.info_x, y, f"规则：{RULESET}（项目自定义教学规则） | 版次：{RESULT_VERSION}", size=2.7)
        draw_ruler(s, 55, 278, 100)
    else:
        x = spec.info_x
        y = spec.info_y + 8
        s.text(x, y, f"双人练习棋盘", size=5.5, weight="bold")
        y += 10
        s.text(x, y, f"{spec.size}×{spec.size} | {variant}", size=4.8, weight="bold", fill="#35515A")
        y += 10
        y = draw_text_block(s, x, y, "棋子落在交叉点。黑先。", size=3.2, leading=5.5, max_chars=24)
        if coordinates:
            y = draw_text_block(s, x, y, "显示坐标：列 A-T 跳过 I；行从下往上 1-N。左上角数据坐标为 row=0, col=0。",
                                size=3.0, leading=5.2, max_chars=22)
        else:
            y = draw_text_block(s, x, y, "本页隐藏显示坐标；棋盘方向仍与坐标版相同。需要报点时请配合坐标版。",
                                size=3.0, leading=5.2, max_chars=22)
        y += 3
        s.line(x, y, x + spec.info_w, y, stroke="#7C8B8F", sw=0.3)
        y += 8
        s.text(x, y, "实际尺寸", size=3.8, weight="bold")
        y += 7
        for line in [
            f"纸张：{spec.page_name} {spec.page_w:g}×{spec.page_h:g} mm",
            f"格距：{spec.spacing:g} mm",
            f"适用棋子：直径 {spec.stone_min:g}-{spec.stone_max:g} mm",
            "打印：100% / 实际大小",
            "禁止：适合页面 / 自动缩放",
        ]:
            s.text(x, y, line, size=2.9)
            y += 5.2
        y += 3
        s.text(x, y, "覆膜后可用可擦写笔；", size=3.0)
        y += 5
        s.text(x, y, "请先在边角试擦。", size=3.0)
        y += 8
        s.text(x, y, f"规则：{RULESET}", size=2.6)
        y += 5
        s.text(x, y, f"版次：{RESULT_VERSION}", size=2.6)
        draw_ruler(s, x, 269, 100)


def make_board(spec: BoardSpec, coordinates: bool):
    suffix = "coordinates" if coordinates else "plain"
    doc_id = f"T19-BOARD-{spec.size}X{spec.size}-{spec.page_name.split()[0]}-{suffix.upper()}"
    base = BOARDS / f"go-board_{spec.key}_{suffix}"
    metadata = meta(
        doc_id, "printable-board", boardSize=spec.size, pageMm=[spec.page_w, spec.page_h],
        spacingMm=spec.spacing, stoneDiameterMm=[spec.stone_min, spec.stone_max],
        coordinates=coordinates, printScalePercent=100,
    )
    for s in surfaces(base, spec.page_w, spec.page_h, doc_id,
                      f"T19 {spec.size}x{spec.size} {spec.page_name} {suffix}", metadata):
        draw_board(s, spec, coordinates)
        s.finish()


def draw_local_tiled_marks(s, page_no: int):
    s.text(10, 9, f"A3 原尺寸拼接 | 第 {page_no}/2 页 | A4 210×297 mm | 100% 打印",
           size=2.7, weight="bold")
    seam_x = 200 if page_no == 1 else 10
    s.line(seam_x, 12, seam_x, 284, stroke="#CC3D3D", sw=0.35, dash="2 2", cls="assembly-seam")
    s.text(seam_x + (-2 if page_no == 1 else 2), 286, "20 mm 重叠区中线",
           size=2.3, anchor="end" if page_no == 1 else "start", fill="#8A2020")
    draw_ruler(s, 52, 291, 100, "本页校准尺 100 mm")


def make_tiled_pdf(spec: BoardSpec, coordinates: bool):
    suffix = "coordinates" if coordinates else "plain"
    path = BOARDS / f"go-board_{spec.key}_{suffix}_tiled-A4.pdf"
    doc_id = f"T19-TILED-{spec.size}X{spec.size}-{suffix.upper()}"
    c = canvas.Canvas(str(path), pagesize=(210 * MM, 297 * MM), pageCompression=1)
    c.setTitle(f"T19 {spec.size}x{spec.size} A3 tiled on two A4 sheets")
    c.setAuthor("Go Club CAS project - original T19 vector layout")
    c.setSubject(f"schemaVersion=1; id={doc_id}; revision=1; rulesetId={RULESET}; printScale=100%")
    for page_no, origin in [(1, 0), (2, 190)]:
        surf = PdfSurface.__new__(PdfSurface)
        surf.path = path
        surf.w = 210
        surf.h = 297
        surf.c = c
        surf.offset_x = origin
        draw_board(surf, spec, coordinates)
        surf.offset_x = 0
        draw_local_tiled_marks(surf, page_no)
        c.showPage()
    c.save()


def draw_overlay(s, spec: BoardSpec):
    extent = spec.grid_extent
    # Alignment corners only: no printed liberties, answers, or suggested moves.
    mark = 8
    gx, gy = spec.grid_x, spec.grid_y
    x2, y2 = gx + extent, gy + extent
    for x, y, sx, sy in [(gx, gy, 1, 1), (x2, gy, -1, 1), (gx, y2, 1, -1), (x2, y2, -1, -1)]:
        s.line(x, y, x + sx * mark, y, stroke="#167A76", sw=0.55, cls="overlay-alignment")
        s.line(x, y, x, y + sy * mark, stroke="#167A76", sw=0.55, cls="overlay-alignment")
        s.circle(x, y, 2.5, fill="none", stroke="#167A76", sw=0.35, dash="1.2 1.2", cls="overlay-alignment-ring")

    if spec.page_w == 210:
        s.text(105, 14, "透明覆片 | 先圈气，再落子", size=5.0, anchor="middle", weight="bold", fill="#155B58")
        s.text(105, 23, f"本页不含答案。与 {spec.size}×{spec.size} A4 棋盘四角标记对齐后，用可擦写笔圈出气（liberties）。",
               size=2.8, anchor="middle")
        s.text(15, 240, "顺序：① 选一块棋  ② 圈出全部正交相邻空点  ③ 再讨论并落子  ④ 擦除标记",
               size=3.0)
        s.text(15, 248, "透明片/文件袋必须先试擦；不要把示范答案永久印在正常对弈盘上。", size=2.8)
        s.text(15, 256, f"A4 210×297 mm | 对应格距 {spec.spacing:g} mm | 适用棋子直径 {spec.stone_min:g}-{spec.stone_max:g} mm | 100% 打印",
               size=2.6)
        version = OVERLAY_PATCH_VERSION if spec.key == '13x13-a4' else RESULT_VERSION
        s.text(15, 263, f"规则：{RULESET} | 版次：{version}", size=2.6)
        draw_ruler(s, 55, 278, 100)
    else:
        x = spec.info_x
        s.text(x, 25, "透明覆片", size=5.5, weight="bold", fill="#155B58")
        s.text(x, 36, "先圈气，再落子", size=4.5, weight="bold")
        y = 49
        for line in [
            "本页不含答案。",
            "四角标记与棋盘对齐。",
            "① 选一块棋",
            "② 圈出全部正交相邻空点",
            "③ 再讨论并落子",
            "④ 擦除标记",
            "透明片/文件袋先试擦。",
            "不要在正常棋盘永久印答案。",
        ]:
            s.text(x, y, line, size=3.0)
            y += 7
        y += 5
        s.text(x, y, f"{spec.page_name} {spec.page_w:g}×{spec.page_h:g} mm", size=2.8)
        y += 6
        s.text(x, y, f"格距 {spec.spacing:g} mm | 棋子 {spec.stone_min:g}-{spec.stone_max:g} mm", size=2.8)
        y += 6
        s.text(x, y, "100% / 实际大小打印", size=2.8)
        y += 6
        s.text(x, y, f"规则：{RULESET}", size=2.6)
        draw_ruler(s, x, 269, 100)


def make_overlay(spec: BoardSpec):
    doc_id = f"T19-OVERLAY-{spec.size}X{spec.size}-{spec.page_name.split()[0]}"
    base = OVERLAYS / f"liberty-overlay_{spec.key}"
    metadata = meta(
        doc_id, "transparent-liberty-overlay", boardSize=spec.size,
        pageMm=[spec.page_w, spec.page_h], spacingMm=spec.spacing,
        stoneDiameterMm=[spec.stone_min, spec.stone_max], containsAnswers=False,
        printScalePercent=100,
    )
    if spec.key == '13x13-a4':
        metadata.update(revision=2, resultVersion=OVERLAY_PATCH_VERSION)
    for s in surfaces(base, spec.page_w, spec.page_h, doc_id,
                      f"T19 liberty overlay {spec.size}x{spec.size}", metadata):
        draw_overlay(s, spec)
        s.finish()


def draw_sheet_header(s, title: str, subtitle: str, page_no: str, stone_text: str):
    s.text(15, 14, title, size=5.0, weight="bold")
    s.text(15, 23, subtitle, size=2.9, fill="#333333")
    s.text(195, 14, page_no, size=2.7, anchor="end", fill="#444444")
    s.text(15, 287, f"A4 210×297 mm | {stone_text} | 100% / 实际大小打印 | {RULESET}", size=2.4)
    draw_ruler(s, 55, 273, 100)


def draw_stones(s, color: str, diameter: int, count: int, cols: int, rows: int, pitch: float):
    chinese = "黑棋" if color == "black" else "白棋"
    fill = "#151515" if color == "black" else "#FFFFFF"
    stroke = "#000000"
    draw_sheet_header(
        s, f"可裁切纸棋子 | {chinese} {count} 枚",
        f"圆片直径 {diameter} mm；虚线外沿裁切。单面卡纸可将同色两枚背靠背粘合，或同页双面试印后裁切。",
        "纸棋子", f"棋子直径 {diameter} mm",
    )
    radius = diameter / 2
    start_x = (210 - (cols - 1) * pitch) / 2
    start_y = 38
    for row in range(rows):
        for col in range(cols):
            cx, cy = start_x + col * pitch, start_y + row * pitch
            s.circle(cx, cy, radius, fill=fill, stroke=stroke, sw=0.35, dash="1.2 0.8", cls=f"paper-stone {color}")
            if color == "black":
                s.circle(cx, cy, radius - 1.4, fill="none", stroke="#FFFFFF", sw=0.22, cls="black-stone-inner")
            else:
                s.circle(cx, cy, radius - 1.4, fill="none", stroke="#777777", sw=0.18, cls="white-stone-inner")
    s.text(15, 244, "数量说明", size=3.5, weight="bold")
    if diameter == 18:
        s.text(15, 251, "一页 90 枚。9×9 严格“单色可占满全部交叉点”的上限为 81 枚；两色各印一页即可覆盖该上限。",
               size=2.7)
        s.text(15, 257, "13×13 的对应单色上限为 169 枚：需要时每色印两页（180 枚）并保留备用。实际便携配置可回收提子继续使用。",
               size=2.7)
    else:
        s.text(15, 251, "一页 169 枚，等于 13×13 的交叉点总数；两色各印一页，可覆盖严格的单色占满上限。",
               size=2.7)
        s.text(15, 257, "12 mm 小棋子适配本包可选 13×13 A4（格距 14 mm）；A3 13×13 优先使用 16-18 mm 棋子。",
               size=2.7)
    s.text(15, 263, "回收提子不会限制整局总手数；若要记录提子数须另记。GO-CLUB-AREA-1 面积分不把提子数再次累加。",
           size=2.7)


def make_stone_sheet(color: str, diameter: int, count: int, cols: int, rows: int, pitch: float):
    doc_id = f"T19-PAPER-STONES-{color.upper()}-{diameter}MM-{count}"
    base = KIT / f"paper-stones_{diameter}mm_{color}_{count}"
    metadata = meta(doc_id, "paper-stones", pageMm=[210, 297], diameterMm=diameter, count=count, color=color,
                    printScalePercent=100)
    for s in surfaces(base, 210, 297, doc_id, f"T19 paper stones {color} {diameter}mm {count}", metadata):
        draw_stones(s, color, diameter, count, cols, rows, pitch)
        s.finish()


def make_combined_pdf(inputs: Iterable[Path], output: Path, title: str, *, doc_id=None, revision=1, result_version=RESULT_VERSION):
    writer = PdfWriter()
    for path in inputs:
        reader = PdfReader(str(path))
        for page in reader.pages:
            writer.add_page(page)
    writer.add_metadata({
        "/Title": title,
        "/Author": "Go Club CAS project - original T19 vector layout",
        "/Subject": f"schemaVersion=1; id={doc_id or output.stem}; revision={revision}; rulesetId={RULESET}; resultVersion={result_version}",
    })
    with output.open("wb") as fh:
        writer.write(fh)


def draw_labels(s):
    draw_sheet_header(s, "便携棋具收纳标签", "沿虚线裁切；灰度打印时仍以文字和 B/W 符号区分。教师填写套装编号。",
                      "标签页", "适用棋子直径：不限定")
    cards = [
        (15, 35, 85, 42, "9×9 棋盘", "主盘 | A4 单页 / A3版", "BOARD 9×9"),
        (110, 35, 85, 42, "13×13 扩展", "A3 单页或 A4 两页拼接", "BOARD 13×13"),
        (15, 87, 85, 42, "黑棋 B", "建议袋内数量：____ 枚", "BLACK STONES"),
        (110, 87, 85, 42, "白棋 W", "建议袋内数量：____ 枚", "WHITE STONES"),
        (15, 139, 85, 52, "规则卡袋", "固定位置：套装封面内侧", "RULE CARD POCKET"),
        (110, 139, 85, 52, "可擦写工具", "笔 ____ 支 | 擦布 ____ 块", "MARKER + CLOTH"),
    ]
    for x, y, w, h, title, sub, en in cards:
        s.rect(x, y, w, h, fill="#F7F7F2", stroke="#333333", sw=0.35, radius=2, cls="cut label-card")
        s.text(x + 5, y + 10, title, size=4.1, weight="bold")
        s.text(x + 5, y + 18, en, size=2.4, fill="#3D646D")
        s.text(x + 5, y + 29, sub, size=2.7)
        s.text(x + 5, y + h - 6, "套装编号 Kit ID：____________", size=2.5)
    s.rect(15, 205, 180, 48, fill="#FFFFFF", stroke="#333333", sw=0.35, radius=2, cls="cut pocket-label")
    s.text(20, 216, "规则卡放置位置 | RULE CARD", size=4.3, weight="bold")
    s.text(20, 226, "将此标签贴在文件袋/硬质封套的内侧固定袋口；规则卡正面朝外。", size=2.8)
    s.text(20, 234, "归还前检查：规则卡在位 □  覆片在位 □  借还清单已填写 □", size=2.8)
    s.text(20, 244, "套装编号：____________   当前规则版本：GO-CLUB-AREA-1", size=2.8)


def draw_checklist(s):
    draw_sheet_header(s, "便携棋具借还清单 | 每页 2 份", "沿虚线裁切。只记录活动管理所需信息；是否填写姓名由教师按实际安排决定。",
                      "借还清单", "适用棋子直径：不限定")
    for idx, y in enumerate([32, 149], start=1):
        s.rect(12, y, 186, 105, fill="#FFFFFF", stroke="#333333", sw=0.35, radius=2, cls="cut loan-checklist")
        s.text(18, y + 10, f"双人棋具套装借还清单 {idx}", size=4.0, weight="bold")
        s.text(192, y + 10, "Kit ID: __________", size=2.8, anchor="end")
        s.text(18, y + 20, "借出日期/节次：____________   借用人或小组（可选）：__________________", size=2.8)
        s.text(18, y + 30, "借出时核对", size=3.1, weight="bold", fill="#35515A")
        s.text(18, y + 38, "□ 9×9 棋盘  □ 13×13 扩展  □ 黑棋袋  □ 白棋袋  □ 规则卡", size=2.8)
        s.text(18, y + 46, "□ 透明覆片/文件袋  □ 可擦写笔  □ 擦布  □ 收纳袋/封套", size=2.8)
        s.text(18, y + 57, "借出数量：黑 ____  白 ____  |  状态备注：____________________________", size=2.8)
        s.line(18, y + 63, 192, y + 63, stroke="#999999", sw=0.25)
        s.text(18, y + 71, "归还时核对", size=3.1, weight="bold", fill="#35515A")
        s.text(18, y + 79, "□ 全部归位  □ 数量已核  □ 棋盘/覆片已擦净  □ 破损已记录", size=2.8)
        s.text(18, y + 89, "归还数量：黑 ____  白 ____  |  缺失/破损：____________________________", size=2.8)
        s.text(18, y + 99, "借出确认：____________   归还确认：____________   日期：____________", size=2.7)


def draw_kit_layout(s):
    draw_sheet_header(s, "一套便携棋具 | 配置示意", "这是制作与装袋示意，不表示学校已有器材。实际人数、备用比例与材料由教师填写。",
                      "配置页", "适用棋子直径：16-18 / 24-26 mm")
    s.rect(15, 35, 180, 185, fill="#F7F7F2", stroke="#444444", sw=0.45, radius=3, cls="portable-kit-container")
    s.text(22, 47, "套装封套 / 文件袋", size=4.4, weight="bold")
    s.text(188, 47, "Kit ID: ______", size=2.8, anchor="end")
    items = [
        (25, 58, 74, 48, "主棋盘", "9×9 单页", "优先放最外层"),
        (108, 58, 74, 48, "扩展棋盘", "13×13 / 拼接页", "平放或分袋"),
        (25, 116, 74, 38, "黑棋袋 B", "数量：____", "独立收纳"),
        (108, 116, 74, 38, "白棋袋 W", "数量：____", "独立收纳"),
        (25, 164, 74, 42, "透明覆片", "先圈气再落子", "与棋盘同尺寸"),
        (108, 164, 74, 42, "规则卡固定袋", "封面内侧", "正面朝外"),
    ]
    for x, y, w, h, title, sub, note in items:
        s.rect(x, y, w, h, fill="#FFFFFF", stroke="#51747C", sw=0.35, radius=2, cls="kit-item")
        s.text(x + 5, y + 10, title, size=3.5, weight="bold")
        s.text(x + 5, y + 19, sub, size=2.8)
        s.text(x + 5, y + h - 6, note, size=2.4, fill="#555555")
    s.text(15, 232, "套数公式", size=3.8, weight="bold")
    s.text(15, 241, "基础套数 = ⌈实际参与人数 ÷ 2⌉", size=3.2)
    s.text(15, 249, "准备套数 = 基础套数 + 教师填写的备用套数（建议先从 1 套或约 10% 试配，不冒充已确认需求）", size=2.8)
    s.text(15, 257, "若人数为奇数：仍按向上取整；可由一组轮换观察/记录，但不强制计时或排名。", size=2.8)
    s.text(15, 265, "A3 板需 A3 封套；追求更便携时，用两页 A4 拼接版并在桌面临时对齐。覆膜 A3 不建议折叠。", size=2.8)


def make_aux_sheet(filename: str, doc_id: str, title: str, draw_fn):
    base = KIT / filename
    metadata = meta(doc_id, "portable-kit-print-sheet", pageMm=[210, 297], printScalePercent=100)
    for s in surfaces(base, 210, 297, doc_id, title, metadata):
        draw_fn(s)
        s.finish()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true", help="List board geometry and exit")
    parser.add_argument("--repair-overlay-13-a4", action="store_true", help="Regenerate only the T24-corrected overlay and its derived print pack")
    args = parser.parse_args()

    if args.list:
        for spec in SPECS.values():
            print(json.dumps(spec.__dict__ | {"gridExtent": spec.grid_extent}, ensure_ascii=False))
        return

    if not FONT_PATH.exists():
        raise SystemExit(f"Required Unicode font not found: {FONT_PATH}")
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
    for directory in [BOARDS, KIT, OVERLAYS]:
        directory.mkdir(parents=True, exist_ok=True)

    if args.repair_overlay_13_a4:
        make_overlay(SPECS['13x13-a4'])
        make_combined_pdf([
            BOARDS / 'go-board_13x13-a4_coordinates.pdf',
            OVERLAYS / 'liberty-overlay_13x13-a4.pdf',
            KIT / 'paper-stones_12mm_black_169.pdf',
            KIT / 'paper-stones_12mm_white_169.pdf',
        ], OUT / 'print-pack_13x13-A4-small-extension.pdf',
            'T19 13x13 A4 small-stone extension print pack',
            doc_id='T19-PRINT-PACK-13X13-A4', revision=2, result_version=OVERLAY_PATCH_VERSION)
        return

    for spec in SPECS.values():
        for coordinates in [True, False]:
            make_board(spec, coordinates)
        make_overlay(spec)

    for spec in [SPECS["9x9-a3"], SPECS["13x13-a3"]]:
        for coordinates in [True, False]:
            make_tiled_pdf(spec, coordinates)

    for color in ["black", "white"]:
        make_stone_sheet(color, 18, 90, 9, 10, 20)
        make_stone_sheet(color, 12, 169, 13, 13, 14)
    make_combined_pdf(
        [KIT / "paper-stones_18mm_black_90.pdf", KIT / "paper-stones_18mm_white_90.pdf"],
        KIT / "paper-stones_18mm_black-white_180.pdf",
        "T19 paper stones - 90 black and 90 white",
    )
    make_combined_pdf(
        [KIT / "paper-stones_12mm_black_169.pdf", KIT / "paper-stones_12mm_white_169.pdf"],
        KIT / "paper-stones_12mm_black-white_338.pdf",
        "T19 small paper stones - 169 black and 169 white",
    )
    make_aux_sheet("storage-labels_A4", "T19-STORAGE-LABELS-A4", "T19 storage labels", draw_labels)
    make_aux_sheet("loan-return-checklist_A4", "T19-LOAN-CHECKLIST-A4", "T19 loan and return checklist", draw_checklist)
    make_aux_sheet("portable-kit-layout_A4", "T19-PORTABLE-KIT-LAYOUT-A4", "T19 portable kit layout", draw_kit_layout)

    make_combined_pdf(
        [
            BOARDS / "go-board_9x9-a4_coordinates.pdf",
            OVERLAYS / "liberty-overlay_9x9-a4.pdf",
            KIT / "paper-stones_18mm_black_90.pdf",
            KIT / "paper-stones_18mm_white_90.pdf",
            KIT / "storage-labels_A4.pdf",
            KIT / "loan-return-checklist_A4.pdf",
            KIT / "portable-kit-layout_A4.pdf",
        ],
        OUT / "print-pack_9x9-A4-portable-kit.pdf",
        "T19 9x9 A4 portable kit print pack",
    )
    make_combined_pdf(
        [
            BOARDS / "go-board_13x13-a3_coordinates.pdf",
            OVERLAYS / "liberty-overlay_13x13-a3.pdf",
        ],
        OUT / "print-pack_13x13-A3-extension.pdf",
        "T19 13x13 A3 extension print pack",
    )
    make_combined_pdf(
        [
            BOARDS / "go-board_13x13-a4_coordinates.pdf",
            OVERLAYS / "liberty-overlay_13x13-a4.pdf",
            KIT / "paper-stones_12mm_black_169.pdf",
            KIT / "paper-stones_12mm_white_169.pdf",
        ],
        OUT / "print-pack_13x13-A4-small-extension.pdf",
        "T19 13x13 A4 small-stone extension print pack",
        doc_id='T19-PRINT-PACK-13X13-A4', revision=2, result_version=OVERLAY_PATCH_VERSION,
    )

    print(f"Generated T19 artifacts under {OUT}")


if __name__ == "__main__":
    main()

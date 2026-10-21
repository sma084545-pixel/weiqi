#!/usr/bin/env python3
"""Build T21 duplex challenge cards and teacher answer book from Freeze B inputs.

Only writes inside materials/challenge-cards. The authoritative puzzle JSON remains
read-only. Every build verifies CONTENT_FREEZE.json before copying a frozen input
snapshot and generating editable SVG plus print PDFs.
"""

from __future__ import annotations

import csv
import hashlib
import html
import json
import math
import re
import shutil
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


HERE = Path(__file__).resolve().parent
MATERIAL = HERE.parent
PROJECT = MATERIAL.parent.parent
FREEZE_PATH = PROJECT / "handoff" / "CONTENT_FREEZE.json"
CONTENT = PROJECT / "content"
OUT = MATERIAL / "output"
EDITABLE = MATERIAL / "editable"
VALIDATION = MATERIAL / "validation"
FROZEN = MATERIAL / "frozen-input"

RULESET = "GO-CLUB-AREA-1"
SCHEMA = 1
RESULT_VERSION = "0.15.1-t21.1"
TASK_ID = "T21"
FREEZE_ID_EXPECTED = "GO-CLUB-FREEZE-B-20260919-01"
COLS = "ABCDEFGHJKLMNOPQRST"

W, H = A4
CARD_W, CARD_H = W, H / 2

CATEGORY = {
    "LIB": ("气", "Liberties", "#3C6E71"),
    "CAP": ("提子", "Capture", "#A44A3F"),
    "CON": ("连接", "Connection", "#5A6B9F"),
    "LIFE": ("眼与基础死活", "Life & death", "#8C5E3C"),
    "AREA": ("面积判断", "Area", "#4D7651"),
    "DISC": ("开放讨论", "Discussion", "#70517C"),
}

DIFFICULTY = {
    "beginner": ("入门", "◆◇◇"),
    "elementary": ("基础", "◆◆◇"),
    "optional-challenge": ("自选挑战", "◆◆◆"),
}

FONT_CANDIDATES = [
    Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    Path("/Library/Fonts/Arial Unicode.ttf"),
]
FONT_PATH = next((p for p in FONT_CANDIDATES if p.exists()), None)
if not FONT_PATH:
    raise SystemExit("Missing Arial Unicode font. See source/FONTS.md.")
FONT = "T21CJK"
pdfmetrics.registerFont(TTFont(FONT, str(FONT_PATH)))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def dump_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def coord(point: dict[str, int], size: int) -> str:
    return f"{COLS[point['col']]}{size - point['row']}"


def player(color: str) -> str:
    return "黑方" if color == "B" else "白方"


def wrap_chars(text: str, width: float, size: float, font: str = FONT) -> list[str]:
    result: list[str] = []
    for raw in str(text).splitlines() or [""]:
        if not raw:
            result.append("")
            continue
        line = ""
        for ch in raw:
            if line and pdfmetrics.stringWidth(line + ch, font, size) > width:
                result.append(line)
                line = ch
            else:
                line += ch
        result.append(line)
    return result


def draw_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    size: float = 9,
    leading: float | None = None,
    color: str = "#1D3035",
    max_lines: int | None = None,
) -> float:
    leading = leading or size * 1.45
    lines = wrap_chars(text, width, size)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while pdfmetrics.stringWidth(last + "…", FONT, size) > width and last:
            last = last[:-1]
        lines[-1] = last + "…"
    c.setFont(FONT, size)
    c.setFillColor(HexColor(color))
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_label(c: canvas.Canvas, text: str, x: float, y: float, fill: str, width: float | None = None) -> float:
    size = 8.5
    pad = 5
    w = width or pdfmetrics.stringWidth(text, FONT, size) + pad * 2
    c.setFillColor(HexColor(fill))
    c.roundRect(x, y - 12, w, 17, 4, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont(FONT, size)
    c.drawCentredString(x + w / 2, y - 7, text)
    return w


def target_map(puzzle: dict[str, Any]) -> dict[tuple[int, int], str]:
    return {
        (p["row"], p["col"]): str(i + 1)
        for i, marker in enumerate(puzzle.get("targetMarkers", []))
        for p in marker["points"]
    }


def draw_board(
    c: canvas.Canvas,
    puzzle: dict[str, Any],
    left: float,
    bottom: float,
    width: float,
    stones: list[dict[str, Any]] | None = None,
    move_numbers: dict[tuple[int, int], str] | None = None,
    answer_markers: dict[tuple[int, int], str] | None = None,
) -> None:
    pos = puzzle["initialPosition"]
    n = pos["size"]
    stones = stones if stones is not None else pos["stones"]
    targets = target_map(puzzle)
    margin = 22 if width >= 180 else 14
    span = width - 2 * margin
    step = span / (n - 1)
    ox, oy = left + margin, bottom + width - margin
    c.setFillColor(HexColor("#F2D89A"))
    c.roundRect(left + 2, bottom + 2, width - 4, width - 4, 4, stroke=0, fill=1)
    c.setStrokeColor(HexColor("#70695E"))
    c.setLineWidth(0.55 if width < 180 else 0.7)
    for i in range(n):
        v = ox + i * step
        h = oy - i * step
        c.line(v, oy, v, oy - span)
        c.line(ox, h, ox + span, h)
    label_size = 7 if width < 180 else 8.5
    c.setFont(FONT, label_size)
    c.setFillColor(HexColor("#26373A"))
    for i in range(n):
        c.drawCentredString(ox + i * step, bottom + 4, COLS[i])
        c.drawRightString(left + margin - 5, oy - i * step - label_size / 3, str(n - i))
    rad = min(11 if width >= 180 else 8, step * 0.42)
    for s in stones:
        cx, cy = ox + s["col"] * step, oy - s["row"] * step
        is_black = s["color"] == "B"
        c.setFillColor(HexColor("#151B1D" if is_black else "#FFFFFF"))
        c.setStrokeColor(HexColor("#151B1D"))
        c.setLineWidth(1)
        c.circle(cx, cy, rad, stroke=1, fill=1)
        label = (move_numbers or {}).get((s["row"], s["col"])) or targets.get((s["row"], s["col"]))
        if label:
            c.setFillColor(HexColor("#FFFFFF" if is_black else "#151B1D"))
            c.setFont(FONT, min(8.5, rad))
            c.drawCentredString(cx, cy - 3, label)
    if answer_markers:
        for (row, col), mark in answer_markers.items():
            cx, cy = ox + col * step, oy - row * step
            c.setStrokeColor(HexColor("#13766D"))
            c.setFillColor(HexColor("#FFFFFF"))
            c.setLineWidth(1.8)
            c.circle(cx, cy, rad * 0.72, stroke=1, fill=1)
            c.setFillColor(HexColor("#13766D"))
            c.setFont(FONT, min(8.5, rad))
            c.drawCentredString(cx, cy - 3, mark)


def group_and_liberties(board: dict[tuple[int, int], str], start: tuple[int, int], n: int) -> tuple[set[tuple[int, int]], set[tuple[int, int]]]:
    color = board[start]
    group, libs, stack = set(), set(), [start]
    while stack:
        p = stack.pop()
        if p in group:
            continue
        group.add(p)
        r, col = p
        for q in ((r - 1, col), (r + 1, col), (r, col - 1), (r, col + 1)):
            if not (0 <= q[0] < n and 0 <= q[1] < n):
                continue
            if q not in board:
                libs.add(q)
            elif board[q] == color and q not in group:
                stack.append(q)
    return group, libs


def replay(puzzle: dict[str, Any], moves: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[tuple[int, int], str]]:
    n = puzzle["initialPosition"]["size"]
    board = {(s["row"], s["col"]): s["color"] for s in puzzle["initialPosition"]["stones"]}
    numbers: dict[tuple[int, int], str] = {}
    for idx, move in enumerate(moves, 1):
        if move["type"] == "pass":
            continue
        at = (move["at"]["row"], move["at"]["col"])
        board[at] = move["color"]
        other = "W" if move["color"] == "B" else "B"
        captured: set[tuple[int, int]] = set()
        for q in ((at[0] - 1, at[1]), (at[0] + 1, at[1]), (at[0], at[1] - 1), (at[0], at[1] + 1)):
            if q in board and board[q] == other:
                group, libs = group_and_liberties(board, q, n)
                if not libs:
                    captured |= group
        for q in captured:
            board.pop(q, None)
            numbers.pop(q, None)
        if at in board:
            numbers[at] = str(idx)
    stones = [{"row": r, "col": col, "color": color} for (r, col), color in sorted(board.items())]
    return stones, numbers


def leaf_branches(puzzle: dict[str, Any]) -> list[dict[str, Any]]:
    ans = puzzle["answer"]
    if ans["type"] != "move-tree":
        return []
    nodes = {n["nodeId"]: n for n in ans["nodes"]}
    root = nodes[ans["rootNodeId"]]
    out: list[dict[str, Any]] = []

    def walk(node: dict[str, Any], moves: list[dict[str, Any]]) -> None:
        next_moves = moves + ([node["move"]] if node.get("move") else [])
        if not node.get("children"):
            out.append({"moves": next_moves, "outcome": node["outcome"], "explanation": node.get("explanation", "")})
            return
        for child in node["children"]:
            walk(nodes[child], next_moves)

    for child in root.get("children", []):
        walk(nodes[child], [])
    return out


def moves_text(moves: Iterable[dict[str, Any]], size: int) -> str:
    parts = []
    for move in moves:
        who = "黑" if move["color"] == "B" else "白"
        parts.append(who + ("停一手" if move["type"] == "pass" else coord(move["at"], size)))
    return " → ".join(parts) or "无落子"


def answer_markers(puzzle: dict[str, Any]) -> dict[tuple[int, int], str]:
    ans = puzzle["answer"]
    if ans["type"] == "point-set":
        return {(p["row"], p["col"]): "✓" for p in ans["points"]}
    if ans["type"] == "region-labels":
        marks = {"B": "黑", "W": "白", "neutral": "×"}
        return {(v["at"]["row"], v["at"]["col"]): marks[v["owner"]] for v in ans["labels"]}
    return {}


def answer_summary(puzzle: dict[str, Any], pedagogy: dict[str, Any]) -> str:
    ans = puzzle["answer"]
    n = puzzle["initialPosition"]["size"]
    if ans["type"] == "number":
        return f"正确答案：{ans['value']}。{ans['explanation']}"
    if ans["type"] == "point-set":
        pts = "、".join(coord(p, n) for p in ans["points"])
        return f"正确点集：{pts}。{ans['explanation']}"
    if ans["type"] == "region-labels":
        groups = []
        for owner, label in (("B", "黑围空"), ("W", "白围空"), ("neutral", "中立")):
            pts = [coord(v["at"], n) for v in ans["labels"] if v["owner"] == owner]
            groups.append(label + "：" + "、".join(pts))
        return "；".join(groups) + "。" + ans["explanation"]
    if ans["type"] == "reason-choice":
        accepted = set(ans["acceptedOptionIds"])
        chosen = [o for o in ans["options"] if o["optionId"] in accepted]
        return "正确选择：" + "；".join(o["optionId"] + "（" + o["text"] + "）" for o in chosen) + "。" + ans["explanation"]
    if ans["type"] == "open-text":
        return "开放讨论，不设唯一答案。可接受方向：" + "；".join(ans["sampleConsiderations"])
    return pedagogy["explanation"]


def front_conditions(puzzle: dict[str, Any]) -> str:
    assumptions = puzzle["conditions"]["assumptions"]
    extra = assumptions[4:]
    cleaned = []
    for item in extra:
        item = item.replace("confirmedBy 保持空数组。", "不冒充真实双方确认。")
        if "新教学起点" in item and "真实完整" in item:
            continue
        cleaned.append(item)
    base = puzzle["conditions"]["external"]
    if puzzle["initialPosition"].get("historyPolicy") == "fresh-setup":
        base += " 新教学起点，过往劫史未知。"
    return base + (" " + " ".join(cleaned) if cleaned else "")


def card_header(c: canvas.Canvas, puzzle: dict[str, Any], pedagogical: dict[str, Any], x: float, y: float, back: bool) -> None:
    cat_cn, cat_en, color = CATEGORY[puzzle["category"]]
    c.setFillColor(HexColor(color))
    c.rect(x, y + CARD_H - 28, CARD_W, 28, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont(FONT, 12.5)
    c.drawString(x + 22, y + CARD_H - 19, f"{puzzle['id']}  r{puzzle['revision']}  |  {cat_cn} {cat_en}")
    c.setFont(FONT, 8.5)
    c.drawRightString(x + CARD_W - 22, y + CARD_H - 18, "背面 · 提示与解答" if back else "正面 · 挑战")
    c.setStrokeColor(HexColor("#9EA8A6"))
    c.setLineWidth(0.55)
    c.rect(x + 0.5, y + 0.5, CARD_W - 1, CARD_H - 1, stroke=1, fill=0)
    c.setFillColor(HexColor("#1D3035"))
    c.setFont(FONT, 13.5)
    c.drawString(x + 22, y + CARD_H - 50, pedagogical["title"])


def draw_front(c: canvas.Canvas, puzzle: dict[str, Any], pedagogical: dict[str, Any], x: float, y: float) -> None:
    card_header(c, puzzle, pedagogical, x, y, back=False)
    diff_cn, icons = DIFFICULTY[puzzle["difficulty"]["level"]]
    _, _, color = CATEGORY[puzzle["category"]]
    draw_label(c, f"{diff_cn} {icons}", x + CARD_W - 103, y + CARD_H - 43, color, 81)
    board_size = 232
    draw_board(c, puzzle, x + 18, y + 58, board_size)
    pos = puzzle["initialPosition"]
    c.setFont(FONT, 7.6)
    c.setFillColor(HexColor("#44555A"))
    c.drawString(x + 25, y + 46, f"完整 {pos['size']}×{pos['size']} 棋盘 · 坐标列跳过 I · 数字为目标")
    rx, rw = x + 268, CARD_W - 290
    yy = y + CARD_H - 78
    yy = draw_text(c, f"谁先 / 轮次：{player(puzzle['firstPlayer'])}", rx, yy, rw, 9.5, color=color)
    yy = draw_text(c, "具体任务", rx, yy - 7, rw, 9.2, color="#13766D")
    yy = draw_text(c, puzzle["prompt"], rx, yy - 3, rw, 11, 16, max_lines=5)
    yy = draw_text(c, "必要条件", rx, yy - 8, rw, 9.2, color="#13766D")
    yy = draw_text(c, front_conditions(puzzle), rx, yy - 3, rw, 8.2, 12.2, max_lines=8)
    if puzzle["answer"]["type"] == "reason-choice":
        options = "\n".join(f"{o['optionId']}：{o['text']}" for o in puzzle["answer"]["options"])
        yy = draw_text(c, "选项", rx, yy - 5, rw, 8.8, color="#13766D")
        yy = draw_text(c, options, rx, yy - 2, rw, 7.8, 11.2, max_lines=6)
    if puzzle["category"] == "DISC":
        draw_text(c, "开放题：比较依据、对方回应与倾听；不设唯一最佳手。", rx, max(y + 47, yy - 8), rw, 8.2, 12, color="#5C4665")
    c.setFillColor(HexColor("#EAF2F0"))
    c.roundRect(rx, y + 25, rw, 28, 5, stroke=0, fill=1)
    draw_text(c, "先独立想，再与同伴说明；不计时、不排名。", rx + 8, y + 42, rw - 16, 8.3, 11, color="#244C4C")


def draw_back(c: canvas.Canvas, puzzle: dict[str, Any], pedagogical: dict[str, Any], x: float, y: float, teacher_page: int) -> None:
    card_header(c, puzzle, pedagogical, x, y, back=True)
    left, left_w = x + 22, 255
    right, right_w = x + 296, CARD_W - 318
    yy = y + CARD_H - 78
    yy = draw_text(c, "三层提示", left, yy, left_w, 10, color="#13766D")
    for idx, hint in enumerate(puzzle["hints"], 1):
        yy = draw_text(c, f"{idx}. {hint}", left, yy - 4, left_w, 8.7, 12.5, max_lines=3)
    yy = draw_text(c, "常见错误", left, yy - 8, left_w, 10, color="#A44A3F")
    yy = draw_text(c, pedagogical["commonErrors"], left, yy - 3, left_w, 8.2, 11.8, max_lines=6)
    draw_text(c, f"教师详解：答案册第 {teacher_page} 页", left, y + 35, left_w, 8.5, color="#5A6B9F")

    yy = y + CARD_H - 78
    heading = "合理讨论方向" if puzzle["answer"]["type"] == "open-text" else "正确答案"
    yy = draw_text(c, heading, right, yy, right_w, 10, color="#13766D")
    summary = answer_summary(puzzle, pedagogical)
    yy = draw_text(c, summary, right, yy - 4, right_w, 8.2, 11.7, max_lines=10)
    if puzzle["answer"]["type"] == "open-text":
        yy = draw_text(c, "量规", right, yy - 7, right_w, 9.5, color="#70517C")
        criteria = "；".join(puzzle["answer"]["criteria"])
        yy = draw_text(c, criteria, right, yy - 3, right_w, 8, 11.5, max_lines=7)
    branches = leaf_branches(puzzle)
    if branches:
        yy = draw_text(c, "关键变化", right, yy - 7, right_w, 9.5, color="#5A6B9F")
        n = puzzle["initialPosition"]["size"]
        for branch in branches[:3]:
            outcome = "达标" if branch["outcome"] == "success" else "未达标"
            yy = draw_text(c, f"{moves_text(branch['moves'], n)}（{outcome}）", right, yy - 2, right_w, 7.8, 10.8, max_lines=2)
    c.setFillColor(HexColor("#F0F4F3"))
    c.roundRect(right, y + 25, right_w, 27, 5, stroke=0, fill=1)
    boundary = "讨论题无唯一答案" if puzzle["answer"]["type"] == "open-text" else "未收录的合法手不自动判错"
    draw_text(c, boundary + " · humanReviewed=null", right + 7, y + 41, right_w - 14, 7.5, 10, color="#46575B")


def draw_cut_line(c: canvas.Canvas) -> None:
    c.saveState()
    c.setStrokeColor(HexColor("#707A79"))
    c.setDash(3, 3)
    c.setLineWidth(0.6)
    c.line(10, CARD_H, W - 10, CARD_H)
    c.setDash()
    c.setFont(FONT, 6.5)
    c.setFillColor(HexColor("#6C7775"))
    c.drawString(14, CARD_H + 5, "裁切线 · 100% 实际尺寸")
    c.restoreState()


def build_card_pdfs(puzzles: list[dict[str, Any]], pedagogy: dict[str, Any], page_map: dict[str, int]) -> None:
    for side, renderer, filename in (
        ("front", draw_front, "T21_challenge_cards_front_A4.pdf"),
        ("back", draw_back, "T21_challenge_cards_back_A4.pdf"),
    ):
        c = canvas.Canvas(str(OUT / filename), pagesize=A4, pageCompression=1)
        c.setTitle("T21 30张挑战卡" + ("正面" if side == "front" else "背面"))
        for page_index in range(15):
            for half in range(2):
                puzzle = puzzles[page_index * 2 + half]
                y = CARD_H if half == 0 else 0
                if side == "front":
                    renderer(c, puzzle, pedagogy[puzzle["id"]], 0, y)
                else:
                    renderer(c, puzzle, pedagogy[puzzle["id"]], 0, y, page_map[puzzle["id"]])
            draw_cut_line(c)
            c.showPage()
        c.save()


def build_duplex_test_pdf() -> None:
    writer = PdfWriter()
    for filename in ("T21_challenge_cards_front_A4.pdf", "T21_challenge_cards_back_A4.pdf"):
        reader = PdfReader(str(OUT / filename))
        writer.add_page(reader.pages[0])
    writer.add_metadata({"/Title": "T21 双面套准测试页（正面1 + 背面1）"})
    with (OUT / "T21_duplex_test_page1.pdf").open("wb") as f:
        writer.write(f)


def teacher_footer(c: canvas.Canvas, page: int, label: str = "T21 教师答案册") -> None:
    c.setStrokeColor(HexColor("#CDD5D3"))
    c.line(28, 28, W - 28, 28)
    c.setFillColor(HexColor("#526064"))
    c.setFont(FONT, 7.5)
    c.drawString(28, 17, f"{label} · {RESULT_VERSION} · {RULESET}")
    c.drawRightString(W - 28, 17, str(page))


def teacher_title(c: canvas.Canvas, title: str, subtitle: str = "") -> None:
    c.setFillColor(HexColor("#173E42"))
    c.rect(0, H - 66, W, 66, stroke=0, fill=1)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont(FONT, 19)
    c.drawString(30, H - 40, title)
    if subtitle:
        c.setFont(FONT, 8.5)
        c.drawRightString(W - 30, H - 40, subtitle)


def draw_intro_pages(c: canvas.Canvas, puzzles: list[dict[str, Any]], pedagogy: dict[str, Any]) -> None:
    # Page 1: cover and scope
    teacher_title(c, "T21 教师答案册", "30题 · 六类各5题 · Freeze B")
    draw_text(c, "30 张纸质挑战卡配套教师版", 40, 735, 515, 16, 22, color="#173E42")
    draw_text(c, f"冻结点：{FREEZE_ID_EXPECTED}\n内容版本：0.2.0-t09.1\n材料版本：{RESULT_VERSION}\n规则：{RULESET}（项目教学规则，不冒称正式竞赛规则）", 40, 690, 515, 10.5, 18)
    draw_text(c, "使用边界", 40, 590, 515, 12, color="#13766D")
    draw_text(c, "所有题目、坐标、revision 与冻结 JSON 一致。DISC-001 至 DISC-005 为开放讨论，不设唯一答案；其余题目的自动覆盖只限已记录范围，未收录的合法手保持 unknown。humanReviewed=null：本册不冒充人类围棋教师审核。", 40, 566, 515, 10.2, 16)
    draw_text(c, "打印摘要", 40, 455, 515, 12, color="#13766D")
    draw_text(c, "A4 纵向、100% 实际尺寸、双面长边翻。每页两卡，正背页码与上下位置完全相同。先只打印第 1 页做套准测试；实体套准、裁切耐用性与课堂阅读尚待实测。", 40, 431, 515, 10.2, 16)
    draw_text(c, "术语首次出现沿用：气（liberty）、提子（capture）、连接（connection）、打吃（atari）、真眼（true eye）、假眼（false eye）、贴目（komi）、面积计分（area scoring）。", 40, 330, 515, 10.2, 16)
    draw_text(c, "来源边界：棋形、题目与表达为 T09 原创并经冻结自动核查；BGA 页面仅用于核对一般概念和教学方法，不把其不同规则混入 GO-CLUB-AREA-1。", 40, 235, 515, 10.2, 16)
    teacher_footer(c, 1)
    c.showPage()

    # Page 2: three offline activities
    teacher_title(c, "线下玩法与带领提示", "不计时 · 不排名 · 可跳过")
    activities = [
        ("1｜双人共同解题", "两人共用一张卡和棋盘。一人负责逐点摆棋并复述题目，另一人负责说明理由；完成一题后交换角色。遇到分歧时先重放合法变化，再查卡背或答案册。熟练成员只能作为解释者，下一题轮换。"),
        ("2｜任选难度的任务站", "按六类别和三档难度摆放卡片。参与者自行选择、可随时换题，也可直接去对弈站。完成后用“我依据了什么”作口头反馈，不累计速度、胜率或公开排行榜。"),
        ("3｜先解释再摆答案", "解题者先不碰棋子，用坐标、气或连接关系说出预测；同伴再按所述摆出，并检查是否符合成功标准。开放题先准确复述对方理由，再给自己的取舍；解释者每题轮换。"),
    ]
    y = 730
    for title, body in activities:
        draw_text(c, title, 42, y, 510, 13, color="#13766D")
        y = draw_text(c, body, 42, y - 27, 510, 10.2, 16)
        y -= 28
    draw_text(c, "教师提醒", 42, y, 510, 12, color="#A44A3F")
    draw_text(c, "不要把答对速度、胜率或是否连续参加与个人价值绑定。允许跳过已掌握内容。死活题只在题目写明的完整棋盘与外部条件下解释；开放题按量规反馈，不印唯一答案。", 42, y - 25, 510, 10.2, 16)
    teacher_footer(c, 2)
    c.showPage()

    # Page 3: index
    teacher_title(c, "按 ID 索引", "卡背页码指向本册")
    col_w = 174
    for idx, puzzle in enumerate(puzzles):
        col = idx // 10
        row = idx % 10
        x = 34 + col * col_w
        y = 738 - row * 64
        page = idx + 4
        cat = CATEGORY[puzzle["category"]][0]
        draw_text(c, f"{puzzle['id']} r{puzzle['revision']} · p.{page}", x, y, col_w - 10, 9.2, 12, color="#173E42")
        draw_text(c, f"{cat}｜{pedagogy[puzzle['id']]['title']}", x, y - 16, col_w - 10, 7.8, 10.5, max_lines=2)
    teacher_footer(c, 3)
    c.showPage()


def teacher_answer_overlay(puzzle: dict[str, Any]) -> dict[tuple[int, int], str]:
    return answer_markers(puzzle)


def draw_teacher_puzzle(c: canvas.Canvas, puzzle: dict[str, Any], pedagogical: dict[str, Any], page: int) -> dict[str, Any]:
    cat_cn, cat_en, color = CATEGORY[puzzle["category"]]
    teacher_title(c, f"{puzzle['id']}  r{puzzle['revision']}｜{pedagogical['title']}", f"{cat_cn} {cat_en}")
    diff_cn, icons = DIFFICULTY[puzzle["difficulty"]["level"]]
    draw_label(c, f"{diff_cn} {icons}", 470, H - 77, color, 91)
    branches = leaf_branches(puzzle)
    overlay = teacher_answer_overlay(puzzle)
    draw_board(c, puzzle, 30, 520, 225, answer_markers=overlay)
    draw_text(c, "初始局面" + ("（绿色标记为答案点）" if overlay else ""), 34, 509, 220, 7.8, color="#526064")

    rx, rw = 282, 280
    y = 752
    y = draw_text(c, f"谁先 / 轮次：{player(puzzle['firstPlayer'])}", rx, y, rw, 9.2, color=color)
    y = draw_text(c, "题干", rx, y - 7, rw, 9.5, color="#13766D")
    y = draw_text(c, puzzle["prompt"], rx, y - 3, rw, 9.6, 14, max_lines=5)
    y = draw_text(c, "答案与核查说明", rx, y - 7, rw, 9.5, color="#13766D")
    y = draw_text(c, answer_summary(puzzle, pedagogical), rx, y - 3, rw, 8.1, 11.5, max_lines=13)
    if y < 515:
        raise ValueError(f"teacher top overflow: {puzzle['id']} at {y}")

    # Key diagrams for up to two branches.
    if branches:
        for i, branch in enumerate(branches[:2]):
            stones, numbers = replay(puzzle, branch["moves"])
            bx = 30 + i * 116
            draw_board(c, puzzle, bx, 370, 105, stones=stones, move_numbers=numbers)
            outcome = "达标" if branch["outcome"] == "success" else "未达标"
            draw_text(c, f"变化 {i + 1} · {outcome}", bx, 360, 108, 7.2, 9, color="#526064", max_lines=1)
        text_x, text_w, text_y = 282, 280, 492
    else:
        text_x, text_w, text_y = 30, 532, 488

    min_y = 48
    if branches:
        text_y = draw_text(c, "完整已记录答案树", text_x, text_y, text_w, 9.3, color="#5A6B9F")
        n = puzzle["initialPosition"]["size"]
        for i, branch in enumerate(branches, 1):
            outcome = "达标" if branch["outcome"] == "success" else "未达标"
            line = f"{i}. {moves_text(branch['moves'], n)}｜{outcome}｜{branch['explanation']}"
            text_y = draw_text(c, line, text_x, text_y - 3, text_w, 7.55, 10.5, max_lines=5)
        policy = puzzle["answer"].get("uncoveredPolicy", "n/a")
        text_y = draw_text(c, f"覆盖边界：uncoveredPolicy={policy}；未列合法手不自动判错；不据此声称通用死活判定。", text_x, text_y - 4, text_w, 7.5, 10.5, color="#70517C", max_lines=3)

    block_y = 340 if branches else text_y - 8
    blocks = [
        ("三层提示", "｜".join(f"{i + 1}. {h}" for i, h in enumerate(puzzle["hints"]))),
        ("成功标准", pedagogical["success"]),
        ("常见错误与解释", pedagogical["commonErrors"]),
        ("同伴讨论", pedagogical["peerDiscussion"]),
        ("外部条件", front_conditions(puzzle)),
    ]
    if puzzle["answer"]["type"] == "open-text":
        blocks.insert(2, ("开放量规", "；".join(puzzle["answer"]["criteria"])))
        blocks.insert(3, ("多个合理方向", "；".join(puzzle["answer"]["sampleConsiderations"])))
    for title, body in blocks:
        block_y = draw_text(c, f"{title}：{body}", 30, block_y, 532, 7.75, 11.0, max_lines=5)
        block_y -= 4
    draw_text(c, "核查：冻结 JSON / bundle / 卡片题干与 revision 同源；结构、记录变化与有限目标已自动核查。humanReviewed=null；实体课堂未测。", 30, max(42, block_y), 532, 6.9, 9.5, color="#526064", max_lines=2)
    if block_y < min_y:
        raise ValueError(f"teacher bottom overflow: {puzzle['id']} at {block_y}")
    teacher_footer(c, page)
    return {"id": puzzle["id"], "revision": puzzle["revision"], "page": page, "lowestBaseline": round(block_y, 2)}


def build_teacher_pdf(puzzles: list[dict[str, Any]], pedagogy: dict[str, Any]) -> list[dict[str, Any]]:
    path = OUT / "T21_teacher_answer_book.pdf"
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("T21 教师答案册")
    draw_intro_pages(c, puzzles, pedagogy)
    records = []
    for idx, puzzle in enumerate(puzzles, 4):
        records.append(draw_teacher_puzzle(c, puzzle, pedagogy[puzzle["id"]], idx))
        c.showPage()
    c.save()
    return records


def svg_lines(text: str, max_chars: int) -> list[str]:
    out = []
    for raw in str(text).splitlines() or [""]:
        while len(raw) > max_chars:
            out.append(raw[:max_chars])
            raw = raw[max_chars:]
        out.append(raw)
    return out


def svg_text(text: str, x: float, y: float, size: float, max_chars: int, leading: float, color: str = "#1D3035", max_lines: int | None = None) -> tuple[str, float]:
    lines = svg_lines(text, max_chars)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1][:-1] + "…"
    spans = "".join(f'<tspan x="{x}" y="{y + i * leading}">{html.escape(line)}</tspan>' for i, line in enumerate(lines))
    return f'<text font-family="Arial Unicode MS, PingFang SC, sans-serif" font-size="{size}" fill="{color}">{spans}</text>', y + len(lines) * leading


def svg_board(puzzle: dict[str, Any], left: float, top: float, width: float) -> str:
    pos = puzzle["initialPosition"]
    n = pos["size"]
    targets = target_map(puzzle)
    margin = 20
    span = width - 2 * margin
    step = span / (n - 1)
    ox, oy = left + margin, top + margin
    parts = [f'<rect x="{left}" y="{top}" width="{width}" height="{width}" rx="5" fill="#F2D89A"/>', '<g stroke="#70695E" stroke-width="0.7">']
    for i in range(n):
        v, h = ox + i * step, oy + i * step
        parts += [f'<line x1="{v}" y1="{oy}" x2="{v}" y2="{oy + span}"/>', f'<line x1="{ox}" y1="{h}" x2="{ox + span}" y2="{h}"/>']
    parts.append('</g><g font-family="Arial Unicode MS, sans-serif" font-size="8" fill="#26373A" text-anchor="middle">')
    for i in range(n):
        parts += [f'<text x="{ox + i * step}" y="{top + width - 4}">{COLS[i]}</text>', f'<text x="{left + 9}" y="{oy + i * step + 3}">{n - i}</text>']
    parts.append("</g>")
    rad = min(10, step * 0.42)
    for stone in pos["stones"]:
        cx, cy = ox + stone["col"] * step, oy + stone["row"] * step
        fill = "#151B1D" if stone["color"] == "B" else "#FFFFFF"
        parts.append(f'<circle data-row="{stone["row"]}" data-col="{stone["col"]}" data-color="{stone["color"]}" cx="{cx}" cy="{cy}" r="{rad}" fill="{fill}" stroke="#151B1D"/>')
        mark = targets.get((stone["row"], stone["col"]))
        if mark:
            tc = "#FFFFFF" if stone["color"] == "B" else "#151B1D"
            parts.append(f'<text x="{cx}" y="{cy + 3}" text-anchor="middle" font-family="Arial Unicode MS" font-size="8" fill="{tc}">{mark}</text>')
    return "".join(parts)


def build_editable_svg(puzzle: dict[str, Any], pedagogical: dict[str, Any], teacher_page: int, side: str) -> None:
    _, _, color = CATEGORY[puzzle["category"]]
    cat = CATEGORY[puzzle["category"]]
    title = f"{puzzle['id']} r{puzzle['revision']} | {cat[0]} {cat[1]}"
    metadata = {
        "schemaVersion": 1,
        "id": f"T21-{side.upper()}-{puzzle['id']}",
        "revision": puzzle["revision"],
        "rulesetId": RULESET,
        "contentRef": {"id": puzzle["id"], "revision": puzzle["revision"]},
    }
    pieces = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="148.5mm" viewBox="0 0 595.276 420.945">',
        f'<title>{html.escape(title)} {"背面" if side == "back" else "正面"}</title>',
        f'<metadata>{html.escape(json.dumps(metadata, ensure_ascii=False))}</metadata>',
        '<rect width="595.276" height="420.945" fill="#FFFFFF" stroke="#9EA8A6"/>',
        f'<rect width="595.276" height="28" fill="{color}"/>',
        f'<text x="22" y="19" font-family="Arial Unicode MS, PingFang SC, sans-serif" font-size="12.5" fill="#FFFFFF">{html.escape(title)}</text>',
        f'<text x="22" y="50" font-family="Arial Unicode MS, PingFang SC, sans-serif" font-size="13.5" fill="#1D3035">{html.escape(pedagogical["title"])}</text>',
    ]
    if side == "front":
        pieces.append(svg_board(puzzle, 18, 79, 232))
        y = 82
        for content, size, chars, lead, lines, col in [
            (f"谁先 / 轮次：{player(puzzle['firstPlayer'])}", 9.5, 26, 14, 2, color),
            ("具体任务", 9.2, 26, 14, 1, "#13766D"),
            (puzzle["prompt"], 11, 22, 16, 5, "#1D3035"),
            ("必要条件", 9.2, 26, 14, 1, "#13766D"),
            (front_conditions(puzzle), 8.2, 29, 12, 8, "#1D3035"),
        ]:
            s, y = svg_text(content, 268, y, size, chars, lead, col, lines)
            pieces.append(s)
            y += 5
        pieces.append('<text x="25" y="379" font-family="Arial Unicode MS" font-size="7.6" fill="#44555A">完整棋盘 · 坐标列跳过 I · 数字为目标</text>')
    else:
        y = 83
        s, y = svg_text("三层提示", 22, y, 10, 23, 14, "#13766D")
        pieces.append(s)
        for i, hint in enumerate(puzzle["hints"], 1):
            s, y = svg_text(f"{i}. {hint}", 22, y + 4, 8.7, 28, 12.5, "#1D3035", 3)
            pieces.append(s)
        s, y = svg_text("常见错误", 22, y + 8, 10, 23, 14, "#A44A3F")
        pieces.append(s)
        s, y = svg_text(pedagogical["commonErrors"], 22, y + 3, 8.2, 30, 11.8, "#1D3035", 6)
        pieces.append(s)
        heading = "合理讨论方向" if puzzle["answer"]["type"] == "open-text" else "正确答案"
        y2 = 83
        s, y2 = svg_text(heading, 296, y2, 10, 25, 14, "#13766D")
        pieces.append(s)
        s, y2 = svg_text(answer_summary(puzzle, pedagogical), 296, y2 + 4, 8.2, 30, 11.7, "#1D3035", 10)
        pieces.append(s)
        pieces.append(f'<text x="22" y="386" font-family="Arial Unicode MS" font-size="8.5" fill="#5A6B9F">教师详解：答案册第 {teacher_page} 页</text>')
    pieces.append("</svg>")
    (EDITABLE / side / f"{puzzle['id']}-{side}.svg").write_text("\n".join(pieces), encoding="utf-8")


def verify_freeze() -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    freeze = json.loads(FREEZE_PATH.read_text(encoding="utf-8"))
    assert freeze["freezeId"] == FREEZE_ID_EXPECTED
    assert freeze["rulesetId"] == RULESET
    assert freeze["schemaVersion"] == SCHEMA
    assert len(freeze["puzzles"]) == 30
    errors = []
    puzzles = []
    for item in freeze["puzzles"]:
        path = PROJECT / item["path"]
        diagram = PROJECT / item["diagram"]["path"]
        if sha256(path) != item["sha256"]:
            errors.append(f"hash mismatch {item['path']}")
        if sha256(diagram) != item["diagram"]["sha256"]:
            errors.append(f"diagram hash mismatch {item['diagram']['path']}")
        data = json.loads(path.read_text(encoding="utf-8"))
        for key, expected in (("id", item["id"]), ("revision", item["revision"]), ("rulesetId", RULESET), ("schemaVersion", SCHEMA)):
            if data[key] != expected:
                errors.append(f"{item['id']} {key}: {data[key]} != {expected}")
        puzzles.append(data)
    if sha256(PROJECT / freeze["bundle"]["path"]) != freeze["bundle"]["sha256"]:
        errors.append("bundle hash mismatch")
    if errors:
        raise ValueError("Freeze verification failed:\n" + "\n".join(errors))
    count = Counter(p["category"] for p in puzzles)
    assert count == Counter({k: 5 for k in CATEGORY})
    pedagogical_doc = json.loads((CONTENT / "t09" / "pedagogy.json").read_text(encoding="utf-8"))
    pedagogy = pedagogical_doc["items"]
    assert set(pedagogy) >= {p["id"] for p in puzzles}
    return freeze, puzzles, pedagogy


def copy_frozen_inputs(freeze: dict[str, Any], puzzles: list[dict[str, Any]]) -> None:
    (FROZEN / "puzzles").mkdir(parents=True, exist_ok=True)
    for item in freeze["puzzles"]:
        shutil.copy2(PROJECT / item["path"], FROZEN / "puzzles" / f"{item['id']}.json")
    for src, dst in (
        (FREEZE_PATH, FROZEN / "CONTENT_FREEZE.json"),
        (CONTENT / "t09" / "pedagogy.json", FROZEN / "pedagogy.json"),
        (CONTENT / "t09" / "bundle.json", FROZEN / "bundle.json"),
    ):
        shutil.copy2(src, dst)


def build_index(puzzles: list[dict[str, Any]], pedagogy: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for i, p in enumerate(puzzles):
        rows.append({
            "id": p["id"],
            "revision": p["revision"],
            "category": p["category"],
            "categoryLabel": CATEGORY[p["category"]][0],
            "difficulty": p["difficulty"]["level"],
            "difficultyLabel": DIFFICULTY[p["difficulty"]["level"]][0],
            "frontPdfPage": i // 2 + 1,
            "frontPosition": "top" if i % 2 == 0 else "bottom",
            "backPdfPage": i // 2 + 1,
            "backPosition": "top" if i % 2 == 0 else "bottom",
            "teacherPage": i + 4,
            "title": pedagogy[p["id"]]["title"],
            "rulesetId": RULESET,
            "schemaVersion": SCHEMA,
            "freezeId": FREEZE_ID_EXPECTED,
        })
    dump_json(MATERIAL / "CARD_INDEX.json", {"schemaVersion": 1, "id": "T21-CARD-INDEX", "revision": 1, "rulesetId": RULESET, "freezeId": FREEZE_ID_EXPECTED, "items": rows})
    with (MATERIAL / "CARD_INDEX.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return rows


def validate_outputs(puzzles: list[dict[str, Any]], index: list[dict[str, Any]], teacher_records: list[dict[str, Any]]) -> dict[str, Any]:
    checks = []
    def check(name: str, ok: bool, evidence: Any) -> None:
        checks.append({"check": name, "status": "passed" if ok else "failed", "evidence": evidence})
        if not ok:
            raise AssertionError(f"{name}: {evidence}")

    check("exactly-30", len(puzzles) == 30, len(puzzles))
    counts = Counter(p["category"] for p in puzzles)
    check("six-categories-five-each", counts == Counter({k: 5 for k in CATEGORY}), dict(counts))
    check("unique-id", len({p["id"] for p in puzzles}) == 30, [p["id"] for p in puzzles])
    check("all-revision-one", all(p["revision"] == 1 for p in puzzles), sorted({p["revision"] for p in puzzles}))
    check("discussion-five-open", all(p["answer"]["type"] == "open-text" and p["answer"]["automaticVerdict"] is False for p in puzzles if p["category"] == "DISC"), 5)
    check("duplex-map-identical", all(r["frontPdfPage"] == r["backPdfPage"] and r["frontPosition"] == r["backPosition"] for r in index), "same page and top/bottom")
    check("teacher-map", [r["page"] for r in teacher_records] == list(range(4, 34)), [r["page"] for r in teacher_records])
    pdf_texts: dict[str, str] = {}
    for file, pages in ((OUT / "T21_challenge_cards_front_A4.pdf", 15), (OUT / "T21_challenge_cards_back_A4.pdf", 15), (OUT / "T21_teacher_answer_book.pdf", 33)):
        reader = PdfReader(str(file))
        check(f"pdf-pages-{file.stem}", len(reader.pages) == pages, len(reader.pages))
        dims = [(float(p.mediabox.width), float(p.mediabox.height)) for p in reader.pages]
        check(f"pdf-a4-{file.stem}", all(abs(w - W) < 0.2 and abs(h - H) < 0.2 for w, h in dims), dims[0])
        text = "\n".join(p.extract_text() or "" for p in reader.pages)
        pdf_texts[file.stem] = text
        check(f"pdf-all-ids-{file.stem}", all(p["id"] in text for p in puzzles), "30 IDs present")
    normalize = lambda value: re.sub(r"\s+", "", value)
    front_norm = normalize(pdf_texts["T21_challenge_cards_front_A4"])
    teacher_norm = normalize(pdf_texts["T21_teacher_answer_book"])
    check("front-prompts-match-json", all(normalize(p["prompt"]) in front_norm for p in puzzles), "30 exact prompts after whitespace normalization")
    check("teacher-prompts-match-json", all(normalize(p["prompt"]) in teacher_norm for p in puzzles), "30 exact prompts after whitespace normalization")
    test_reader = PdfReader(str(OUT / "T21_duplex_test_page1.pdf"))
    test_text = "\n".join(p.extract_text() or "" for p in test_reader.pages)
    check("duplex-test-two-pages", len(test_reader.pages) == 2, len(test_reader.pages))
    check("duplex-test-pair", all(x in test_text for x in ("LIB-001", "LIB-002")), "front/back pair IDs present")
    check("svg-front-30", len(list((EDITABLE / "front").glob("*.svg"))) == 30, 30)
    check("svg-back-30", len(list((EDITABLE / "back").glob("*.svg"))) == 30, 30)
    bundle = json.loads((FROZEN / "bundle.json").read_text(encoding="utf-8"))
    bundle_items = {item["id"]: item for item in bundle["items"] if item.get("kind") == "Puzzle"}
    check("bundle-has-30-puzzles", len(bundle_items) == 30, len(bundle_items))
    check("bundle-puzzles-byte-model-equal", all(bundle_items[p["id"]] == p for p in puzzles), "30 full puzzle objects equal")
    for p in puzzles:
        src = (FROZEN / "puzzles" / f"{p['id']}.json").read_text(encoding="utf-8")
        check(f"snapshot-{p['id']}", json.loads(src) == p, "byte source parsed equal")
        tree = ET.parse(EDITABLE / "front" / f"{p['id']}-front.svg")
        svg_stones = {
            (int(node.attrib["data-row"]), int(node.attrib["data-col"]), node.attrib["data-color"])
            for node in tree.getroot().iter("{http://www.w3.org/2000/svg}circle")
            if "data-row" in node.attrib
        }
        json_stones = {(s["row"], s["col"], s["color"]) for s in p["initialPosition"]["stones"]}
        check(f"svg-points-{p['id']}", svg_stones == json_stones, {"svg": len(svg_stones), "json": len(json_stones)})
    result = {"schemaVersion": 1, "id": "T21-AUTOMATED-CHECKS", "revision": 1, "rulesetId": RULESET, "freezeId": FREEZE_ID_EXPECTED, "status": "passed", "checks": checks, "checkCount": len(checks)}
    dump_json(VALIDATION / "automated-checks.json", result)
    return result


def write_manifests(index: list[dict[str, Any]], teacher_records: list[dict[str, Any]], checks: dict[str, Any]) -> None:
    page_map = {"schemaVersion": 1, "id": "T21-PAGE-MAP", "revision": 1, "rulesetId": RULESET, "freezeId": FREEZE_ID_EXPECTED, "duplexMode": "A4 portrait, long-edge flip", "cardPages": index, "teacherPages": teacher_records}
    dump_json(VALIDATION / "page-map.json", page_map)
    files = []
    for p in sorted(MATERIAL.rglob("*")):
        if p.is_file() and p.name not in {"FILE_MANIFEST.json", "SHA256SUMS.txt"} and "rendered" not in p.parts:
            files.append({"path": p.relative_to(MATERIAL).as_posix(), "bytes": p.stat().st_size, "sha256": sha256(p)})
    dump_json(MATERIAL / "FILE_MANIFEST.json", {"schemaVersion": 1, "id": "T21-FILE-MANIFEST", "revision": 1, "rulesetId": RULESET, "resultVersion": RESULT_VERSION, "files": files})
    lines = [f"{f['sha256']}  {f['path']}" for f in files]
    (MATERIAL / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    for d in (OUT, EDITABLE / "front", EDITABLE / "back", VALIDATION, FROZEN / "puzzles"):
        d.mkdir(parents=True, exist_ok=True)
    freeze, puzzles, pedagogy = verify_freeze()
    copy_frozen_inputs(freeze, puzzles)
    index = build_index(puzzles, pedagogy)
    page_map = {r["id"]: r["teacherPage"] for r in index}
    for puzzle in puzzles:
        build_editable_svg(puzzle, pedagogy[puzzle["id"]], page_map[puzzle["id"]], "front")
        build_editable_svg(puzzle, pedagogy[puzzle["id"]], page_map[puzzle["id"]], "back")
    build_card_pdfs(puzzles, pedagogy, page_map)
    build_duplex_test_pdf()
    teacher_records = build_teacher_pdf(puzzles, pedagogy)
    checks = validate_outputs(puzzles, index, teacher_records)
    write_manifests(index, teacher_records, checks)
    print(f"Built 30 cards, 60 editable SVGs, 30 duplex PDF pages and {len(teacher_records) + 3} teacher pages.")


if __name__ == "__main__":
    main()

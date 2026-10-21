#!/usr/bin/env python3
"""Verify T19 page geometry, coordinate order, token counts, and PDF page boxes."""

from __future__ import annotations

import importlib.util
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output"
REPORT = ROOT / "qa" / "geometry-report.json"
NS = {"svg": "http://www.w3.org/2000/svg"}


def load_generator():
    path = Path(__file__).with_name("generate_pair_boards.py")
    spec = importlib.util.spec_from_file_location("t19_generator", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def mm_from_pdf(value) -> float:
    return float(value) * 25.4 / 72


def classes(node) -> set[str]:
    return set(node.attrib.get("class", "").split())


def check_pdf_size(path: Path, width: float, height: float, pages: int = 1):
    reader = PdfReader(str(path))
    assert len(reader.pages) == pages, f"{path}: expected {pages} pages, got {len(reader.pages)}"
    for idx, page in enumerate(reader.pages, start=1):
        actual_w = mm_from_pdf(page.mediabox.width)
        actual_h = mm_from_pdf(page.mediabox.height)
        assert math.isclose(actual_w, width, abs_tol=0.03), (path, idx, actual_w, width)
        assert math.isclose(actual_h, height, abs_tol=0.03), (path, idx, actual_h, height)
    return {"file": str(path.relative_to(ROOT)), "pages": pages, "pageMm": [width, height], "status": "pass"}


def check_board_svg(path: Path, spec, coordinates: bool, labels_fn):
    tree = ET.parse(path)
    root = tree.getroot()
    assert root.attrib["width"] == f"{spec.page_w}mm"
    assert root.attrib["height"] == f"{spec.page_h}mm"
    metadata = json.loads(root.find("svg:metadata", NS).text)
    assert metadata["rulesetId"] == "GO-CLUB-AREA-1"
    assert metadata["schemaVersion"] == 1
    assert metadata["boardSize"] == spec.size
    assert metadata["spacingMm"] == spec.spacing
    assert metadata["coordinates"] is coordinates

    lines = root.findall(".//svg:line", NS)
    vertical = [node for node in lines if {"grid-line", "vertical"}.issubset(classes(node))]
    horizontal = [node for node in lines if {"grid-line", "horizontal"}.issubset(classes(node))]
    assert len(vertical) == spec.size, f"{path}: vertical line count {len(vertical)}"
    assert len(horizontal) == spec.size, f"{path}: horizontal line count {len(horizontal)}"

    vx = [round(float(node.attrib["x1"]), 3) for node in vertical]
    hy = [round(float(node.attrib["y1"]), 3) for node in horizontal]
    expected_x = [round(spec.grid_x + n * spec.spacing, 3) for n in range(spec.size)]
    expected_y = [round(spec.grid_y + n * spec.spacing, 3) for n in range(spec.size)]
    assert vx == expected_x, (path, vx, expected_x)
    assert hy == expected_y, (path, hy, expected_y)

    texts = root.findall(".//svg:text", NS)
    col_top = [node.text for node in texts if {"coordinate", "column", "top"}.issubset(classes(node))]
    row_left = [node.text for node in texts if {"coordinate", "row", "left"}.issubset(classes(node))]
    if coordinates:
        assert col_top == labels_fn(spec.size), (path, col_top)
        assert row_left == [str(n) for n in range(spec.size, 0, -1)], (path, row_left)
    else:
        assert col_top == [] and row_left == [], f"{path}: coordinate labels found in plain board"

    assert spec.spacing - spec.stone_max >= 2, f"{path}: less than 2 mm nominal clearance"
    assert spec.panel_x >= 10 and spec.panel_y >= 10
    assert spec.panel_x + spec.panel_w <= spec.page_w - 10
    assert spec.panel_y + spec.panel_h <= spec.page_h - 10
    assert spec.info_x + spec.info_w <= spec.page_w - 10

    return {
        "file": str(path.relative_to(ROOT)),
        "status": "pass",
        "boardSize": spec.size,
        "gridLines": {"vertical": len(vertical), "horizontal": len(horizontal)},
        "spacingMm": spec.spacing,
        "stoneDiameterMm": [spec.stone_min, spec.stone_max],
        "minimumNominalGapMm": spec.spacing - spec.stone_max,
        "coordinates": coordinates,
        "topColumns": col_top,
        "leftRows": row_left,
        "safePanelMarginMm": 10,
    }


def check_token_svg(path: Path, color: str, diameter: int, count: int):
    root = ET.parse(path).getroot()
    nodes = [n for n in root.findall(".//svg:circle", NS) if {"paper-stone", color}.issubset(classes(n))]
    assert len(nodes) == count, (path, len(nodes), count)
    radii = {round(float(n.attrib["r"]), 3) for n in nodes}
    assert radii == {diameter / 2}, (path, radii)
    metadata = json.loads(root.find("svg:metadata", NS).text)
    assert metadata["count"] == count and metadata["diameterMm"] == diameter
    return {"file": str(path.relative_to(ROOT)), "status": "pass", "color": color,
            "diameterMm": diameter, "count": count}


def check_overlay_svg(path: Path, spec):
    root = ET.parse(path).getroot()
    lines = [n for n in root.findall(".//svg:line", NS) if "overlay-alignment" in classes(n)]
    rings = [n for n in root.findall(".//svg:circle", NS) if "overlay-alignment-ring" in classes(n)]
    grid_lines = [n for n in root.findall(".//svg:line", NS) if "grid-line" in classes(n)]
    assert len(lines) == 8 and len(rings) == 4 and len(grid_lines) == 0
    metadata = json.loads(root.find("svg:metadata", NS).text)
    assert metadata["containsAnswers"] is False
    if spec.page_w == 210:
        text = ''.join(root.itertext())
        assert f'与 {spec.size}×{spec.size} A4 棋盘' in text, f'{path}: incorrect matching board label'
    if spec.key == '13x13-a4':
        assert metadata['revision'] == 2 and metadata['resultVersion'] == '0.2.1-t19.2'
    return {"file": str(path.relative_to(ROOT)), "status": "pass", "alignmentLines": 8,
            "alignmentRings": 4, "printedGridLines": 0, "containsAnswers": False}


def main():
    gen = load_generator()
    checks = []
    for spec in gen.SPECS.values():
        for coordinates in [True, False]:
            suffix = "coordinates" if coordinates else "plain"
            base = OUT / "boards" / f"go-board_{spec.key}_{suffix}"
            checks.append(check_board_svg(base.with_suffix(".svg"), spec, coordinates, gen.column_labels))
            checks.append(check_pdf_size(base.with_suffix(".pdf"), spec.page_w, spec.page_h))
        overlay = OUT / "overlays" / f"liberty-overlay_{spec.key}"
        checks.append(check_overlay_svg(overlay.with_suffix(".svg"), spec))
        checks.append(check_pdf_size(overlay.with_suffix(".pdf"), spec.page_w, spec.page_h))

    for spec in [gen.SPECS["9x9-a3"], gen.SPECS["13x13-a3"]]:
        for coordinates in [True, False]:
            suffix = "coordinates" if coordinates else "plain"
            path = OUT / "boards" / f"go-board_{spec.key}_{suffix}_tiled-A4.pdf"
            checks.append(check_pdf_size(path, 210, 297, pages=2))

    for diameter, count in [(18, 90), (12, 169)]:
        for color in ["black", "white"]:
            base = OUT / "portable-kit" / f"paper-stones_{diameter}mm_{color}_{count}"
            checks.append(check_token_svg(base.with_suffix(".svg"), color, diameter, count))
            checks.append(check_pdf_size(base.with_suffix(".pdf"), 210, 297))

    for path, pages in [
        (OUT / "portable-kit" / "paper-stones_18mm_black-white_180.pdf", 2),
        (OUT / "portable-kit" / "paper-stones_12mm_black-white_338.pdf", 2),
        (OUT / "portable-kit" / "storage-labels_A4.pdf", 1),
        (OUT / "portable-kit" / "loan-return-checklist_A4.pdf", 1),
        (OUT / "portable-kit" / "portable-kit-layout_A4.pdf", 1),
    ]:
        checks.append(check_pdf_size(path, 210, 297, pages))

    for path, width, height, pages in [
        (OUT / "print-pack_9x9-A4-portable-kit.pdf", 210, 297, 7),
        (OUT / "print-pack_13x13-A3-extension.pdf", 420, 297, 2),
        (OUT / "print-pack_13x13-A4-small-extension.pdf", 210, 297, 4),
    ]:
        checks.append(check_pdf_size(path, width, height, pages))

    report = {
        "schemaVersion": 1,
        "id": "T19-GEOMETRY-REPORT",
        "revision": 2,
        "rulesetId": "GO-CLUB-AREA-1",
        "resultVersion": "0.2.1-t19.2",
        "status": "pass",
        "checkCount": len(checks),
        "checks": checks,
        "notes": [
            "Panel and information regions are at least 10 mm from page edges.",
            "Nominal stone-to-spacing gap is at least 2 mm for every supplied board.",
            "Physical printer accuracy, cutting, lamination, marker erasability, and durability require later real-world testing.",
        ],
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: {len(checks)} geometry and document checks")
    print(REPORT)


if __name__ == "__main__":
    main()

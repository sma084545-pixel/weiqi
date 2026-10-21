#!/usr/bin/env python3
"""Render every T21 PDF page, record geometry, and create review contact sheets."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "output"
QA = ROOT / "validation"
RENDERED = QA / "rendered"
CONTACT = QA / "contact-sheets"

PDFS = {
    "front": OUT / "T21_challenge_cards_front_A4.pdf",
    "back": OUT / "T21_challenge_cards_back_A4.pdf",
    "teacher": OUT / "T21_teacher_answer_book.pdf",
}


def dump(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def image_record(path: Path, expected_w: int, expected_h: int) -> dict[str, object]:
    image = Image.open(path).convert("RGB")
    white = Image.new("RGB", image.size, "white")
    bbox = ImageChops.difference(image, white).getbbox()
    margin = None
    if bbox:
        margin = {"left": bbox[0], "top": bbox[1], "right": image.width - bbox[2], "bottom": image.height - bbox[3]}
    return {
        "file": path.name,
        "pixelSize": [image.width, image.height],
        "expectedPixelSize": [expected_w, expected_h],
        "nonBlankBBox": list(bbox) if bbox else None,
        "nonBlankMarginsPx": margin,
        "status": "passed" if image.size == (expected_w, expected_h) and bbox else "failed",
    }


def make_contacts(name: str, images: list[Path], per_sheet: int = 4, grayscale: bool = False) -> list[str]:
    outputs = []
    for start in range(0, len(images), per_sheet):
        batch = images[start:start + per_sheet]
        thumbs = []
        for p in batch:
            im = Image.open(p).convert("L" if grayscale else "RGB")
            if grayscale:
                im = im.convert("RGB")
            im.thumbnail((900, 1273))
            canvas = Image.new("RGB", (940, 1335), "#e7eceb")
            canvas.paste(im, ((940 - im.width) // 2, 42))
            draw = ImageDraw.Draw(canvas)
            draw.text((24, 12), p.stem, fill="#173e42")
            thumbs.append(canvas)
        sheet = Image.new("RGB", (1880, 2670), "white")
        for i, im in enumerate(thumbs):
            sheet.paste(im, ((i % 2) * 940, (i // 2) * 1335))
        out = CONTACT / f"{name}-{start + 1:02d}-{start + len(batch):02d}.jpg"
        sheet.save(out, quality=88, optimize=True)
        outputs.append(out.name)
    return outputs


def main() -> None:
    if RENDERED.exists():
        shutil.rmtree(RENDERED)
    if CONTACT.exists():
        shutil.rmtree(CONTACT)
    RENDERED.mkdir(parents=True)
    CONTACT.mkdir(parents=True)
    report = {
        "schemaVersion": 1,
        "id": "T21-PDF-RENDER-QA",
        "revision": 1,
        "rulesetId": "GO-CLUB-AREA-1",
        "renderDpi": 144,
        "status": "passed",
        "pdfs": {},
        "reviewBoundary": "Automated geometry and nonblank checks; assistant visual contact-sheet review is recorded separately. Physical printing remains untested.",
    }
    for name, pdf in PDFS.items():
        target = RENDERED / name
        target.mkdir()
        prefix = target / name
        run = subprocess.run(["pdftoppm", "-png", "-r", "144", str(pdf), str(prefix)], capture_output=True, text=True)
        if run.returncode:
            raise SystemExit(run.stderr)
        images = sorted(target.glob("*.png"))
        reader = PdfReader(str(pdf))
        pages = [image_record(path, 1191, 1684) for path in images]
        ok = len(images) == len(reader.pages) and all(p["status"] == "passed" for p in pages)
        report["pdfs"][name] = {
            "path": pdf.relative_to(ROOT).as_posix(),
            "pdfPages": len(reader.pages),
            "renderedPages": len(images),
            "pageSizePoints": [float(reader.pages[0].mediabox.width), float(reader.pages[0].mediabox.height)],
            "pages": pages,
            "contactSheets": make_contacts(name, images),
            "status": "passed" if ok else "failed",
        }
        if name in {"front", "back"}:
            report["pdfs"][name]["grayscaleContactSheets"] = make_contacts(name + "-gray", images, grayscale=True)
        if not ok:
            report["status"] = "failed"
    dump(QA / "render-qa.json", report)
    if report["status"] != "passed":
        raise SystemExit("Render QA failed")
    print("Rendered and indexed 63 A4 pages; contact sheets created.")


if __name__ == "__main__":
    main()

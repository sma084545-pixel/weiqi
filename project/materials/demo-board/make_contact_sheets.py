#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent / "qa" / "rendered"

def make(pattern: str, output: str, columns: int, thumb=(360, 510)):
    files = sorted(ROOT.glob(pattern))
    if not files:
        raise SystemExit(f"No files for {pattern}")
    rows = (len(files) + columns - 1) // columns
    cell_w, cell_h = thumb[0] + 24, thumb[1] + 44
    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), "#d7ddd9")
    d = ImageDraw.Draw(sheet)
    for i, path in enumerate(files):
        img = Image.open(path).convert("RGB")
        img.thumbnail(thumb)
        x = (i % columns) * cell_w + (cell_w - img.width) // 2
        y = (i // columns) * cell_h + 22
        sheet.paste(img, (x, y))
        d.text((i % columns * cell_w + 8, i // columns * cell_h + 4), path.stem, fill="#18211c")
    sheet.save(ROOT.parent / output, quality=92)

make("tiles-color-*.png", "tiles-color-contact.jpg", 3)
make("tiles-gray-*.png", "tiles-gray-contact.jpg", 3)
make("pieces-color-*.png", "pieces-color-contact.jpg", 3)
make("pieces-gray-*.png", "pieces-gray-contact.jpg", 3)
make("guide-*.png", "guide-contact.jpg", 4, (300, 425))
make("teaching-*.png", "teaching-contact.jpg", 1, (1000, 710))
make("board-1to1-*.png", "board-contact.jpg", 1, (900, 900))

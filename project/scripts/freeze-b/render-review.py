"""Render the unchanged T09/T20 PDFs for FREEZE_B visual review (Poppler/Pillow)."""
from pathlib import Path
import json, os, subprocess
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/freeze-b/evidence/rendered'
OUT.mkdir(parents=True, exist_ok=True)
env = os.environ.copy()
env['XDG_CACHE_HOME'] = '/tmp/freeze-b-cache'
Path('/tmp/freeze-b-cache/fontconfig').mkdir(parents=True, exist_ok=True)
sources = [
    ('T09-questions', 'content/print/T09_挑战卡_A4.pdf', 18),
    ('T09-answers', 'content/print/T09_答案册.pdf', 36),
    ('T20-cards', 'materials/rule-cards/pdf/all-independent-cards.pdf', 8),
    ('T20-A4', 'materials/rule-cards/pdf/PRINT-A4-landscape-short-edge.pdf', 6),
    ('T20-mini', 'materials/rule-cards/pdf/PRINT-A4-portrait-long-edge-mini.pdf', 2),
]
report = []
for label, source, count in sources:
    command = ['pdftoppm', '-r', '100', '-png', str(ROOT/source), str(OUT/label)]
    result = subprocess.run(command, env=env, capture_output=True, text=True)
    pages = sorted(OUT.glob(label+'-[0-9]*.png'))
    assert result.returncode == 0 and len(pages) == count, (label, result.stderr)
    # Small contact sheets are review aids; individual full pages remain available.
    for start in range(0, count, 6):
        batch = pages[start:start+6]
        sheet = Image.new('RGB', (1800, 1750), '#d8d8d8')
        draw = ImageDraw.Draw(sheet)
        for i, page in enumerate(batch):
            thumb = ImageOps.contain(Image.open(page).convert('RGB'), (585, 835))
            x = (i%3)*600+(600-thumb.width)//2
            y = (i//3)*875+25
            draw.text(((i%3)*600+12, (i//3)*875+6), page.name, fill='black')
            sheet.paste(thumb, (x, y))
        sheet.save(OUT/f'{label}-contact-{start//6+1}.jpg', quality=90)
    if label.startswith('T20'):
        for page in pages:
            ImageOps.grayscale(Image.open(page)).save(OUT/(page.stem+'-gray.jpg'))
    report.append({'source':source, 'pages':count, 'status':'rendered',
                   'command':'pdftoppm -r 100 -png '+source+' <output-prefix>',
                   'stderr':result.stderr})
(OUT.parent/'render-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print('Rendered 70 PDF pages; contact sheets and T20 grayscale pages written.')

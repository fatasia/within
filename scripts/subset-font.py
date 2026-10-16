"""Build the self-hosted UI font from the OFL-licensed Noto Serif SC source."""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
text = ''.join(p.read_text(encoding='utf-8') for p in (ROOT / 'src').rglob('*')
               if p.suffix in {'.ts', '.tsx', '.css'})
required = {ord(c) for c in text if '\u3400' <= c <= '\u9fff'}
output = ROOT / 'public/fonts/landscape-serif.woff2'
if '--check' in sys.argv:
    with TTFont(output) as current:
        missing = required - current.getBestCmap().keys()
    if missing:
        raise SystemExit('Missing UI glyphs: ' + ''.join(chr(c) for c in sorted(missing)))
    print(f'Font coverage passed: {len(required)} Chinese characters')
    raise SystemExit(0)
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
font = TTFont(ROOT / 'artifacts/font-source/NotoSerifSC.ttf')
missing = required - font.getBestCmap().keys()
if missing:
    raise SystemExit('Source font lacks: ' + ''.join(chr(c) for c in sorted(missing)))
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=set(map(ord, text)) | set(range(32, 256)))
subsetter.subset(font)
font.flavor = 'woff2'
font.save(ROOT / 'public/fonts/landscape-serif.woff2')
print('Built public/fonts/landscape-serif.woff2')

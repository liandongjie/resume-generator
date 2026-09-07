from __future__ import annotations
import hashlib,json,subprocess,sys
from pathlib import Path

if len(sys.argv) != 4: raise SystemExit('usage: check_repeatability.py FIRST_PDF SECOND_PDF REPORT_JSON')
first,second,report_path=map(lambda value: Path(value).resolve(),sys.argv[1:])
work=first.parent/'rendered'
work.mkdir(parents=True,exist_ok=True)

def render(pdf: Path, name: str) -> list[Path]:
    prefix=work/name
    for page in (prefix.with_name(f'{name}-1.png'),prefix.with_name(f'{name}-2.png')): page.unlink(missing_ok=True)
    subprocess.run(['pdftoppm','-png','-r','144',str(pdf),str(prefix)],check=True,stdout=subprocess.DEVNULL)
    pages=sorted(work.glob(f'{name}-*.png'))
    if len(pages) != 2: raise SystemExit(f'Repeatability render expected 2 pages for {pdf}, got {len(pages)}')
    return pages

first_pages,second_pages=render(first,'first'),render(second,'second')
hashes=lambda pages: [hashlib.sha256(page.read_bytes()).hexdigest() for page in pages]
first_hashes,second_hashes=hashes(first_pages),hashes(second_pages)
report={
    'page1PixelIdentical':first_hashes[0]==second_hashes[0], 'page1Sha256':second_hashes[0],
    'page2PixelIdentical':first_hashes[1]==second_hashes[1], 'page2Sha256':second_hashes[1]
}
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
raise SystemExit(0 if all((report['page1PixelIdentical'],report['page2PixelIdentical'])) else 2)

from __future__ import annotations
import json, re, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_runtime import chromium_launch_options
if len(sys.argv)!=3: raise SystemExit('usage: render_pdf.py INPUT_HTML OUTPUT_PDF')
html=Path(sys.argv[1]).resolve(); out=Path(sys.argv[2]).resolve(); out.parent.mkdir(parents=True,exist_ok=True)
content=html.read_text(encoding='utf-8')
with sync_playwright() as pw:
    browser=pw.chromium.launch(**chromium_launch_options())
    page=browser.new_page(viewport={"width":794,"height":1123})
    page.set_content(content, wait_until='load', timeout=60000)
    page.emulate_media(media='print'); page.wait_for_timeout(150)
    result=page.evaluate('''() => ({errors:Number(document.body.dataset.layoutErrors||-1),issues:document.body.dataset.layoutIssueList||'',domPages:document.querySelectorAll('.page').length,page1:(()=>{const x=document.querySelector('.page1');const r=x.getBoundingClientRect();return {w:r.width,h:r.height}})()})''')
    if result['errors']!=0:
        print(json.dumps(result,ensure_ascii=False)); browser.close(); raise SystemExit(2)
    page.pdf(path=str(out),format='A4',print_background=True,prefer_css_page_size=True,margin={"top":"0","right":"0","bottom":"0","left":"0"})
    browser.close()
try:
    pdfinfo=subprocess.run(['pdfinfo',str(out)],check=True,capture_output=True).stdout
    pages=int(re.search(rb'^Pages:\s+(\d+)',pdfinfo,re.MULTILINE).group(1))
except Exception as exc:
    out.unlink(missing_ok=True)
    raise SystemExit(f'PDF page-count check failed: {exc}')
if pages != 2:
    out.unlink(missing_ok=True)
    raise SystemExit(f'PDF page count must be 2, got {pages}')
result['pages']=pages
print(json.dumps({**result,'pdf':str(out)},ensure_ascii=False))

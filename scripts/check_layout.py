from __future__ import annotations
import json,os,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
html=Path(sys.argv[1]).resolve(); content=html.read_text(encoding='utf-8')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={"width":794,"height":1123}); page.set_content(content,wait_until='load',timeout=60000); page.emulate_media(media='print');page.wait_for_timeout(100)
    result=page.evaluate("() => ({errors:Number(document.body.dataset.layoutErrors||-1),issues:document.body.dataset.layoutIssueList||''})"); browser.close()
print(json.dumps(result,ensure_ascii=False));raise SystemExit(0 if result['errors']==0 else 2)

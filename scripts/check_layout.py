from __future__ import annotations
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_runtime import chromium_launch_options

html=Path(sys.argv[1]).resolve(); content=html.read_text(encoding='utf-8')
with sync_playwright() as pw:
    browser=pw.chromium.launch(**chromium_launch_options())
    page=browser.new_page(viewport={"width":794,"height":1123})
    page.set_content(content,wait_until='load',timeout=60000)
    page.emulate_media(media='print')
    page.wait_for_timeout(100)
    result=page.evaluate('''() => {
      const issues=(document.body.dataset.layoutIssueList||'').split('|').filter(Boolean);
      const header=document.querySelector('.first-page-header')?.getBoundingClientRect();
      const flow=document.querySelector('.resume-flow')?.getBoundingClientRect();
      const logo=document.querySelector('.header-logo');
      const portrait=document.querySelector('.portrait')?.getBoundingClientRect();
      if (!header) issues.push('missing:first-page-header');
      if (!flow) issues.push('missing:resume-flow');
      if (header && flow && Math.abs(flow.top-header.bottom)>0.5) {
        issues.push(`header-flow-shift:${(flow.top-header.bottom).toFixed(2)}px`);
      }
      let logoBox=null;
      if (logo && header) {
        const style=getComputedStyle(logo);
        const r=logo.getBoundingClientRect();
        logoBox={left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,position:style.position};
        if (style.position!=='absolute') issues.push(`header-logo-position:${style.position}`);
        if (r.width<=0 || r.height<=0) issues.push('empty:header-logo');
        if (r.left<header.left-0.5 || r.right>header.right+0.5 || r.top<header.top-0.5 || r.bottom>header.bottom+0.5) {
          issues.push('header-logo-outside-header');
        }
        if (portrait && r.left<portrait.right && r.right>portrait.left && r.top<portrait.bottom && r.bottom>portrait.top) {
          issues.push('header-logo-overlap:portrait');
        }
      }
      return {
        errors:issues.length,
        issues:issues.join('|'),
        headerHeight:header?.height ?? null,
        headerFlowDelta:header&&flow ? flow.top-header.bottom : null,
        logo:logoBox
      };
    }''')
    browser.close()
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(0 if result['errors']==0 else 2)

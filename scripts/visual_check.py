from pathlib import Path
import subprocess, json, os
from PIL import Image, ImageChops, ImageStat
ROOT=Path(__file__).resolve().parents[1]
pdf=Path(os.environ.get('RESUME_PDF',ROOT/'output'/'resume-fintech.pdf'))
if not pdf.is_absolute(): pdf=ROOT/pdf
ref=ROOT/'baseline'/'wondercv-reference-page1.png'
outdir=ROOT/'tmp'/'rendered'
outdir.mkdir(parents=True,exist_ok=True)
subprocess.run(['pdftoppm','-png','-r','144',str(pdf),str(outdir/'page')],check=True,stdout=subprocess.DEVNULL)
gen=Image.open(outdir/'page-1.png').convert('RGB')
base=Image.open(ref).convert('RGB')
if gen.size != base.size: gen=gen.resize(base.size)
diff=ImageChops.difference(base,gen)
stat=ImageStat.Stat(diff)
mae=sum(stat.mean)/3
rms=(sum(v*v for v in stat.rms)/3)**0.5
# useful visual artifact, not a hard pixel-perfect gate because approved font differs from source PDF
blend=Image.blend(base,gen,0.5)
blend.save(ROOT/'output'/'page1-overlay.png')
diff.save(ROOT/'output'/'page1-diff.png')
report={'reference':str(ref.name),'generated':str(pdf.name),'size':base.size,'mae_0_255':round(mae,3),'rms_0_255':round(rms,3),'hardGate':False,'note':'Metric is diagnostic only because Noto Sans CJK SC is intentionally used instead of Microsoft YaHei.'}
(ROOT/'output'/'visual-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { escapeHtml, loadResume, renderInline } from './resume-schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { input: { type: 'string' } } });
const DATA = path.resolve(ROOT, values.input || 'data/base-fintech.yaml');
if (!DATA.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Input must be inside the project: ${DATA}`);
const TEMPLATE = path.join(ROOT, 'template', 'resume.html');
const CSS = path.join(ROOT, 'styles', 'resume.css');
const RENDERER = path.join(ROOT, 'scripts', 'render_pdf.py');
const OUT = path.join(ROOT, 'output');
const TMP = path.join(ROOT, 'tmp');

function requireFile(file: string, label: string): void {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Missing required ${label}: ${file}`);
}
function tags(values: string[] = []): string { return values.map(t => `<span class="tag">${renderInline(t)}</span>`).join(''); }
function bullets(values: string[] = [], start = 0, end?: number): string {
  const slice = values.slice(start, end);
  if (!slice.length) return '';
  return `<ul class="bullets">${slice.map(v => `<li data-guard="bullet">${renderInline(v)}</li>`).join('')}</ul>`;
}

requireFile(DATA, 'resume data');
requireFile(TEMPLATE, 'HTML template');
requireFile(CSS, 'stylesheet');
requireFile(RENDERER, 'PDF renderer');
const data = loadResume(DATA);
const p = data.profile;
const portraitPath = path.resolve(ROOT, p.portrait);
if (!portraitPath.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Portrait must be inside the project: ${p.portrait}`);
requireFile(portraitPath, 'portrait');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const education = data.education.map(e => `
  <div class="edu-item" data-guard="education-item">
    <div class="row-head"><div class="left"><span class="school">${renderInline(e.school)}</span>${tags(e.tags)}</div><div class="date">${renderInline(e.date)}</div></div>
    <div class="subrow"><div>${renderInline(e.degreeLine)}</div><div class="city">${renderInline(e.city || '')}</div></div>
    ${e.details.map(d => `<p class="detail">${d.label ? `<strong>${renderInline(d.label)}</strong>` : ''}${renderInline(d.text)}</p>`).join('')}
  </div>`).join('');
const skills = data.skills.map(s => `<p class="skill-row" data-guard="skill"><strong>${renderInline(s.label)}</strong>${renderInline(s.text)}</p>`).join('');

const expHtml = data.internships.map((e, idx) => {
  const page1End = Number.isInteger(e.page2BulletStart) ? e.page2BulletStart : undefined;
  return `<div class="exp-item ${idx>0?'compact':''}" data-guard="internship">
    <div class="row-head"><div class="company">${renderInline(e.company)}</div><div class="date">${renderInline(e.date)}</div></div>
    <div class="subrow"><div>${renderInline(e.role)}</div><div class="city">${renderInline(e.city || '')}</div></div>
    ${e.intro ? `<p class="intro">${renderInline(e.intro)}</p>` : ''}
    ${bullets(e.bullets, 0, page1End)}
  </div>`;
}).join('');

const page1 = `<section class="page page1" data-page="1">
  <div class="top-stripe"></div>
  <header class="header">
    <div class="name">${renderInline(p.name)}</div>
    <div class="header-line contact">${renderInline(p.phone)}&nbsp;&nbsp;|&nbsp;&nbsp;${renderInline(p.email)}&nbsp;&nbsp;|&nbsp;&nbsp;${renderInline(p.city)}</div>
    <div class="header-line portfolio">${renderInline(p.portfolio)}</div>
    <div class="header-line address">${renderInline(p.address)}</div>
    <div class="header-line status">${renderInline(p.status)}</div>
    <img class="portrait" src="../${escapeHtml(p.portrait)}" alt="portrait" />
  </header>
  <main class="page1-content">
    <section class="section education" data-guard="education-section"><div class="section-title">教育经历</div><div class="section-body">${education}</div></section>
    <section class="section skills" data-guard="skills-section"><div class="section-title">专业技能</div><div class="section-body">${skills}</div></section>
    <section class="section experience" data-guard="experience-section"><div class="section-title">实习经历</div><div class="section-body">${expHtml}</div></section>
  </main>
</section>`;

const continuations = data.internships.flatMap(e => Number.isInteger(e.page2BulletStart) ? e.bullets.slice(e.page2BulletStart) : []);
const projects = data.projects.map(proj => `<div class="project" data-guard="project">
  <div class="row-head"><div class="project-name">${renderInline(proj.name)}</div><div class="date">${renderInline(proj.date)}</div></div>
  ${proj.links.map(l => `<div class="link-row">${renderInline(l)}</div>`).join('')}
  <div class="stack-row">技术栈：${renderInline(proj.stack)}</div>
  <div class="intro">${renderInline(proj.intro)}</div>
  ${bullets(proj.bullets)}
</div>`).join('');
const page2 = `<section class="page page2" data-page="2">
  ${continuations.length ? `<div class="continuation">${bullets(continuations)}</div>` : ''}
  <div class="section-title">项目经历</div>
  ${projects}
</section>`;

const tpl = fs.readFileSync(TEMPLATE, 'utf8');
if (!tpl.includes('{{TITLE}}') || !tpl.includes('{{PAGES}}')) throw new Error('HTML template is missing required placeholders');
let html = tpl.replace('{{TITLE}}', `${escapeHtml(p.name)} - ${escapeHtml(data.meta.profile)}`).replace('{{PAGES}}', page1 + page2);
const css = fs.readFileSync(CSS,'utf8');
const portraitBytes = fs.readFileSync(portraitPath);
const portraitData = `data:image/png;base64,${portraitBytes.toString('base64')}`;
html = html.replace('<link rel="stylesheet" href="../styles/resume.css" />', `<style>${css}</style>`).replaceAll(`src="../${escapeHtml(p.portrait)}"`, `src="${portraitData}"`);
const htmlPath = path.join(TMP, 'resume.html');
fs.writeFileSync(htmlPath, html);

const pdf = process.env.RESUME_PDF ? path.resolve(ROOT, process.env.RESUME_PDF) : path.join(OUT, 'resume-fintech.pdf');
if (!pdf.startsWith(`${ROOT}${path.sep}`)) throw new Error(`RESUME_PDF must be inside the project: ${pdf}`);
try { fs.unlinkSync(pdf); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
let renderRaw = '';
try {
  renderRaw = execFileSync(process.env.PYTHON || 'python3', [RENDERER, htmlPath, pdf], { encoding:'utf8', env: { ...process.env, PYTHONUTF8: '1' }, maxBuffer:10*1024*1024 });
} catch (e:any) {
  console.error(e.stdout?.toString?.() || e.message);
  process.exit(2);
}
const renderLines = renderRaw.trim().split(/\r?\n/).filter(Boolean);
const renderReport = JSON.parse(renderLines[renderLines.length-1]);
if (renderReport.errors !== 0) {
  console.error(`Layout check failed: ${renderReport.errors} issue(s) ${renderReport.issues}`);
  process.exit(2);
}
if (renderReport.pages !== 2) throw new Error(`PDF page count must be 2, got ${renderReport.pages}`);
if (!fs.existsSync(pdf) || fs.statSync(pdf).size < 10_000) throw new Error('PDF generation failed');
fs.copyFileSync(htmlPath, path.join(OUT,'resume-fintech.html'));
fs.writeFileSync(path.join(OUT,'build-report.json'), JSON.stringify({ok:true, input:path.relative(ROOT,DATA), layoutErrors:0, renderer:'Playwright Chromium', pdf:path.basename(pdf), bytes:fs.statSync(pdf).size, profile:data.meta.profile, pages:renderReport.pages}, null, 2));
console.log(`OK: ${pdf}`);

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { escapeHtml, loadResume, renderInline } from './resume-schema.ts';
import { resolveLocalImage } from './image-assets.ts';
import { resolvePythonCommand } from './python-runtime.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: {
  input: { type: 'string' }, output: { type: 'string' }, html: { type: 'string' }, report: { type: 'string' }
} });
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
function artifactPath(value: string, label: string): string {
  const file = path.resolve(ROOT, value);
  if (!file.startsWith(`${ROOT}${path.sep}`)) throw new Error(`${label} must be inside the project: ${file}`);
  return file;
}
function sibling(file: string, suffix: string): string {
  return path.join(path.dirname(file), `${path.basename(file, path.extname(file))}${suffix}`);
}
function stagingPath(file: string, runId: string): string {
  return path.join(path.dirname(file), `.${path.basename(file)}.${runId}.tmp${path.extname(file)}`);
}
function publish(staging: string, target: string, label: string): void {
  try {
    fs.renameSync(staging, target);
  } catch (error: any) {
    if (['EBUSY', 'EPERM', 'EACCES'].includes(error.code)) {
      throw new Error(`Cannot publish ${label}: ${target}. The target may be open in another application; the previous artifact was left unchanged.`);
    }
    throw error;
  }
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
const profile = data.meta.profile;
if (!/^[A-Za-z0-9_-]+$/.test(profile)) throw new Error(`meta.profile must be filename-safe: ${profile}`);
const configuredPdf = values.output || process.env.RESUME_PDF;
const pdf = artifactPath(configuredPdf || path.join(OUT, `resume-${profile}.pdf`), 'PDF output');
const htmlPath = artifactPath(values.html || process.env.RESUME_HTML || (configuredPdf ? sibling(pdf, '.html') : path.join(OUT, `resume-${profile}.html`)), 'HTML output');
const reportPath = artifactPath(values.report || process.env.RESUME_REPORT || (configuredPdf ? sibling(pdf, '.report.json') : path.join(OUT, `build-report-${profile}.json`)), 'build report');
const portraitData = resolveLocalImage(ROOT, p.portrait, 'portrait');
const headerLogoData = p.headerLogo ? resolveLocalImage(ROOT, p.headerLogo, 'header logo') : null;
for (const directory of [OUT, TMP, path.dirname(pdf), path.dirname(htmlPath), path.dirname(reportPath)]) {
  fs.mkdirSync(directory, { recursive: true });
}

const education = data.education.map(e => `
  <div class="edu-item" data-guard="education-item">
    <div class="row-head"><div class="left"><span class="school">${renderInline(e.school)}</span>${tags(e.tags)}</div><div class="date">${renderInline(e.date)}</div></div>
    <div class="subrow"><div>${renderInline(e.degreeLine)}</div><div class="city">${renderInline(e.city || '')}</div></div>
    ${e.details.map(d => `<p class="detail">${d.label ? `<strong>${renderInline(d.label)}</strong>` : ''}${renderInline(d.text)}</p>`).join('')}
  </div>`).join('');
const skills = data.skills.map(s => `<p class="skill-row" data-guard="skill"><strong>${renderInline(s.label)}</strong>${renderInline(s.text)}</p>`).join('');

const expHtml = data.internships.map((e, idx) => {
  return `<div class="exp-item ${idx>0?'compact':''}" data-guard="internship">
    <div class="row-head"><div class="company">${renderInline(e.company)}</div><div class="date">${renderInline(e.date)}</div></div>
    <div class="subrow"><div>${renderInline(e.role)}</div><div class="city">${renderInline(e.city || '')}</div></div>
    ${e.intro ? `<p class="intro">${renderInline(e.intro)}</p>` : ''}
    ${bullets(e.bullets)}
  </div>`;
}).join('');

const projects = data.projects.map(proj => `<div class="project" data-guard="project">
  <div class="row-head"><div class="project-name">${renderInline(proj.name)}</div><div class="date">${renderInline(proj.date)}</div></div>
  ${proj.links.map(l => `<div class="link-row">${renderInline(l)}</div>`).join('')}
  <div class="stack-row">技术栈：${renderInline(proj.stack)}</div>
  <div class="intro">${renderInline(proj.intro)}</div>
  ${bullets(proj.bullets)}
</div>`).join('');

const documentHtml = `<article class="resume-document">
  <div class="first-page-header">
    <div class="top-stripe"></div>
    <header class="header">
      ${headerLogoData ? `<img class="header-logo" data-guard="header-logo" src="${headerLogoData}" alt="" />` : ''}
      <div class="name">${renderInline(p.name)}</div>
      <div class="header-line contact">${renderInline(p.phone)}&nbsp;&nbsp;|&nbsp;&nbsp;${renderInline(p.email)}&nbsp;&nbsp;|&nbsp;&nbsp;${renderInline(p.city)}</div>
      <div class="header-line portfolio">${renderInline(p.portfolio)}</div>
      <div class="header-line address">${renderInline(p.address)}</div>
      <div class="header-line status">${renderInline(p.status)}</div>
      <img class="portrait" src="${portraitData}" alt="portrait" />
    </header>
  </div>
  <main class="resume-flow">
    <section class="section education" data-guard="education-section"><div class="section-title">教育经历</div><div class="section-body">${education}</div></section>
    <section class="section skills" data-guard="skills-section"><div class="section-title">专业技能</div><div class="section-body">${skills}</div></section>
    <section class="section experience" data-guard="experience-section"><div class="section-title">实习经历</div><div class="section-body">${expHtml}</div></section>
    <section class="section projects" data-guard="projects-section"><div class="section-title">项目经历</div>${projects}</section>
  </main>
</article>`;

const tpl = fs.readFileSync(TEMPLATE, 'utf8');
if (!tpl.includes('{{TITLE}}') || !tpl.includes('{{DOCUMENT}}')) throw new Error('HTML template is missing required placeholders');
let html = tpl.replace('{{TITLE}}', `${escapeHtml(p.name)} - ${escapeHtml(data.meta.profile)}`).replace('{{DOCUMENT}}', documentHtml);
const css = fs.readFileSync(CSS,'utf8');
html = html.replace('<link rel="stylesheet" href="../styles/resume.css" />', `<style>${css}</style>`);
const runId = `${process.pid}-${randomUUID()}`;
const stagingPdf = stagingPath(pdf, runId);
const stagingHtml = stagingPath(htmlPath, runId);
const stagingReport = stagingPath(reportPath, runId);
fs.writeFileSync(stagingHtml, html);

try {
  const python = resolvePythonCommand(ROOT);
  const renderRaw = execFileSync(python.executable, [...python.prefixArgs, RENDERER, stagingHtml, stagingPdf], { encoding:'utf8', env: { ...process.env, PYTHONUTF8: '1' }, maxBuffer:10*1024*1024 });
  const renderLines = renderRaw.trim().split(/\r?\n/).filter(Boolean);
  const renderReport = JSON.parse(renderLines[renderLines.length-1]);
  if (renderReport.errors !== 0) throw new Error(`Layout check failed: ${renderReport.errors} issue(s) ${renderReport.issues}`);
  if (renderReport.pages !== 2) throw new Error(`PDF page count must be 2, got ${renderReport.pages}`);
  if (!fs.existsSync(stagingPdf) || fs.statSync(stagingPdf).size < 10_000) throw new Error('PDF generation failed');
  fs.writeFileSync(stagingReport, JSON.stringify({ok:true, input:path.relative(ROOT,DATA), layoutErrors:0, renderer:'Playwright Chromium', pdf:path.basename(pdf), html:path.basename(htmlPath), bytes:fs.statSync(stagingPdf).size, profile, pages:renderReport.pages}, null, 2));
  publish(stagingPdf, pdf, 'PDF');
  publish(stagingHtml, htmlPath, 'HTML');
  publish(stagingReport, reportPath, 'build report');
} catch (error: any) {
  const detail = error.stdout?.toString?.().trim();
  if (detail) throw new Error(detail, { cause: error });
  throw error;
} finally {
  for (const staging of [stagingPdf, stagingHtml, stagingReport]) {
    try { fs.unlinkSync(staging); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
}
console.log(`OK: ${pdf}`);

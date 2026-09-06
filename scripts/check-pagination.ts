import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'output', 'resume-fintech.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles', 'resume.css'), 'utf8');

const requiredHtml = ['class="resume-root"', 'class="resume-document"', 'class="resume-flow"', 'class="section projects"'];
const forbiddenHtml = ['class="pages"', 'class="page page1"', 'class="page page2"', 'class="continuation"'];
for (const token of requiredHtml) if (!html.includes(token)) throw new Error(`Automatic pagination markup missing: ${token}`);
for (const token of forbiddenHtml) if (html.includes(token)) throw new Error(`Manual pagination markup must not be generated: ${token}`);
if (!css.includes('@page :first')) throw new Error('Automatic pagination CSS must define the first-page margin rule');
if (!/\.project\s*\{[^}]*break-inside:\s*avoid/s.test(css)) throw new Error('Projects must avoid page breaks when they fit');
if (!/\.section-title\s*\{[^}]*break-after:\s*avoid/s.test(css)) throw new Error('Section titles must stay with following content');
console.log('Pagination OK: continuous flow with CSS fragmentation guards');

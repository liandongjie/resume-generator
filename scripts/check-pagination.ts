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
if (!/\.section-title\s*\{[^}]*break-after:\s*avoid/s.test(css)) throw new Error('Section titles must stay with following content');

const projectRule = css.match(/\.project\s*\{([^}]*)\}/s)?.[1] || '';
if (!/break-inside:\s*auto/.test(projectRule) || !/page-break-inside:\s*auto/.test(projectRule)) {
  throw new Error('Projects must be allowed to fragment across pages');
}
if (/break-inside:\s*avoid/.test(projectRule) || /page-break-inside:\s*avoid/.test(projectRule)) {
  throw new Error('Projects must not be treated as indivisible pagination blocks');
}
if (!/\.project \.row-head,\s*\.project \.link-row,\s*\.project \.stack-row,\s*\.project \.intro\s*\{[^}]*break-after:\s*avoid[^}]*page-break-after:\s*avoid/s.test(css)) {
  throw new Error('Project metadata must stay attached to following project content');
}
if (!/\.project > \.bullets\s*\{[^}]*break-before:\s*avoid[^}]*page-break-before:\s*avoid/s.test(css)) {
  throw new Error('Project bullets must stay attached to project metadata');
}
if (!/\.bullets li\s*\{[^}]*break-inside:\s*avoid[^}]*page-break-inside:\s*avoid/s.test(css)) {
  throw new Error('Individual bullets must not split across pages');
}

console.log('Pagination OK: continuous flow with fragmentable projects and guarded project metadata/bullets');

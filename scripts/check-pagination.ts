import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { resolvePythonCommand } from './python-runtime.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { html: { type: 'string' }, pdf: { type: 'string' } } });
if (!values.html || !values.pdf) throw new Error('Usage: node scripts/check-pagination.ts --html <generated.html> --pdf <generated.pdf>');
const htmlPath = path.resolve(ROOT, values.html);
const pdfPath = path.resolve(ROOT, values.pdf);
for (const [file, label] of [[htmlPath, 'HTML'], [pdfPath, 'PDF']] as const) {
  if (!file.startsWith(`${ROOT}${path.sep}`)) throw new Error(`${label} must be inside the project: ${file}`);
  if (!fs.existsSync(file)) throw new Error(`Missing generated ${label}: ${file}`);
}
const html = fs.readFileSync(htmlPath, 'utf8');

const requiredHtml = ['class="resume-root"', 'class="resume-document"', 'class="resume-flow"', 'class="section projects"'];
const forbiddenHtml = ['class="pages"', 'class="page page1"', 'class="page page2"', 'class="continuation"'];
for (const token of requiredHtml) if (!html.includes(token)) throw new Error(`Automatic pagination markup missing: ${token}`);
for (const token of forbiddenHtml) if (html.includes(token)) throw new Error(`Manual pagination markup must not be generated: ${token}`);

const python = resolvePythonCommand(ROOT);
const raw = execFileSync(python.executable, [...python.prefixArgs, path.join(ROOT, 'scripts', 'check_pagination.py'), '--pdf', pdfPath], {
  cwd: ROOT, env: { ...process.env, PYTHONUTF8: '1' }, encoding: 'utf8'
}).trim();
console.log(raw);
console.log(`Pagination OK: ${path.relative(ROOT, pdfPath)} uses continuous markup and passes rendered behavior fixtures`);

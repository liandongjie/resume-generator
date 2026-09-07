import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { loadResume } from './resume-schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { input: { type: 'string' } } });
const input = path.resolve(ROOT, values.input || 'data/base-fintech.yaml');
if (!input.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Input must be inside the project: ${input}`);
const profile = loadResume(input).meta.profile;
if (!/^[A-Za-z0-9_-]+$/.test(profile)) throw new Error(`meta.profile must be filename-safe: ${profile}`);
const configuredPdf = process.env.RESUME_PDF;
const pdf = path.resolve(ROOT, configuredPdf || path.join('output', `resume-${profile}.pdf`));
const stem = path.join(path.dirname(pdf), path.basename(pdf, path.extname(pdf)));
const html = path.resolve(ROOT, process.env.RESUME_HTML || (configuredPdf ? `${stem}.html` : path.join('output', `resume-${profile}.html`)));
const report = path.resolve(ROOT, process.env.RESUME_REPORT || (configuredPdf ? `${stem}.report.json` : path.join('output', `build-report-${profile}.json`)));
const childEnv = { ...process.env, RESUME_PDF: pdf, RESUME_HTML: html, RESUME_REPORT: report };

const run = (script: string, args: string[] = []) => execFileSync(process.execPath, ['--experimental-strip-types', path.join(ROOT, script), ...args], {
  cwd: ROOT, env: childEnv, stdio: 'inherit'
});

execFileSync(process.execPath, ['--test', '--experimental-strip-types', path.join(ROOT, 'tests', 'resume.test.ts')], { cwd: ROOT, env: childEnv, stdio: 'inherit' });
run('scripts/design-lock.ts', ['check']);
run('scripts/check-schema.ts', ['--input', input]);
run('scripts/build.ts', ['--input', input, '--output', pdf, '--html', html, '--report', report]);
run('scripts/check-layout.ts', ['--html', html]);
run('scripts/check-pagination.ts', ['--html', html, '--pdf', pdf]);
run('scripts/check-repeatability.ts', ['--input', input]);
run('scripts/visual-check.ts');

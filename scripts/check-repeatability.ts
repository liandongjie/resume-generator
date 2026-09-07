import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { loadResume } from './resume-schema.ts';
import { resolvePythonCommand } from './python-runtime.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { input: { type: 'string' } } });
const INPUT = path.resolve(ROOT, values.input || 'data/base-fintech.yaml');
if (!INPUT.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Input must be inside the project: ${INPUT}`);
const BUILD = path.join(ROOT, 'scripts', 'build.ts');
const profile = loadResume(INPUT).meta.profile;
if (!/^[A-Za-z0-9_-]+$/.test(profile)) throw new Error(`meta.profile must be filename-safe: ${profile}`);
const TMP_ROOT = path.join(ROOT, 'tmp');
fs.mkdirSync(TMP_ROOT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(TMP_ROOT, `repeatability-${process.pid}-`));
const report = path.join(ROOT, 'output', `repeatability-report-${profile}.json`);

const build = (name: string) => {
  const base = path.join(TMP, name);
  const pdf = `${base}.pdf`;
  execFileSync(process.execPath, ['--experimental-strip-types', BUILD, '--input', INPUT, '--output', pdf, '--html', `${base}.html`, '--report', `${base}.json`], {
    cwd: ROOT, env: process.env, stdio: 'inherit'
  });
  return pdf;
};

try {
  const first = build('a');
  const second = build('b');
  const python = resolvePythonCommand(ROOT);
  execFileSync(python.executable, [...python.prefixArgs, path.join(ROOT, 'scripts', 'check_repeatability.py'), first, second, report], {
    cwd: ROOT, env: { ...process.env, PYTHONUTF8: '1' }, stdio: 'inherit'
  });
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD = path.join(ROOT, 'scripts', 'build.ts');
const PDF = process.env.RESUME_PDF ? path.resolve(ROOT, process.env.RESUME_PDF) : path.join(ROOT, 'output', 'resume-fintech.pdf');
const TMP = path.join(ROOT, 'tmp', 'repeatability');
fs.mkdirSync(TMP, { recursive: true });

const build = () => execFileSync(process.execPath, ['--experimental-strip-types', BUILD], { cwd: ROOT, env: process.env, stdio: 'inherit' });
build();
const first = path.join(TMP, 'first.pdf');
fs.copyFileSync(PDF, first);
build();
const second = path.join(TMP, 'second.pdf');
fs.copyFileSync(PDF, second);
execFileSync(process.env.PYTHON || 'python3', [path.join(ROOT, 'scripts', 'check_repeatability.py'), first, second, path.join(ROOT, 'output', 'repeatability-report.json')], {
  cwd: ROOT, env: { ...process.env, PYTHONUTF8: '1' }, stdio: 'inherit'
});

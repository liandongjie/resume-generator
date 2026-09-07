import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { loadResume } from './resume-schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: {
  input: { type: 'string' }, company: { type: 'string' }, role: { type: 'string' }
} });
if (!values.input || !values.company || !values.role) throw new Error('Usage: npm run generate -- --input <tmp/resume.yaml> --company <company> --role <role>');

const input = path.resolve(ROOT, values.input);
if (!input.startsWith(`${path.join(ROOT, 'tmp')}${path.sep}`)) throw new Error(`Generate input must be inside tmp/: ${input}`);
const resume = loadResume(input);

function filenamePart(value: string): string {
  const cleaned = value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').trim();
  if (!cleaned) throw new Error(`Invalid empty filename component: ${value}`);
  return cleaned;
}

const now = new Date();
const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
const stem = [date, resume.profile.name, values.company, values.role].map(filenamePart).join('-');
const applications = path.join(ROOT, 'output', 'applications');
fs.mkdirSync(applications, { recursive: true });
let output = path.join(applications, `${stem}.pdf`);
for (let suffix = 2; fs.existsSync(output); suffix++) output = path.join(applications, `${stem}-${String(suffix).padStart(2, '0')}.pdf`);

const stagingBase = path.join(ROOT, 'tmp', `.generate-${process.pid}-${randomUUID()}`);
const staging = `${stagingBase}.pdf`;
const stagingHtml = `${stagingBase}.html`;
const stagingReport = `${stagingBase}.report.json`;
try {
  execFileSync(process.execPath, ['--experimental-strip-types', path.join(ROOT, 'scripts', 'verify-resume.ts'), '--input', input], {
    cwd: ROOT, env: { ...process.env, RESUME_PDF: staging, RESUME_HTML: stagingHtml, RESUME_REPORT: stagingReport }, stdio: 'inherit'
  });
  fs.copyFileSync(staging, output, fs.constants.COPYFILE_EXCL);
  console.log(`Generated: ${output}`);
} finally {
  for (const file of [staging, stagingHtml, stagingReport]) {
    try { fs.unlinkSync(file); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
}

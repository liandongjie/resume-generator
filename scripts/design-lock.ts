import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'design-lock.json');
const LOCKED_FILES = ['template/resume.html', 'styles/resume.css'];

function hash(relativePath: string): string {
  const file = path.join(ROOT, ...relativePath.split('/'));
  if (!fs.existsSync(file)) throw new Error(`Missing locked file: ${relativePath}`);
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function approve(): void {
  const files = Object.fromEntries(LOCKED_FILES.map(file => [file, hash(file)]));
  fs.writeFileSync(MANIFEST, `${JSON.stringify({ version: 1, algorithm: 'sha256', files }, null, 2)}\n`);
  console.log(`Design lock approved: ${MANIFEST}`);
}

function check(): void {
  if (!fs.existsSync(MANIFEST)) throw new Error(`Missing design lock manifest: ${MANIFEST}`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const mismatches = LOCKED_FILES.filter(file => manifest.files?.[file] !== hash(file));
  if (mismatches.length) throw new Error(`Design lock mismatch: ${mismatches.join(', ')}. Run design:approve only for an explicitly approved template redesign.`);
  console.log(`Design lock OK: ${LOCKED_FILES.join(', ')}`);
}

const command = process.argv[2] || 'check';
if (command === 'approve') approve();
else if (command === 'check') check();
else throw new Error(`Unknown design-lock command: ${command}`);

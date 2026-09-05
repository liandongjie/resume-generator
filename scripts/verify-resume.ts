import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { input: { type: 'string' } } });
const input = path.resolve(ROOT, values.input || 'data/base-fintech.yaml');
if (!input.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Input must be inside the project: ${input}`);

const run = (script: string, args: string[] = []) => execFileSync(process.execPath, ['--experimental-strip-types', path.join(ROOT, script), ...args], {
  cwd: ROOT, env: process.env, stdio: 'inherit'
});

execFileSync(process.execPath, ['--test', '--experimental-strip-types', path.join(ROOT, 'tests', 'resume.test.ts')], { cwd: ROOT, env: process.env, stdio: 'inherit' });
run('scripts/design-lock.ts', ['check']);
run('scripts/check-schema.ts', ['--input', input]);
run('scripts/build.ts', ['--input', input]);
run('scripts/check-layout.ts');
run('scripts/check-repeatability.ts', ['--input', input]);
run('scripts/visual-check.ts');

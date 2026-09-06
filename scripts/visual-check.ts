import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolvePythonCommand } from './python-runtime.ts';

const script = path.resolve(import.meta.dirname, 'visual_check.py');
const ROOT = path.resolve(import.meta.dirname, '..');
const python = resolvePythonCommand(ROOT);
execFileSync(python.executable, [...python.prefixArgs, script], { env: { ...process.env, PYTHONUTF8: '1' }, stdio: 'inherit' });

import path from 'node:path';
import { execFileSync } from 'node:child_process';

const script = path.resolve(import.meta.dirname, 'visual_check.py');
execFileSync(process.env.PYTHON || 'python3', [script], { env: { ...process.env, PYTHONUTF8: '1' }, stdio: 'inherit' });

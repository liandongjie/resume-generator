import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolvePythonCommand } from './python-runtime.ts';
const ROOT=path.resolve(import.meta.dirname,'..');
const html=path.join(ROOT,'output','resume-fintech.html');
if(!fs.existsSync(html)) throw new Error('Run npm run build:resume first');
const content=fs.readFileSync(html,'utf8');
for (const match of content.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
  if (!match[1].startsWith('data:image/')) throw new Error(`Generated image is not self-contained: ${match[1]}`);
}
const python=resolvePythonCommand(ROOT);
const raw=execFileSync(python.executable,[...python.prefixArgs,path.join(ROOT,'scripts','check_layout.py'),html],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
console.log(raw);

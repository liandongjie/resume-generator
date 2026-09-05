import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const ROOT=path.resolve(import.meta.dirname,'..');
const html=path.join(ROOT,'output','resume-fintech.html');
if(!fs.existsSync(html)) throw new Error('Run npm run build:resume first');
const raw=execFileSync(process.env.PYTHON || 'python3',[path.join(ROOT,'scripts','check_layout.py'),html],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
console.log(raw);

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { resolvePythonCommand } from './python-runtime.ts';
const ROOT=path.resolve(import.meta.dirname,'..');
const { values }=parseArgs({options:{html:{type:'string'}}});
if(!values.html) throw new Error('Usage: npm run check:layout -- --html <generated.html>');
const html=path.resolve(ROOT,values.html);
if(!html.startsWith(`${ROOT}${path.sep}`)) throw new Error(`HTML must be inside the project: ${html}`);
if(!fs.existsSync(html)) throw new Error(`Missing generated HTML: ${html}`);
const content=fs.readFileSync(html,'utf8');
for (const match of content.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
  if (!match[1].startsWith('data:image/')) throw new Error(`Generated image is not self-contained: ${match[1]}`);
}
const python=resolvePythonCommand(ROOT);
const raw=execFileSync(python.executable,[...python.prefixArgs,path.join(ROOT,'scripts','check_layout.py'),html],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
console.log(raw);

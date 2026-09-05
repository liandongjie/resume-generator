import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadResume } from './resume-schema.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const { values } = parseArgs({ options: { input: { type: 'string' } } });
const file = path.resolve(ROOT, values.input || 'data/base-fintech.yaml');
if (!file.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Input must be inside the project: ${file}`);
const resume = loadResume(file);
console.log(`Schema OK: ${file} (${resume.education.length} education, ${resume.skills.length} skills, ${resume.internships.length} experience, ${resume.projects.length} projects)`);

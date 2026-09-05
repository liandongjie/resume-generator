import path from 'node:path';
import { loadResume } from './resume-schema.ts';

const file = path.resolve(import.meta.dirname, '..', 'data', 'resume.yaml');
const resume = loadResume(file);
console.log(`Schema OK: ${file} (${resume.education.length} education, ${resume.skills.length} skills, ${resume.internships.length} experience, ${resume.projects.length} projects)`);

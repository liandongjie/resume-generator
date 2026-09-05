import fs from 'node:fs';
import YAML from 'yaml';
import { z } from 'zod';

const requiredString = z.string().min(1);
const dateString = requiredString.regex(/^\d{4}年\d{2}月 - \d{4}年\d{2}月$/, 'expected YYYY年MM月 - YYYY年MM月');
const httpUrl = requiredString.url().refine(value => /^https?:\/\//.test(value), 'expected an http(s) URL');
const labeledUrl = requiredString.refine(value => {
  const match = value.match(/https?:\/\/\S+$/);
  if (!match) return false;
  try { new URL(match[0]); return true; } catch { return false; }
}, 'expected text ending with an http(s) URL');

const EducationSchema = z.strictObject({
  school: requiredString,
  tags: z.array(requiredString),
  date: dateString,
  degreeLine: requiredString,
  city: requiredString.optional(),
  details: z.array(z.strictObject({ label: requiredString.optional(), text: requiredString }))
});

const SkillSchema = z.strictObject({ label: requiredString, text: requiredString });

const ExperienceSchema = z.strictObject({
  company: requiredString,
  date: dateString,
  role: requiredString,
  city: requiredString.optional(),
  intro: requiredString.optional(),
  bullets: z.array(requiredString),
  page2BulletStart: z.number().int().nonnegative().optional()
});

const ProjectSchema = z.strictObject({
  name: requiredString,
  date: dateString,
  links: z.array(labeledUrl),
  stack: requiredString,
  intro: requiredString,
  bullets: z.array(requiredString)
});

export const ResumeSchema = z.strictObject({
  meta: z.strictObject({ profile: requiredString, version: requiredString, visualSource: requiredString }),
  profile: z.strictObject({
    name: requiredString,
    phone: requiredString,
    email: requiredString.email(),
    city: requiredString,
    portfolio: httpUrl,
    address: requiredString,
    status: requiredString,
    portrait: requiredString
  }),
  education: z.array(EducationSchema).min(1),
  skills: z.array(SkillSchema).min(1),
  internships: z.array(ExperienceSchema).min(1),
  projects: z.array(ProjectSchema).min(1)
});

export type Resume = z.infer<typeof ResumeSchema>;

export function parseResume(value: unknown): Resume {
  const result = ResumeSchema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues.map(issue => `- ${issue.path.join('.') || '<root>'}: ${issue.message}`);
  throw new Error(`Resume schema validation failed:\n${issues.join('\n')}`);
}

export function loadResume(file: string): Resume {
  let value: unknown;
  try {
    value = YAML.parse(fs.readFileSync(file, 'utf8'));
  } catch (error: any) {
    throw new Error(`Failed to parse resume YAML: ${error.message}`);
  }
  return parseResume(value);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);
}

export function renderInline(value: string): string {
  const pattern = /\*\*(.+?)\*\*/gs;
  let html = '';
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(value.slice(cursor, index));
    html += `<strong>${escapeHtml(match[1])}</strong>`;
    cursor = index + match[0].length;
  }
  return html + escapeHtml(value.slice(cursor));
}

import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadResume, parseResume, renderInline } from '../scripts/resume-schema.ts';

const fixture = {
  meta: { profile: 'test', version: 'phase2.1', visualSource: 'fixture' },
  profile: {
    name: '测试', phone: '123', email: 'test@example.com', city: '南京',
    portfolio: 'https://example.com/', address: '地址', status: '状态', portrait: 'assets/portrait.png'
  },
  education: [{ school: '学校', tags: [], date: '2024年09月 - 2027年06月', degreeLine: '硕士', details: [{ text: '详情' }] }],
  skills: [{ label: '后端：', text: 'Redis' }],
  internships: [{ company: '公司', date: '2025年08月 - 2025年11月', role: '实习生', bullets: ['完成任务'] }],
  projects: [{ name: '项目', date: '2025年08月 - 2025年11月', links: ['GitHub：https://example.com/repo'], stack: 'TypeScript', intro: '简介', bullets: ['完成项目'] }]
};

test('current resume.yaml passes ResumeSchema', () => {
  const resume = loadResume(path.resolve(import.meta.dirname, '..', 'data', 'resume.yaml'));
  assert.equal(resume.meta.profile, 'fintech');
});

test('missing required field reports its path', () => {
  const invalid: any = structuredClone(fixture);
  delete invalid.profile.email;
  assert.throws(() => parseResume(invalid), /profile\.email/);
});

test('bullets must be string arrays', () => {
  const invalid: any = structuredClone(fixture);
  invalid.internships[0].bullets = 'not an array';
  assert.throws(() => parseResume(invalid), /internships\.0\.bullets/);
});

test('inline emphasis is minimal and HTML-safe', () => {
  assert.equal(renderInline('Redis 缓存'), 'Redis 缓存');
  assert.equal(renderInline('使用 **Redis 缓存**'), '使用 <strong>Redis 缓存</strong>');
  assert.equal(renderInline('**Redis** 与 **MySQL**'), '<strong>Redis</strong> 与 <strong>MySQL</strong>');
  assert.equal(renderInline('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(renderInline('**P95 < 1.5s**'), '<strong>P95 &lt; 1.5s</strong>');
  assert.equal(renderInline('**Redis 缓存'), '**Redis 缓存');
});

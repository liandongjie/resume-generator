import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveLocalImage } from '../scripts/image-assets.ts';
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

test('base resumes pass ResumeSchema', () => {
  for (const [file, profile] of [['base-fintech.yaml', 'fintech'], ['base-fullstack.yaml', 'fullstack']]) {
    const resume = loadResume(path.resolve(import.meta.dirname, '..', 'data', file));
    assert.equal(resume.meta.profile, profile);
  }
});

test('headerLogo is optional and accepted when configured', () => {
  assert.equal(parseResume(structuredClone(fixture)).profile.headerLogo, undefined);
  const configured: any = structuredClone(fixture);
  configured.profile.headerLogo = 'assets/logos/nju.svg';
  assert.equal(parseResume(configured).profile.headerLogo, 'assets/logos/nju.svg');
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

test('manual pagination metadata is rejected', () => {
  const invalid: any = structuredClone(fixture);
  invalid.internships[0].page2BulletStart = 1;
  assert.throws(() => parseResume(invalid), /page2BulletStart|unrecognized/i);
});

test('local image resolver inlines supported project images and rejects invalid sources', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-image-assets-'));
  try {
    const assets = path.join(root, 'assets');
    fs.mkdirSync(assets, { recursive: true });
    const formats = [
      ['png', 'image/png'],
      ['jpg', 'image/jpeg'],
      ['jpeg', 'image/jpeg'],
      ['webp', 'image/webp'],
      ['svg', 'image/svg+xml']
    ];
    for (const [extension, mime] of formats) {
      const file = path.join(assets, `sample.${extension}`);
      fs.writeFileSync(file, extension === 'svg' ? '<svg xmlns="http://www.w3.org/2000/svg" />' : Buffer.from([0, 1, 2, 3]));
      assert.ok(resolveLocalImage(root, `assets/sample.${extension}`).startsWith(`data:${mime};base64,`));
    }
    assert.throws(() => resolveLocalImage(root, '../outside.png'), /inside the project/);
    assert.throws(() => resolveLocalImage(root, 'assets/missing.png'), /Missing required image/);
    fs.writeFileSync(path.join(assets, 'sample.gif'), Buffer.from([0]));
    assert.throws(() => resolveLocalImage(root, 'assets/sample.gif'), /Unsupported image format/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('inline emphasis is minimal and HTML-safe', () => {
  assert.equal(renderInline('Redis 缓存'), 'Redis 缓存');
  assert.equal(renderInline('使用 **Redis 缓存**'), '使用 <strong>Redis 缓存</strong>');
  assert.equal(renderInline('**Redis** 与 **MySQL**'), '<strong>Redis</strong> 与 <strong>MySQL</strong>');
  assert.equal(renderInline('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(renderInline('**P95 < 1.5s**'), '<strong>P95 &lt; 1.5s</strong>');
  assert.equal(renderInline('**Redis 缓存'), '**Redis 缓存');
});

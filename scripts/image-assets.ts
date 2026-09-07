import fs from 'node:fs';
import path from 'node:path';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

export function resolveLocalImage(projectRoot: string, source: string, label = 'image'): string {
  if (!source.trim()) throw new Error(`${label} path must not be empty`);

  const root = path.resolve(projectRoot);
  const file = path.resolve(root, source);
  const relative = path.relative(root, file);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must be inside the project: ${source}`);
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`Missing required ${label}: ${file}`);
  }

  const extension = path.extname(file).toLowerCase();
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) {
    throw new Error(`Unsupported ${label} format: ${source}. Supported: PNG, JPEG, WebP, SVG`);
  }

  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

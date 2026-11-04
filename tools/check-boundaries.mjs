// Kiểm luật FE trong RULES.md mục 10. Chạy trong `pnpm lint`.
// 1. packages/app-core không import react, react-native, react-dom.
// 2. App không import code của app khác; package không import code trong apps/.
// 3. Không tự gọi fetch tới backend ngoài packages/api-client (dùng hook sinh bằng `pnpm gen:api`).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const toPosix = (p) => p.split(sep).join('/');
const IMPORT = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
const SKIP = new Set(['node_modules', '.next', '.expo', 'dist', 'generated', 'assets', 'public']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts)$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const errors = [];
for (const file of [...walk(join(root, 'apps')), ...walk(join(root, 'packages'))]) {
  const rel = toPosix(relative(root, file));
  const [area, owner] = rel.split('/');
  const source = readFileSync(file, 'utf8');
  const isTest = /\.test\.tsx?$/.test(rel);

  if (!isTest && !rel.startsWith('packages/api-client/') && /\bfetch\s*\(/.test(source)) {
    errors.push(`${rel}: không tự gọi fetch, dùng hook trong @tripflix/api-client`);
  }

  for (const match of source.matchAll(IMPORT)) {
    const spec = match[1] ?? match[2] ?? match[3];
    if (rel.startsWith('packages/app-core/') && /^(react|react-native|react-dom)(\/|$)/.test(spec)) {
      errors.push(`${rel}: app-core không được import "${spec}"`);
    }
    if (!spec.startsWith('.')) continue;
    const target = toPosix(relative(root, resolve(dirname(file), spec)));
    const targetApp = /^apps\/([^/]+)/.exec(target)?.[1];
    if (targetApp && (area !== 'apps' || targetApp !== owner)) {
      errors.push(`${rel}: không import code trong apps/${targetApp} ("${spec}")`);
    }
  }
}

if (errors.length) {
  process.stderr.write(`Vi phạm luật FE:\n- ${errors.join('\n- ')}\n`);
  process.exit(1);
}
process.stdout.write('Luật FE: không có vi phạm.\n');

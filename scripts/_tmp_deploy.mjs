// Helper temporal: genera JSON payloads para deploy_edge_function del MCP.
// Uso:  node scripts/_tmp_deploy.mjs <function-name>
// Output: JSON imprimible con {files, entrypoint_path, name}.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'supabase', 'functions');

const SHARED_FILES = [
  { rel: '_shared/cors.ts',      abs: path.join(ROOT, '_shared', 'cors.ts') },
  { rel: '_shared/resend.ts',    abs: path.join(ROOT, '_shared', 'resend.ts') },
  { rel: '_shared/templates.ts', abs: path.join(ROOT, '_shared', 'templates.ts') },
  { rel: '_shared/stripe.ts',    abs: path.join(ROOT, '_shared', 'stripe.ts') },
];

const fnName = process.argv[2];
if (!fnName) { console.error('uso: node _tmp_deploy.mjs <fn-name>'); process.exit(1); }

const indexPath = path.join(ROOT, fnName, 'index.ts');
if (!fs.existsSync(indexPath)) { console.error(`no existe: ${indexPath}`); process.exit(1); }

const files = [{ name: 'index.ts', content: fs.readFileSync(indexPath, 'utf8') }];
for (const s of SHARED_FILES) {
  if (fs.existsSync(s.abs)) {
    files.push({ name: s.rel, content: fs.readFileSync(s.abs, 'utf8') });
  }
}

const outPath = process.argv[3];
const json = JSON.stringify({ name: fnName, entrypoint_path: 'index.ts', files });
if (outPath) {
  fs.writeFileSync(outPath, json, { encoding: 'utf8' });
  process.stdout.write(`wrote ${json.length} bytes to ${outPath}\n`);
} else {
  process.stdout.write(json);
}

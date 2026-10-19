// Copies App 1's inline content constants (apps/web/src/main.jsx) into App 2's content module.
// Usage (from apps/web-v2): npm run extract-content
import { readFileSync, writeFileSync } from 'node:fs';

const [source, output] = process.argv.slice(2);
const code = readFileSync(source, 'utf8');
const NAMES = [
  'locationLabels', 'copy', 'services', 'serviceSeoContent', 'serviceSeoArabic', 'locations',
  'commercialLocations', 'chauffeurHubs', 'faqs', 'articles', 'articleArabic', 'legalPages', 'legalArabic',
];

function literalAfter(index) {
  let i = code.indexOf('=', index) + 1;
  while (/\s/.test(code[i])) i += 1;
  const start = i;
  const open = code[i];
  if (open !== '{' && open !== '[') throw new Error(`Unexpected literal start ${open} at ${i}`);
  let depth = 0;
  let quote = null;
  for (; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{' || ch === '[') depth += 1;
    if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  throw new Error('Unterminated literal');
}

const parts = [
  '// Generated from apps/web/src/main.jsx (App 1) so both views show identical copy.',
  '// Regenerate with `npm run extract-content` in apps/web-v2; do not hand-edit.',
  '/* eslint-disable */',
  '',
];
for (const name of NAMES) {
  const match = new RegExp(`\\nconst ${name}\\s*=`).exec(code);
  if (!match) throw new Error(`Constant ${name} not found`);
  let literal = literalAfter(match.index);
  if (name === 'services') {
    literal = literal.replace(/icon:\s*Car\b/g, "icon:'car'").replace(/icon:\s*Plane\b/g, "icon:'plane'").replace(/icon:\s*Users\b/g, "icon:'users'");
  }
  if (/\b(Car|Plane|Users|MapPin)\b(?!['"\w])/.test(literal.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, ''))) {
    throw new Error(`Constant ${name} still references a component`);
  }
  parts.push(`export const ${name} = ${literal};`, '');
}
writeFileSync(output, parts.join('\n'));
console.log(`Wrote ${NAMES.length} constants to ${output}`);

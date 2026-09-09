import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../public/sitemap.xml', import.meta.url);
const current = await readFile(file, 'utf8');
const origin = 'https://vipcar.com.tn';
const locales = ['en', 'fr', 'ar'];
const paths = [...current.matchAll(new RegExp(`${origin}/(en|fr)(/[^<"]*)?`, 'g'))]
  .map((match) => match[2] || '')
  .filter((path, index, all) => all.indexOf(path) === index);

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...paths.flatMap((path) => locales.map((locale) => {
    const links = locales.map((alternate) => `<xhtml:link rel="alternate" hreflang="${alternate}" href="${origin}/${alternate}${path}"/>`).join('');
    return `  <url><loc>${origin}/${locale}${path}</loc>${links}</url>`;
  })),
  '</urlset>',
  '',
].join('\n');

await writeFile(file, xml, 'utf8');
console.log(`Generated ${paths.length * locales.length} localized sitemap URLs.`);

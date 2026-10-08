import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parse, parseFragment, serialize } from 'parse5';
const base = 'https://info.zenloth.tech';
const routes = [];
function walk(node, fn) { fn(node); for (const child of [...node.childNodes || []]) walk(child, fn); }
function attribute(node, name, value) {
  const found = node.attrs.find((attr) => attr.name === name);
  if (value === undefined) return found?.value;
  if (found) found.value = value; else node.attrs.push({ name, value });
}
function fragment(html, parent) {
  const nodes = parseFragment(html).childNodes;
  for (const node of nodes) node.parentNode = parent;
  return nodes;
}
for (const file of ['index.html', 'info.html']) {
  const source = readFileSync(file, 'utf8').replaceAll("'src/", "'/src/");
  for (const lang of ['es', 'en']) {
    const doc = parse(source); let head;
    const path = `${lang === 'en' ? '/en/' : '/'}${file === 'index.html' ? '' : file}`;
    const esPath = file === 'index.html' ? '/' : '/info.html';
    const enPath = '/en' + esPath;
    const title = file === 'index.html'
      ? lang === 'es' ? 'Zenloth — Finanzas con calma' : 'Zenloth — Finance with calm'
      : lang === 'es' ? 'Zenloth — Centro de información' : 'Zenloth — Information center';
    const description = lang === 'es'
      ? 'Conocé Zenloth: organizá tu presupuesto y tus metas financieras con Zenny. Consultá nuestros documentos oficiales y opciones de contacto.'
      : 'Meet Zenloth: organize your budget and financial goals with Zenny. Read our official documents and find contact information.';
    walk(doc, (node) => {
      if (node.tagName === 'head') head = node;
      if (!node.attrs) return;
      if (node.tagName === 'html') attribute(node, 'lang', lang);
      const translated = attribute(node, 'data-' + lang);
      if (translated !== undefined) node.childNodes = fragment(translated, node);
      for (const attr of node.attrs) {
        if (['src','data-bg','data-src'].includes(attr.name) && attr.value.startsWith('src/')) attr.value = '/' + attr.value;
        if (attr.name === 'href' && /^(?:\.\/)?(?:index|info)\.html(?:#|$)/.test(attr.value)) {
          attr.value = (lang === 'en' ? '/en/' : '/') + attr.value.replace(/^(?:\.\/)?index\.html/, '').replace(/^\.\//, '');
        }
      }
      if (/^lang[23]?$/.test(attribute(node, 'id') || '')) {
        attribute(node, 'href', lang === 'es' ? enPath : esPath);
        attribute(node, 'lang', lang === 'es' ? 'en' : 'es');
        attribute(node, 'hreflang', lang === 'es' ? 'en' : 'es');
        node.childNodes = fragment(lang === 'es' ? 'EN' : 'ES', node);
      }
      if (attribute(node, 'data-legal')) attribute(node, 'href', `https://zenloth.tech${lang === 'es' ? '/es' : ''}/${attribute(node, 'data-legal')}`);
    });
    assert.ok(head);
    head.childNodes = head.childNodes.filter((node) => {
      if (node.tagName === 'title') return false;
      if (node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json') return false;
      if (node.tagName === 'link' && ['canonical','alternate'].includes(attribute(node, 'rel'))) return false;
      return !(node.tagName === 'meta' && (['description','twitter:card','twitter:title','twitter:description','twitter:image'].includes(attribute(node,'name')) || attribute(node,'property')?.startsWith('og:')));
    });
    const image = base + '/src/story/05_walk_black_clean-lg.jpg';
    const metadata = `<title>${title}</title><meta name="description" content="${description}">
<link rel="canonical" href="${base + path}"><link rel="alternate" hreflang="es" href="${base + esPath}"><link rel="alternate" hreflang="en" href="${base + enPath}"><link rel="alternate" hreflang="x-default" href="${base + esPath}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Zenloth"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${base + path}"><meta property="og:locale" content="${lang === 'es' ? 'es_CR' : 'en_US'}"><meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'Zenloth',url:base + '/',inLanguage:['es','en']})}</script>`;
    head.childNodes.push(...fragment(metadata, head));
    const target = lang === 'en' ? 'en/' + file : file;
    if (lang === 'en') mkdirSync('en', { recursive: true });
    writeFileSync(target, serialize(doc) + '\n'); routes.push(base + path);
  }
}
writeFileSync('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>\n`);
writeFileSync('release.json', JSON.stringify({ revision: execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim() }) + '\n');
console.log('Prepared four public documents with explicit locale URLs and crawler metadata.');

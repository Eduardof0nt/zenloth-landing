import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'parse5';
for (const path of ['index.html','info.html','en/index.html','en/info.html']) test(path + ' public metadata and links', () => {
 const html=readFileSync(path,'utf8'), nodes=[];
 function visit(node){nodes.push(node);for(const child of node.childNodes||[])visit(child)} visit(parse(html));
 const attr=(node,name)=>node.attrs?.find((a)=>a.name===name)?.value;
 assert.equal(nodes.find((node)=>node.tagName==='html').attrs.find((a)=>a.name==='lang').value,path.startsWith('en/')?'en':'es');
 assert.equal(nodes.filter((node)=>node.tagName==='link'&&attr(node,'rel')==='canonical').length,1);
 assert.equal(nodes.filter((node)=>node.tagName==='link'&&attr(node,'rel')==='alternate').length,3);
 assert.ok(nodes.filter((node)=>node.tagName==='a').every((node)=>attr(node,'href')), 'Every anchor has an actual destination');
 if(path.startsWith('en/')) {
  const internal = nodes.filter(node=>node.tagName==='a'&&!/^lang[23]?$/.test(attr(node,'id')||'')&&/^\/(?:en\/)?(?:info\.html|$)/.test(attr(node,'href')||''));
  assert.ok(internal.every(node=>attr(node,'href').startsWith('/en/')), 'English internal document/home links preserve locale');
 }
 assert.ok(nodes.some((node)=>node.tagName==='main'));
 assert.ok(nodes.some((node)=>node.tagName==='h1'));
 assert.ok(nodes.some((node)=>node.tagName==='meta'&&attr(node,'property')==='og:image'&&/^https:\/\//.test(attr(node,'content'))));
 assert.doesNotMatch(html,/1 mes gratis|1 month free|first month is free|Alojamiento en Costa Rica|Borrador · contenido de ejemplo/i);
});

test('production host normalization is scoped and preserves query values', async () => {
 const {default:vm}=await import('node:vm');const context=vm.createContext({});
 vm.runInContext(readFileSync('infrastructure/cloudfront/public-routes.js','utf8'),context);
 const request=(uri,host='preview.example')=>({uri,headers:{host:{value:host}},querystring:{source:{value:'a%20b'}}});
 assert.equal(context.handler({request:request('/info.html','www.info.zenloth.tech')}).headers.location.value,'https://info.zenloth.tech/info.html?source=a%20b');
 assert.equal(context.handler({request:request('/en')}).headers.location.value,'/en/?source=a%20b');
 assert.equal(context.handler({request:request('/en/')}).uri,'/en/index.html');
 assert.equal(context.handler({request:request('/robots.txt')}).uri,'/robots.txt');
});


test('dev export uses same-environment locale links and excludes stale crawl artifacts', async () => {
 const {execFileSync}=await import('node:child_process');const {writeFileSync,existsSync,mkdirSync}=await import('node:fs');
 mkdirSync('dist',{recursive:true});writeFileSync('dist/sitemap.xml','stale');
 const original=readFileSync('info.html','utf8');execFileSync(process.execPath,['scripts/prepare-dev-export.mjs']);
 assert.equal(readFileSync('info.html','utf8'),original,'Production source must remain unchanged');
 assert.equal(existsSync('dist/sitemap.xml'),false);
 for(const file of ['index.html','info.html','en/index.html','en/info.html']){
  const html=readFileSync('dist/'+file,'utf8');assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(html,/href="https:\/\/zenloth\.tech(?:["/])/);
  const appHome='https://d3cpf76wsm49vw.cloudfront.net'+(file.startsWith('en/')?'/':'/es');
  assert.ok(html.includes('href="'+appHome+'"'));
 }
 assert.match(readFileSync('dist/robots.txt','utf8'),/Disallow: \//);
});


test('public document generation is repeatable', async () => {
 const {execFileSync}=await import('node:child_process');
 const files=['index.html','info.html','en/index.html','en/info.html','robots.txt','sitemap.xml'];
 execFileSync(process.execPath,['scripts/build-public-pages.mjs']);
 const first=files.map(file=>readFileSync(file,'utf8'));
 execFileSync(process.execPath,['scripts/build-public-pages.mjs']);
 assert.deepEqual(files.map(file=>readFileSync(file,'utf8')),first);
});

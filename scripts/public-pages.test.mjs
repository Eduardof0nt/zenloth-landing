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

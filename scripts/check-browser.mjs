import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { chromium } from '@playwright/test';
const root=process.cwd(),output=resolve('test-results/crawling');mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
const server=createServer((req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);const file=existsSync(path)&&statSync(path).isDirectory()?resolve(path,'index.html'):path;if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return}res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(readFileSync(file))});
await new Promise((r)=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;const results=[];
try{
 browser=await chromium.launch({headless:true});
 for(const scripting of [false,true])for(const mobile of [false,true])for(const path of ['/','/info.html','/en/','/en/info.html']){
  const context=await browser.newContext({javaScriptEnabled:scripting,viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',(e)=>errors.push(e.message));
  const response=await page.goto(origin+path,{waitUntil:'networkidle'});assert.equal(response.status(),200);
  const language=path.startsWith('/en/')?'en':'es';assert.equal(await page.locator('html').getAttribute('lang'),language);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://info.zenloth.tech'+path);
  await page.locator('h1').waitFor({state:'visible'});
  if(!scripting)assert.ok(await page.locator('h1,h2').evaluateAll((nodes)=>nodes.every((node)=>{for(let n=node;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false}return node.getBoundingClientRect().height>0})),path+' headings visible without JavaScript');
  assert.ok(await page.locator('a[data-go]').evaluateAll((nodes)=>nodes.every((n)=>n.hash&&document.querySelector(n.hash))));
  assert.deepEqual(errors,[]);
  const state={path,scripting,mobile,language,title:await page.title(),headings:await page.locator('h1,h2').allTextContents()};results.push(state);
  await page.screenshot({path:resolve(output,`${results.length}.png`),fullPage:!scripting});await context.close();
 }
 for (const scripting of [false,true]) for (const width of [390,1440]) {
  const context=await browser.newContext({javaScriptEnabled:scripting,viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
   await page.goto(origin+'/');
   const language=page.locator(width===390?'#lang2':'#lang');
   await language.focus();await page.keyboard.press('Enter');await page.waitForURL(origin+'/en/');
   await page.locator('h1').waitFor({state:'visible'});
   await page.locator('a[href="/en/info.html#seguridad"]').focus();await page.keyboard.press('Enter');await page.waitForURL(origin+'/en/info.html#seguridad');
   assert.equal(await page.locator('html').getAttribute('lang'),'en');
   assert.equal(await page.locator('.back').getAttribute('href'),'/en/');
   for(const id of ['privacy','terms','ai-privacy'])assert.equal(await page.locator(`[data-legal="${id}"]`).first().getAttribute('href'),'https://zenloth.tech/'+id);
   await page.locator('#lang').focus();await page.keyboard.press('Enter');await page.waitForURL(origin+'/info.html');
   assert.equal(await page.locator('html').getAttribute('lang'),'es');
   for(const id of ['privacy','terms','ai-privacy'])assert.equal(await page.locator(`[data-legal="${id}"]`).first().getAttribute('href'),'https://zenloth.tech/es/'+id);
   await page.locator('.back').focus();await page.keyboard.press('Enter');await page.waitForURL(origin+'/');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:resolve(output,`navigation-${scripting?'js':'nojs'}-${width}.png`)});
   results.push({journey:true,scripting,width,keyboardNavigation:true,locales:['en','es'],officialLegalLinks:true,errors});
  }finally{await context.close()}
 }
 assert.equal((await fetch(origin+'/not-a-real-page')).status,404);
 writeFileSync(resolve(output,'results.json'),JSON.stringify(results,null,2));console.log('PASS: 16 browser cases, four keyboard navigation journeys and missing URL 404.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}

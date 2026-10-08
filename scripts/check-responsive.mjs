import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { chromium, webkit } from '@playwright/test';
const root=process.cwd(),output=resolve(process.env.LANDING_TEST_OUTPUT||'test-results/responsive');mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.json':'application/json'};
let server, browser;
const results=[],errors=[];
let origin=process.env.LANDING_TEST_ORIGIN;
if(!origin){
 server=createServer((req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);const file=existsSync(path)&&statSync(path).isDirectory()?resolve(path,'index.html'):path;if(!file.startsWith(root+sep)||!existsSync(file)){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(readFileSync(file));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
}
const engine=process.env.LANDING_TEST_BROWSER==='webkit'?webkit:chromium;
// macOS WebKit uses Option-Tab to include links when Full Keyboard Access is off.
const tabKey=engine===webkit?'Alt+Tab':'Tab',backTabKey=engine===webkit?'Alt+Shift+Tab':'Shift+Tab';
async function capture(page,name,data={}){
 const path=resolve(output,name+'.png');await page.screenshot({path});
 results.push({name,url:page.url(),viewport:page.viewportSize(),language:await page.locator('html').getAttribute('lang'),mode:await page.locator('body').getAttribute('class'),screenshot:path,...data});
}
async function settle(page){await page.waitForTimeout(350);}
async function load(page,path){await page.goto(origin+path,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await settle(page);}
async function dismiss(page){const button=page.locator('#ckEss');if(await button.count()){await button.click();await page.waitForTimeout(550);}}
async function visibleContent(page,selector){
 return page.locator(selector).evaluate(n=>{const r=n.getBoundingClientRect();let p=n;while(p){const s=getComputedStyle(p);if(s.visibility==='hidden'||s.display==='none'||Number(s.opacity)<.95)return false;p=p.parentElement;}return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;});
}
try{
 browser=await engine.launch({headless:true});
 for(const lang of ['es','en']){
  const context=await browser.newContext({viewport:{width:812,height:375}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of [[812,375],[667,375],[568,320]]){
   await page.setViewportSize({width,height});await load(page,lang==='en'?'/en/':'/');await dismiss(page);
   assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('cinema-ready')),false,'short viewport uses normal flow');
   const action=page.locator('.act-hero .cta a').last();await action.scrollIntoViewIfNeeded();await settle(page);
   assert.ok(await visibleContent(page,'.act-hero .cta a:last-child'),'complete hero action visible');
   const y=await page.evaluate(()=>scrollY);await page.waitForTimeout(300);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-y)<2,'normal flow does not snap');
   await capture(page,`${lang}-hero-${width}x${height}`);
  }
  for(const width of [320,375,390]){
   await page.setViewportSize({width,height:812});await load(page,lang==='en'?'/en/':'/');await dismiss(page);
   await page.locator('.pcard.feat').scrollIntoViewIfNeeded();await settle(page);
   const metrics=await page.locator('.pcard.feat').evaluate(card=>{const c=card.getBoundingClientRect();const nodes=[...card.querySelectorAll('.pwas,.current-price,.current-price span')];return {bounds:c.toJSON(),text:nodes.map(n=>({text:n.textContent,rect:n.getBoundingClientRect().toJSON()})),width:innerWidth,documentWidth:document.documentElement.scrollWidth};});
   assert.ok(metrics.text.every(n=>n.rect.left>=metrics.bounds.left&&n.rect.right<=metrics.bounds.right),'all price parts fit');
   assert.ok(metrics.documentWidth<=width+1,'no page horizontal overflow');
   await capture(page,`${lang}-pricing-${width}`,{metrics});
  }
  await page.setViewportSize({width:320,height:812});await load(page,lang==='en'?'/en/':'/');await dismiss(page);
  const toggle=page.locator('.nav-toggle');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#navlinks a:visible').count(),6);
  await page.keyboard.press(tabKey);assert.ok(await page.locator('#navlinks a').first().evaluate(n=>n===document.activeElement));
  await page.keyboard.press(backTabKey);assert.ok(await toggle.evaluate(n=>n===document.activeElement));
  await page.keyboard.press(tabKey);await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.ok(await toggle.evaluate(n=>n===document.activeElement));
  await capture(page,`${lang}-menu-escape`);await toggle.click();await capture(page,`${lang}-mobile-menu`);
  await page.locator('#navlinks a[data-go="2"]').click();await settle(page);assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.ok(await page.locator('#story-2').evaluate(n=>n.contains(document.activeElement)));
  await page.locator('#dots button').last().click();await page.waitForTimeout(600);
  assert.equal(await page.locator('#slabel').textContent(),lang==='en'?'Patterns':'Patrones');
  await capture(page,`${lang}-phone-last-slide`);
  for(let i=0;i<4;i++){await page.locator('#dots button').nth(i).click();await page.waitForTimeout(500);assert.equal(await page.locator('#dots button').nth(i).getAttribute('class'),'on');}
  await toggle.click();await page.mouse.click(310,790);await settle(page);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  for(const width of [899,900,901,900,901]){
   await page.setViewportSize({width,height:1000});await settle(page);
   assert.equal(await toggle.isVisible(),width<=900);
   assert.equal(await page.locator('#navlinks').isVisible(),width>900);
   if(width<=900){await toggle.click();assert.ok(await page.locator('#navlinks').isVisible());await page.keyboard.press('Escape');}
  }
  await capture(page,`${lang}-nav-901`);
  for(const height of [599,600,601]){await page.setViewportSize({width:812,height});await settle(page);assert.equal(await page.locator('.act-hero .cta a').last().evaluate(n=>n.getBoundingClientRect().height>0),true);}
  await page.setViewportSize({width:1440,height:1000});await load(page,lang==='en'?'/en/':'/');await dismiss(page);
  assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('cinema-ready')),true,'desktop cinema preserved');
  // Actual native keyboard traversal, not synthetic tabindex inspection.
  await page.keyboard.press(tabKey);await page.keyboard.press(tabKey);
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-go')),'2');
  await page.keyboard.press('Enter');await settle(page);
  assert.ok(await page.locator('#story-2').evaluate(n=>n.contains(document.activeElement)));
  assert.ok(await visibleContent(page,'#story-2 .scene-tag'),'Product lands on visible phone scene');
  await capture(page,`${lang}-keyboard-product`);
  for(const [go,id] of [['3','story-3'],['1','story-1']]){
   if(go==='1'){
    await load(page,lang==='en'?'/en/':'/');
    for(let tabs=0;tabs<25&&await page.evaluate(()=>document.activeElement.getAttribute('data-go'))!=='1';tabs++)await page.keyboard.press(tabKey);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-go')),'1','Tab reaches the hero story link');
   }else await page.locator(`[data-go="${go}"]`).first().focus();
   await page.keyboard.press('Enter');await settle(page);
   assert.ok(await page.locator('#'+id).evaluate(n=>n.contains(document.activeElement)),`Keyboard destination ${id} receives focus: ${JSON.stringify(await page.evaluate(()=>({active:document.activeElement.outerHTML.slice(0,220),scrollY,cur,target,mode:document.body.className})))}`);
   assert.ok(await visibleContent(page,'#'+id+' h2'));
   await capture(page,`${lang}-keyboard-${id}`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await settle(page);assert.equal(await page.evaluate(()=>document.activeElement.closest('.act')?.id),'story-1','Focus survives entering reduced motion');assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('cinema-ready')),false);
  await page.locator('[data-go="3"]').first().focus();await page.keyboard.press('Enter');await settle(page);assert.ok(await visibleContent(page,'#story-3 h2'));await capture(page,`${lang}-reduced-motion`);
  await page.emulateMedia({reducedMotion:'no-preference'});await settle(page);assert.equal(await page.evaluate(()=>document.activeElement.closest('.act')?.id),'story-3','Focus survives returning to cinema');await capture(page,`${lang}-motion-focus-preserved`);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('cinema-ready')),true);
  await page.setViewportSize({width:812,height:375});await settle(page);await page.setViewportSize({width:375,height:812});await settle(page);await capture(page,`${lang}-rotation`);
  console.log(`Checked ${lang} responsive and keyboard states.`);await context.close();
 }
 // Preserve readable public pages and destinations without JavaScript.
 for(const path of ['/','/en/']){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:812}}),page=await context.newPage();
  await load(page,path);assert.ok(await page.locator('#navlinks').isVisible());
  for(let tabs=0;tabs<15&&await page.evaluate(()=>document.activeElement.getAttribute('data-go'))!=='3';tabs++)await page.keyboard.press(tabKey);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-go')),'3');await page.keyboard.press('Enter');assert.ok(page.url().endsWith('#story-3'));await page.waitForTimeout(700);const heading=await page.locator('#story-3 h2').boundingBox();assert.ok(heading);if(heading.y<0||heading.y+heading.height>812){await page.mouse.wheel(0,heading.y-160);await settle(page);}assert.ok(await visibleContent(page,'#story-3 h2'));await capture(page,path==='/en/'?'en-no-js':'es-no-js');await context.close();
 }
 assert.deepEqual(errors,[],'no browser runtime errors');
 rmSync(resolve(output,'failure.json'),{force:true});
 writeFileSync(resolve(output,'results.json'),JSON.stringify({origin,browser:engine.name(),keyboardTraversal:tabKey,results,errors},null,2));
 console.log(`PASS: ${results.length} responsive evidence states (${engine.name()}), no runtime errors.`);
}catch(error){writeFileSync(resolve(output,'failure.json'),JSON.stringify({message:error.message,stack:error.stack,results,errors},null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}

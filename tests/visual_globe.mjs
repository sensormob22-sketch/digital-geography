// Browser-level visual regression for the actual built Astro site.
// Run: npm run build && npm install --no-save playwright && npx playwright install chromium
// then: node tests/visual_globe.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT=4175,BASE='http://127.0.0.1:'+PORT;
const dir=path.resolve('visual-output');fs.mkdirSync(dir,{recursive:true});
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<45;i++){
  try{const r=await fetch(BASE+'/globus/index.html');if(r.ok)return}catch{}
  await wait(450);
 }
 throw new Error('Built site local web server did not start');
}
function emit(name,file){
 if(process.env.EMIT_PREVIEW_BASE64!=='true')return;
 const b64=fs.readFileSync(file).toString('base64');
 console.log('GLOBE_IMAGE_BEGIN:'+name);
 for(let i=0;i<b64.length;i+=3072)console.log('GLOBE_IMAGE_DATA:'+b64.slice(i,i+3072));
 console.log('GLOBE_IMAGE_END:'+name);
}
const errors=[];
let browser,page;
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 page=await browser.newPage({viewport:{width:1365,height:900},deviceScaleFactor:1,locale:'ru-RU'});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',msg=>{if(msg.type()==='error')console.log('BROWSER_CONSOLE_ERROR:',msg.text().slice(0,300))});
 async function setSiteLanguage(next){
  const r=await page.goto(BASE+'/#home',{waitUntil:'domcontentloaded'});
  assert(r?.ok(),'Homepage failed');
  await page.locator('.home-welcome').waitFor();
  assert(await page.locator('#globalLanguageSwitch').isVisible(),'Home language switch missing');
  await page.locator('#globalLanguageSwitch [data-lang="'+next+'"]').click();
  await page.waitForFunction(language=>document.documentElement.lang===language,next);
  assert.equal(await page.locator('.home-feature').count(),3);
 }
 async function open(url){
  const response=await page.goto(BASE+url,{waitUntil:'domcontentloaded',timeout:30000});
  assert(response?.ok(),'Failed to open '+url);
  await page.waitForSelector('#groups .place',{timeout:15000});
  await page.waitForFunction(()=>document.getElementById('status').hidden,{timeout:20000});
  await page.waitForFunction(()=>document.documentElement.dataset.geodata==='50m',{timeout:20000});
 }
 async function choose(s){
  const button=page.locator('#groups button.place').filter({has:page.getByText(s,{exact:true})}).first();
  assert(await button.count(), 'Cannot locate catalogue item: '+s);
  const group=button.locator('xpath=ancestor::details').first();
  if(await group.getAttribute('open')===null)await group.locator('summary').click();
  await button.click();
  await page.waitForFunction(n=>document.getElementById('factName').textContent.trim()===n,s,{timeout:8000});
  await page.waitForFunction(()=>document.getElementById('stage').dataset.flight==='done',{timeout:15000});
  await wait(200);
 }
 async function pixelSummary(){
  return page.locator('#points').evaluate(canvas=>{
   const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   let a=0,cyan=0,pink=0,yellow=0;
   for(let i=0;i<pixels.length;i+=4*5){
    const r=pixels[i],g=pixels[i+1],b=pixels[i+2],opacity=pixels[i+3];
    if(opacity>40)a++;
    if(opacity>50&&b>110&&g>130&&g>r*1.4)cyan++;
    if(opacity>50&&r>150&&b>75&&r>g*1.35)pink++;
    if(opacity>50&&r>180&&g>110&&b<170)yellow++;
   }
   return {opaque:a,cyan,pink,yellow,width:canvas.width,height:canvas.height};
  });
 }
 // Physical / natural-feature contour at production desktop size.
 await setSiteLanguage('ru');
 const homePicture=path.join(dir,'homepage_welcome_ru.jpg');
 await page.screenshot({path:homePicture,type:'jpeg',quality:72,fullPage:true});
 emit('homepage_welcome_ru',homePicture);
 await open('/globus/index.html?grade=6&lang=en&theme=light');
 assert.equal(await page.locator('.languages [data-lang]').count(),0,'No internal language toggles');
 assert.equal(await page.locator('html').getAttribute('lang'),'ru','URL lang must not override homepage');
 assert.match(await page.locator('#mapMode').innerText(),/Физический/);
 assert(await page.locator('#points').evaluate(c=>!!c.getContext('2d')));
 await choose('Гималаи');
 assert.match(await page.locator('#factName').innerText(),/Гималаи/);
 assert.deepEqual(await page.locator('#factMeta dt').allInnerTexts(),['Тип объекта','Тематическая группа','Точка-ориентир']);
 assert.equal(await page.locator('#factMeta dd').count(),3);
 assert.equal(await page.locator('#count,.counter').count(),0);
 assert(!/Границы на глобусе|^Карта$/m.test(await page.locator('#factPanel').innerText()));
 assert.equal(await page.locator('#legendPanel input[type="checkbox"]').count(),0,'Contour toggles must not be present');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.geodata),'50m');
 assert.match(await page.locator('#hint').innerText(),/Перетаскивайте/);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.relief),'8192','8K NASA relief failed');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.hydro),'ready','Natural Earth rivers/lakes missing');
 assert.equal(await page.locator('#stage').getAttribute('data-marker-label'),'Гималаи');
 // Native accordion: collapsing legend gives the flexible nomenclature list room.
 const beforePanel=await page.locator('.sidebar-content .panel').evaluate(e=>e.getBoundingClientRect().height);
 assert(!await page.locator('#legendPanel').evaluate(e=>e.open),'Legend should be collapsed initially');
 await page.locator('#legendPanel summary').click();await wait(450);
 const expandedPanel=await page.locator('.sidebar-content .panel').evaluate(e=>e.getBoundingClientRect().height);
 assert(beforePanel>expandedPanel+20,'Nomenclature list did not shrink while opening legend');
 await page.locator('#legendPanel summary').click();await wait(450);
 const afterPanel=await page.locator('.sidebar-content .panel').evaluate(e=>e.getBoundingClientRect().height);
 assert(afterPanel>expandedPanel+20,'Nomenclature list did not grow after collapsing legend');
 // Dynamic accordion changes must never stretch canvas image/coordinates.
 await page.locator('#groups details.group').first().locator('summary').click();await wait(350);
 const canvasSize=await page.evaluate(()=>{const st=document.getElementById('stage').getBoundingClientRect(),c=document.getElementById('points');return {stageRatio:st.width/st.height,canvasRatio:c.width/c.height}});
 assert(Math.abs(canvasSize.stageRatio-canvasSize.canvasRatio)<.01,'Globe aspect changed after nomenclature accordion');
 // The selected marker label and smooth multi-phase flight are part of real canvas rendering.
 await choose('Альпы');
 assert.equal(await page.locator('#stage').getAttribute('data-marker-label'),'Альпы');
 assert.equal(await page.locator('#stage').getAttribute('data-flight'),'done');
 assert.equal(await page.locator('#stage').getAttribute('data-flight-history'),'out→rotate→in→done','Flight must visit every phase');
 await choose('Гималаи');
 let pix=await pixelSummary();
 assert(pix.opaque>200,'Physical globe overlay is blank');
 assert(pix.cyan>30,'Natural feature outlines are not drawn');
 const physical=path.join(dir,'physical_himalayas_ru.jpg');
 await page.screenshot({path:physical,quality:70,type:'jpeg',fullPage:true});
 console.log('PHYSICAL_BROWSER_OK',JSON.stringify(pix));
 emit('physical_himalayas_ru',physical);
 // Selected natural contour is automatic; no layers can be manually toggled.
 assert(await page.locator('#points').evaluate(c=>!!c.getContext('2d')));
 // Political / megaregion contour; switches to EN without dropping selection.
 await open('/globus/index.html?grade=11&lang=ru&theme=dark');
 await choose('Босваш (Приатлантический)');
 assert.match(await page.locator('#mapMode').innerText(),/Политический/);
 pix=await pixelSummary();
 assert(pix.pink>20,'Urban megaregion contour is not visible');
 await setSiteLanguage('en');
 await open('/globus/index.html?grade=11&lang=ru&theme=dark');
 const englishBoswash=await page.evaluate(()=>window.GLOBE_TRANSLATIONS.name('Босваш (Приатлантический)','en'));
 await choose(englishBoswash);
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 assert.match(await page.locator('#factHeading').innerText(),/About this location/);
 assert.match(await page.locator('#factName').innerText(),/BosWash/);
 await page.waitForFunction(()=>document.getElementById('stage').dataset.markerLabel.startsWith('BosWash'),{timeout:8000});
 assert.match(await page.locator('#legendTitle').innerText(),/Map legend/);
 assert.match(await page.locator('#hint').innerText(),/Drag to rotate/);
 assert.equal(await page.locator('#plus').getAttribute('title'),'Zoom in');
 assert.equal(await page.locator('#legendPanel input[type="checkbox"]').count(),0);
 await page.locator('#legendPanel summary').click();
 assert((await page.locator('#legendPanel').innerText()).includes('Rivers')||(await page.locator('#legendPanel').innerText()).includes('Реки'),'Hydrology key missing from political legend');
 await page.locator('#legendPanel summary').click();
 assert.deepEqual(await page.locator('#factMeta dt').allInnerTexts(),['Object type','Topic group','Reference point']);
 assert.equal(await page.locator('#factMeta dd').count(),3);
 assert.equal(await page.locator('#count,.counter').count(),0);
 assert(!/Outline on globe|^Map$/m.test(await page.locator('#factPanel').innerText()));
 const political=path.join(dir,'political_boswash_en.jpg');
 await page.screenshot({path:political,type:'jpeg',quality:70,fullPage:true});
 console.log('POLITICAL_BROWSER_OK',JSON.stringify(pix));
 emit('political_boswash_en',political);
 // Mobile: semantic info panel, readable legend and no horizontal scrolling.
 await page.goto(BASE+'/works/9/3/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.lang==='en',{timeout:15000});
 assert.equal(await page.locator('[data-language]').count(),0,'Meteolab language controls must be absent');
 await setSiteLanguage('be');
 await page.setViewportSize({width:390,height:844});
 await open('/globus/index.html?grade=9&lang=ru&theme=dark');
 assert.equal(await page.locator('html').getAttribute('lang'),'be');
 await page.waitForFunction(()=>document.documentElement.dataset.belarusRelief==='ready',{timeout:30000});
 assert.match(await page.locator('#mapMode').innerText(),/Фізічны/);
 const belarusName=await page.evaluate(()=>window.GLOBE_TRANSLATIONS.name('Белорусская гряда','be'));
 await page.evaluate(()=>{
  window.__flightMin=Infinity;const stage=document.getElementById('stage');
  new MutationObserver(()=>{
   const z=parseFloat(stage.dataset.flightZoom);
   if(Number.isFinite(z))window.__flightMin=Math.min(window.__flightMin,z);
  }).observe(stage,{attributes:true,attributeFilter:['data-flight-zoom']});
 });
 await choose(belarusName);
 assert((await page.evaluate(()=>window.__flightMin))>=6.9,'Grade 9 zoom-out exceeded Europe scale');
 const belarusPicture=path.join(dir,'belarus_elevation_grade9_be.jpg');
 await page.screenshot({path:belarusPicture,type:'jpeg',quality:78,fullPage:true});
 emit('belarus_elevation_grade9_be',belarusPicture);
 await choose('Мінск');
 assert.equal((await page.locator('#factName').innerText()).trim(),'Мінск');
 assert.match(await page.locator('#legendTitle').innerText(),/Умоўныя абазначэнні/);
 assert.match(await page.locator('#mapMode').innerText(),/Палітычны/);
 assert.deepEqual(await page.locator('#factMeta dt').allInnerTexts(),['Тып аб’екта','Тэматычная група','Кропка-арыенцір']);
 assert.equal(await page.locator('#factMeta dd').count(),3);
 assert.equal(await page.locator('#count,.counter').count(),0);
 assert.match(await page.locator('#hint').innerText(),/Перацягвайце/);
 const overflow=await page.evaluate(()=>({
   documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
   descriptionSize:parseFloat(getComputedStyle(document.querySelector('.fact-description')).fontSize),
   metaSize:parseFloat(getComputedStyle(document.getElementById('factMeta')).fontSize),
   cardWidth:document.getElementById('factPanel').getBoundingClientRect().width,
   cardContentWidth:document.getElementById('factMeta').getBoundingClientRect().width
 }));
 assert(overflow.descriptionSize>=12.5&&overflow.metaSize>=11.5,'Mobile card text is too small');
 assert(overflow.cardContentWidth<=overflow.cardWidth,'Mobile reference information exceeds card bounds');
 assert(overflow.documentWidth<=overflow.viewportWidth+4,'Horizontal overflow on mobile '+JSON.stringify(overflow));
 // Fullscreen control must be operable in a mobile viewport and reversible.
 await page.locator('#fullscreen').click();await wait(350);
 assert(await page.evaluate(()=>Boolean(document.fullscreenElement)||document.getElementById('globeLayout').classList.contains('is-fullscreen')),'Mobile fullscreen entry failed');
 await page.locator('#fullscreen').click();await wait(350);
 assert(!await page.evaluate(()=>Boolean(document.fullscreenElement)||document.getElementById('globeLayout').classList.contains('is-fullscreen')),'Mobile fullscreen exit failed');
 const mobile=path.join(dir,'mobile_minsk_be.jpg');
 await page.screenshot({path:mobile,type:'jpeg',quality:68,fullPage:true});
 console.log('MOBILE_BROWSER_OK',JSON.stringify(overflow));
 emit('mobile_minsk_be',mobile);
 assert.equal(errors.length,0,'JavaScript page errors:\n'+errors.join('\n'));
 console.log('VISUAL_BROWSER_TESTS_PASSED — actual built globe screenshots in visual-output/');
}catch(e){
 console.error('VISUAL_BROWSER_TEST_FAILED',e?.stack||String(e));
 if(page){try{const p=path.join(dir,'failure_browser_state.jpg');await page.screenshot({path:p,quality:68,type:'jpeg',fullPage:true,timeout:8000});emit('failure_browser_state',p)}catch(err){console.error('Failure screenshot:',String(err))}}

 process.exitCode=1;
}finally{await browser?.close().catch(()=>{});server.kill('SIGTERM')}

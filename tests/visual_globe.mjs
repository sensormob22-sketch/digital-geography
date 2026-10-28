// Browser-level visual regression for the actual built Astro site.
// Run: npm run build && npm install --no-save playwright && npx playwright install chromium
// then: node tests/visual_globe.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { chromium } from 'playwright';
const PORT=4175,BASE='http://127.0.0.1:'+PORT;
const dir=path.resolve('visual-output');fs.mkdirSync(dir,{recursive:true});
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 // Do not use Node's experimental Undici fetch for the readiness probe:
 // some Node 22 runners crash at Parser.finish during an early socket close.
 for(let i=0;i<45;i++){
  const available=await new Promise(resolve=>{
   let settled=false;const done=ok=>{if(!settled){settled=true;resolve(ok)}};
   const req=http.get(BASE+'/globus/index.html',res=>{
    res.resume();
    res.once('end',()=>done(res.statusCode===200));
    res.once('error',()=>done(false));
   });
   req.setTimeout(1800,()=>req.destroy());
   req.once('error',()=>done(false));
  });
  if(available)return;
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
 // Real responsive parent site: one title, no footer, full-width workspace.
 await page.goto(BASE+'/#practice',{waitUntil:'domcontentloaded'});
 await page.locator('.geography-class-grid .animated-class-link').first().waitFor({timeout:12000});
 assert.equal(await page.locator('.geography-class-grid .animated-class-link').count(),6);
 assert.equal(await page.locator('#pageContent h1').count(),1,'Practice catalog should have exactly one visible section heading');
 assert.match(await page.locator('#pageContent h1').innerText(),/Практические работы по географии/);
 assert.equal(await page.locator('.footer').count(),0,'No bottom footer band');
 const tileAnimation=await page.locator('.scene-frame').first().evaluate(el=>getComputedStyle(el).animationName);
 assert(tileAnimation.includes('scene-reel'),'Thematic grade-card animation is not running');
 const desktopFrames=await page.locator('.geography-class-grid .animated-class-link').first().evaluate(el=>({
  negativeDelay:getComputedStyle(el.querySelectorAll('.scene-frame')[1]).animationDelay,
  all:Array.from(el.querySelectorAll('.scene-frame')).map(x=>getComputedStyle(x).opacity)
 }));
 assert(desktopFrames.negativeDelay.startsWith('-'),'Desktop animated cards must start with staggered NEGATIVE delays: '+JSON.stringify(desktopFrames));
 assert(desktopFrames.all.some(v=>Number(v)>.5),'At least one thematic frame must be visible immediately on desktop: '+JSON.stringify(desktopFrames));
 const practiceShot=path.join(dir,'practice_cards_desktop_ru.jpg');
 await page.screenshot({path:practiceShot,type:'jpeg',quality:72,fullPage:true});
 emit('practice_cards_desktop_ru',practiceShot);
 // Test the REAL embedded grade-9 desktop globe, not a standalone helper
 // and not merely the math in belarus-view.js.
 await page.goto(BASE+'/#nomenclature/9',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{
  const doc=document.getElementById('geographyGlobe')?.contentDocument;
  const stage=doc?.getElementById('stage');
  return doc?.documentElement.dataset.belarusOblasts==='ready' &&
    stage?.dataset.belarusFitMode==='desktop' &&
    Number(stage.dataset.belarusCoverageHeight)>0;
 },null,{timeout:35000});
 const desktopBelarus=await page.locator('#geographyGlobe').evaluate(frame=>{
  const doc=frame.contentDocument,stage=doc.getElementById('stage');
  return {frame:frame.clientWidth,stageWidth:stage.clientWidth,
   stageHeight:stage.clientHeight,mode:stage.dataset.belarusFitMode,
   widthFraction:Number(stage.dataset.belarusCoverageWidth),
   heightFraction:Number(stage.dataset.belarusCoverageHeight),
   zoom:Number(stage.dataset.zoom),home:Number(stage.dataset.belarusDefaultZoom)};
 });
 assert(desktopBelarus.heightFraction>=.68&&desktopBelarus.heightFraction<=.755,
  'Initial DESKTOP Belarus must occupy ~3/4 of actual stage height: '+JSON.stringify(desktopBelarus));
 assert(desktopBelarus.widthFraction<=.935&&desktopBelarus.widthFraction>.65,
  'Full Belarus borders must fit horizontally with small margins: '+JSON.stringify(desktopBelarus));
 assert(Math.abs(desktopBelarus.zoom-desktopBelarus.home)<.2,
  'Default desktop fit zoom must actually be applied, not merely calculated: '+JSON.stringify(desktopBelarus));
 console.log('BELARUS_DESKTOP_75_PERCENT_VISIBLE_OK',JSON.stringify(desktopBelarus));
 const desktopBelarusShot=path.join(dir,'belarus_desktop_initial_75_percent_ru.jpg');
 await page.screenshot({path:desktopBelarusShot,quality:78,type:'jpeg',fullPage:false});
 emit('belarus_desktop_initial_75_percent_ru',desktopBelarusShot);
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE+'/#practice',{waitUntil:'domcontentloaded'});
 await page.locator('.animated-class-link').first().waitFor({timeout:12000});
 assert.equal(await page.locator('.animated-class-link').count(),6,'Six cards must also appear on phones');
 const widthMobile=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert(widthMobile.doc<=widthMobile.viewport+4,'Mobile grade cards overflow: '+JSON.stringify(widthMobile));
// Check the actual embedded globe, not just a standalone page. The previous
// regression left a 300px-wide sidebar column and squeezed the globe into
// the few pixels remaining on small screens.
 for(const w of [320,390,768]){
  await page.setViewportSize({width:w,height:844});
  await page.goto(BASE+'/#nomenclature/9',{waitUntil:'domcontentloaded'});
  await page.locator('#geographyGlobe').waitFor({timeout:12000});
  await page.waitForFunction(()=>{
   const f=document.getElementById('geographyGlobe');
   return f?.contentDocument?.getElementById('stage')?.getBoundingClientRect().width>50;
  },{timeout:15000});
  const mobileLayout=await page.locator('#geographyGlobe').evaluate(frame=>{
   const doc=frame.contentDocument;
   const stage=doc.getElementById('stage').getBoundingClientRect();
   const sidebar=doc.getElementById('globeSidebar').getBoundingClientRect();
   const container=doc.getElementById('globeLayout').getBoundingClientRect();
   return {frame:frame.getBoundingClientRect().width,stageWidth:stage.width,
    sidebarWidth:sidebar.width,stageBottom:stage.bottom,
    sidebarTop:sidebar.top,layoutWidth:container.width,
    scrollWidth:doc.documentElement.scrollWidth,viewportWidth:doc.defaultView.innerWidth};
  });
  assert(mobileLayout.stageWidth/mobileLayout.frame>.87,
   'Mobile globe squeezed to a narrow strip: '+w+' '+JSON.stringify(mobileLayout));
  assert(Math.abs(mobileLayout.stageWidth-mobileLayout.sidebarWidth)<5,
   'Globe and nomenclature should occupy the same full-width column: '+JSON.stringify(mobileLayout));
  assert(mobileLayout.sidebarTop>=mobileLayout.stageBottom-2,
   'Nomenclature must be below the globe on '+w+'px: '+JSON.stringify(mobileLayout));
  assert(mobileLayout.scrollWidth<=mobileLayout.viewportWidth+4,
   'Embedded globe overflows horizontally: '+JSON.stringify(mobileLayout));
  console.log('EMBEDDED_MOBILE_GLOBE_LAYOUT_OK',w,JSON.stringify(mobileLayout));
  if(w===390){
   const mobileGlobeShot=path.join(dir,'embedded_globe_mobile_390_ru.jpg');
   await page.screenshot({path:mobileGlobeShot,type:'jpeg',quality:76,fullPage:false});
   emit('embedded_globe_mobile_390_ru',mobileGlobeShot);
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE+'/#practice',{waitUntil:'domcontentloaded'});
 await page.locator('.animated-class-link').first().waitFor({timeout:12000});
 const practiceMobile=path.join(dir,'practice_cards_mobile_ru.jpg');
 await page.screenshot({path:practiceMobile,type:'jpeg',quality:72,fullPage:true});
 emit('practice_cards_mobile_ru',practiceMobile);
 await page.setViewportSize({width:1365,height:900});
 await page.goto(BASE+'/#nomenclature/6',{waitUntil:'domcontentloaded'});
 await page.locator('#geographyGlobe').waitFor({timeout:12000});
 assert.equal(await page.locator('.hero,.globe-area-title,.footer').count(),0,'Duplicate heading/footer must be removed from embedded catalog');
 const widths=await page.evaluate(()=>{
  const c=document.getElementById('pageContent').getBoundingClientRect(),g=document.querySelector('.globe-area').getBoundingClientRect();
  return {container:c.width,globe:g.width};
 });
 assert(widths.globe/widths.container>.95,'Globe must use almost all main content width: '+JSON.stringify(widths));
 await open('/globus/index.html?grade=6&lang=en&theme=light');
 assert.equal(await page.locator('.languages [data-lang]').count(),0,'No internal language toggles');
 assert.equal(await page.locator('html').getAttribute('lang'),'ru','URL lang must not override homepage');
 assert.match(await page.locator('#mapMode').innerText(),/Физический/);
 assert(await page.locator('#points').evaluate(c=>!!c.getContext('2d')));
 await choose('Гималаи');
 assert.equal(await page.locator('#gradeButtons').isVisible(),false,'No duplicated desktop class navigation in globe');
 assert((await page.locator('#groups details.group[open]').count())<=1,'Only one catalogue topic can stay expanded');
 assert.equal(await page.locator('#back').count(),0,'Recursive На сайт hyperlink must be absent');
 assert.match(await page.locator('#factName').innerText(),/Гималаи/);
 // Independent +/- even with a selected object; no forced camera snapback.
 const zoomBefore=Number(await page.locator('#stage').getAttribute('data-zoom'));
 await page.locator('#plus').click();
 await page.waitForFunction(z=>Number(document.getElementById('stage').dataset.zoom)>z*1.1,zoomBefore);
 const zoomPlus=Number(await page.locator('#stage').getAttribute('data-zoom'));
 await page.locator('#minus').click();
 await wait(900);
 const minusResult=Number(await page.locator('#stage').getAttribute('data-zoom'));
 console.log('MANUAL_ZOOM_DIAGNOSTICS',JSON.stringify({zoomBefore,zoomPlus,minusResult}));
 assert(minusResult<zoomPlus*.93,'Zoom-out button must reduce zoom: '+JSON.stringify({zoomBefore,zoomPlus,minusResult}));
 assert.match(await page.locator('#factName').innerText(),/Гималаи/);
 // Manual zoom also works with no active object.
 await page.locator('#factClose').click();
 const noSelectionZoom=Number(await page.locator('#stage').getAttribute('data-zoom'));
 await page.locator('#plus').click();
 await page.waitForFunction(z=>Number(document.getElementById('stage').dataset.zoom)>z,noSelectionZoom);
 await choose('Гималаи');
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
 // Real water path, not just a marker: pulse is drawn on independent canvas.
 await choose('Нил');
 await page.waitForFunction(()=>document.getElementById('stage').dataset.activeWater.length>0,{timeout:8000});
 const activeName=await page.locator('#stage').getAttribute('data-active-water');
 console.log('ACTIVATED_NILE_WATER_GEOMETRY',activeName);
 const focusPixels=await page.locator('#focusLayer').evaluate(c=>{
   const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let count=0;for(let i=3;i<p.length;i+=4)if(p[i]>85)count++;return count;
 });
 assert(focusPixels>25,'Watercourse should be highlighted along the actual river course');
 const desktopWaterLayer=await page.locator('#focusLayer').evaluate(x=>({
  z:getComputedStyle(x).zIndex,base:getComputedStyle(document.getElementById('points')).zIndex
 }));
 assert(+desktopWaterLayer.z>+desktopWaterLayer.base,'Animated water layer must be ABOVE opaque desktop vector-map polygons');
 const firstPulse=Number(await page.locator('#stage').getAttribute('data-water-pulse'))||0;
 await page.waitForFunction(previous=>Number(document.getElementById('stage').dataset.waterPulse)>previous,firstPulse,{timeout:5000});
 console.log('DESKTOP_RIVER_PULSE_OK',JSON.stringify({firstPulse,desktopWaterLayer}));
 await choose('Байкал');
 await page.waitForFunction(()=>document.getElementById('stage').dataset.activeWater.length>0,{timeout:8000});
 const waterZoom=Number(await page.locator('#stage').getAttribute('data-zoom'));
 assert(waterZoom>11,'Large selected lake must zoom in based on its outline');
 await choose('Гималаи');
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
 assert.deepEqual(await page.locator('#factMeta dt').allInnerTexts(),['Object type','Population','Principal cities']);
 assert.match(await page.locator('#factMeta dd').nth(1).innerText(),/51.8 million/);
 assert.match(await page.locator('#factMeta dd').nth(2).innerText(),/Boston.*New York.*Washington/);
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
 await page.waitForFunction(()=>document.documentElement.dataset.belarusHydro==='ready',{timeout:30000});
 await page.waitForFunction(()=>document.documentElement.dataset.belarusOblasts==='ready',{timeout:30000});
 const initialBelarus=await page.locator('#stage').evaluate(x=>({
  zoom:Number(x.dataset.zoom),home:Number(x.dataset.belarusDefaultZoom),
  width:x.clientWidth,height:x.clientHeight
 }));
 assert(initialBelarus.home>9&&Math.abs(initialBelarus.zoom-initialBelarus.home)<.12,
  'Belarus must open fitted to ~3/4 of its mobile viewport: '+JSON.stringify(initialBelarus));
 console.log('BELARUS_DEFAULT_ATLAS_VIEW_OK',JSON.stringify(initialBelarus));
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
 // Verified named river routes should highlight their full source courses.
 for(const raw of ['Днепр','Березина','Неман','Западный Буг']){
  const name=await page.evaluate(raw=>window.GLOBE_TRANSLATIONS.name(raw,'be'),raw);
  await choose(name);
  const route=await page.locator('#stage').getAttribute('data-active-water');
  assert(route&&route.length>0,'Missing highlighted Belarusian river source: '+raw);
  console.log('BELARUS_RIVER_ROUTE_OK',raw,route);
 }
 await choose('Мінск');
 const belarusCityZoom=Number(await page.locator('#stage').getAttribute('data-zoom'));
 assert(Math.abs(belarusCityZoom/initialBelarus.home-1.08)<.025,
  'Grade 9 city zoom must be gentle (~8%): '+JSON.stringify({belarusCityZoom,initialBelarus}));
 assert.equal((await page.locator('#factName').innerText()).trim(),'Мінск');
 assert.match(await page.locator('#legendTitle').innerText(),/Умоўныя абазначэнні/);
 assert.match(await page.locator('#mapMode').innerText(),/Палітычны/);
 assert.deepEqual(await page.locator('#factMeta dt').allInnerTexts(),['Тып аб’екта','Вобласць','Насельніцтва горада']);
 assert.equal(await page.locator('#factMeta dd').nth(2).innerText(),new Intl.NumberFormat('be-BY').format(1995091)+' (2026)');
 assert(await page.locator('#factIcon img').count()===1,'Minsk city heraldic pictogram missing');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.belarusOblasts),'ready','Belarus six oblasts + Minsk city were not loaded');
 if(!await page.locator('#legendPanel').evaluate(el=>el.open))await page.locator('#legendPanel summary').click();
 const regionLegend=await page.locator('#legendPanel .legend-row').allTextContents();
 assert(regionLegend.some(s=>s.includes('Брэсцкая вобласць')),'Brest colored legend missing');
 assert(regionLegend.some(s=>s.includes('Гомельская вобласць')),'Gomel colored legend missing');
 const belarusRegionsImage=path.join(dir,'belarus_six_oblasts_grade9_be.jpg');
 await page.screenshot({path:belarusRegionsImage,type:'jpeg',quality:76,fullPage:false});
 emit('belarus_six_oblasts_grade9_be',belarusRegionsImage);
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
 // Belarus country names must follow the map projection (not fixed DOM overlays).
 const regionProj=await page.locator('#points').evaluate(el=>{
  const data=document.getElementById('stage').dataset;
  return {width:el.width,height:el.height};
 });
 assert(regionProj.width>0&&regionProj.height>0,'Belarus political labels need a canvas');
 // Fullscreen control must be operable in a mobile viewport and reversible.
 await page.locator('#fullscreen').click();await wait(350);
 assert(await page.evaluate(()=>Boolean(document.fullscreenElement)||document.getElementById('globeLayout').classList.contains('is-fullscreen')),'Mobile fullscreen entry failed');
 await page.locator('#fullscreen').click();await wait(350);
 assert(!await page.evaluate(()=>Boolean(document.fullscreenElement)||document.getElementById('globeLayout').classList.contains('is-fullscreen')),'Mobile fullscreen exit failed');
 // Two simulated touch pointers exercise the same PointerEvent path used by
 // real touchscreens; moving fingers apart and together changes view scale.
 const pinchResults=await page.locator('#gesture').evaluate(el=>{
  const event=(kind,id,x,y)=>el.dispatchEvent(new PointerEvent(kind,{
   pointerId:id,pointerType:'touch',isPrimary:id===301,bubbles:true,
   clientX:x,clientY:y,button:0,buttons:kind==='pointerup'?0:1
  }));
  const get=()=>Number(document.getElementById('stage').dataset.zoomGesture||0);
  event('pointerdown',301,115,280);event('pointerdown',302,205,280);
  event('pointermove',302,245,280);
  const zoomIn=get();
  event('pointermove',302,162,280);
  const zoomOut=get();
  event('pointerup',302,162,280);event('pointerup',301,115,280);
  return {zoomIn,zoomOut};
 });
 assert(pinchResults.zoomIn>pinchResults.zoomOut*1.1,'Mobile pinch should zoom in/out: '+JSON.stringify(pinchResults));
 const mobile=path.join(dir,'mobile_minsk_be.jpg');
 await page.screenshot({path:mobile,type:'jpeg',quality:68,fullPage:true});
 console.log('MOBILE_BROWSER_OK',JSON.stringify(overflow));
 emit('mobile_minsk_be',mobile);
 // Country cards should contain school geography data, not a map anchor/group.
 await open('/globus/index.html?grade=10&theme=dark');
 const indiaName=await page.evaluate(()=>window.GLOBE_TRANSLATIONS.name('Индия','be'));
 await choose(indiaName);
 assert.deepEqual(await page.locator('#factMeta dt').allInnerTexts(),
  ['Плошча тэрыторыі','Сталіца','Насельніцтва','Форма кіравання','Тып дзяржаўнага ўладкавання']);
 assert.equal(await page.locator('#factMeta dd').count(),5,'State reference must show precisely five facts');
 assert.match(await page.locator('#factMeta').innerText(),/2025/,'Country population needs a dated estimate');
 assert.match(await page.locator('#factMeta').innerText(),/Нью-Дэлі/,'Country capital must be correct');
 assert(!/Кропка-арыенцір|Тэматычная група/.test(await page.locator('#factPanel').innerText()),
  'State must not display map anchor or thematic group');
 const standaloneBadge=await page.evaluate(()=>{
  const iframe=document.createElement('iframe');iframe.id='nl-badge-frame';
  document.body.appendChild(iframe);
  const display=getComputedStyle(iframe).display;
  iframe.remove();return display;
 });
 assert(standaloneBadge!=='none','Standalone globe should retain its own Netlify badge');
 await page.setViewportSize({width:1365,height:900});await wait(450);
 const desktopTall=await page.locator('#stage').evaluate(el=>el.getBoundingClientRect().height);
 assert(desktopTall>=770,'Desktop globe should use available height: '+desktopTall);
 const countryPicture=path.join(dir,'country_india_profile_desktop_be.jpg');
 await page.screenshot({path:countryPicture,quality:74,type:'jpeg',fullPage:false});
 emit('country_india_profile_desktop_be',countryPicture);
 // Simulate the Netlify-injected iframe to verify only embedded badges disappear.
 await page.goto(BASE+'/#nomenclature/10',{waitUntil:'domcontentloaded'});
 await page.locator('#geographyGlobe').waitFor();
 await page.waitForFunction(()=>document.getElementById('geographyGlobe')?.contentDocument?.body);
 const badgeVisibility=await page.locator('#geographyGlobe').evaluate(frame=>{
  const doc=frame.contentDocument,iframe=doc.createElement('iframe');
  iframe.id='nl-badge-frame';doc.body.appendChild(iframe);
  const display=doc.defaultView.getComputedStyle(iframe).display;
  iframe.remove();return display;
 });
 assert.equal(badgeVisibility,'none','Embedded globe must hide only its own Netlify badge');
 console.log('COUNTRY_REFERENCE_AND_NETLIFY_BADGE_OK',JSON.stringify({desktopTall,badgeVisibility}));
 assert.equal(errors.length,0,'JavaScript page errors:\n'+errors.join('\n'));
 console.log('VISUAL_BROWSER_TESTS_PASSED — actual built globe screenshots in visual-output/');
}catch(e){
 console.error('VISUAL_BROWSER_TEST_FAILED',e?.stack||String(e));
 if(page){try{const p=path.join(dir,'failure_browser_state.jpg');await page.screenshot({path:p,quality:68,type:'jpeg',fullPage:true,timeout:8000});emit('failure_browser_state',p)}catch(err){console.error('Failure screenshot:',String(err))}}

 process.exitCode=1;
}finally{await browser?.close().catch(()=>{});server.kill('SIGTERM')}

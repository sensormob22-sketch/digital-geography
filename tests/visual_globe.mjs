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
let browser;
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1365,height:900},deviceScaleFactor:1,locale:'ru-RU'});
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',msg=>{if(msg.type()==='error')console.log('BROWSER_CONSOLE_ERROR:',msg.text().slice(0,300))});
 async function open(url){
  const response=await page.goto(BASE+url,{waitUntil:'domcontentloaded',timeout:30000});
  assert(response?.ok(),'Failed to open '+url);
  await page.waitForSelector('#groups .place',{timeout:15000});
  await page.waitForFunction(()=>document.getElementById('status').hidden,{timeout:20000});
 }
 async function choose(s){
  const button=page.locator('#groups button.place').filter({hasText:s}).first();
  assert(await button.count(), 'Cannot locate catalogue item: '+s);
  await button.click();
  await page.waitForFunction(n=>document.getElementById('factName').textContent.includes(n),s,{timeout:8000});
  await wait(1350);
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
 await open('/globus/index.html?grade=7&lang=ru&theme=light');
 assert.match(await page.locator('#mapMode').innerText(),/Физический/);
 await choose('Гималаи');
 assert.match(await page.locator('#factName').innerText(),/Гималаи/);
 assert.match(await page.locator('#factMeta').innerText(),/Приблизительный учебный контур/);
 assert(await page.locator('#legendPanel input[data-area-layer="natural"]').isChecked());
 let pix=await pixelSummary();
 assert(pix.opaque>200,'Physical globe overlay is blank');
 assert(pix.cyan>30,'Natural feature outlines are not drawn');
 const physical=path.join(dir,'physical_himalayas_ru.jpg');
 await page.screenshot({path:physical,quality:70,type:'jpeg',fullPage:true});
 console.log('PHYSICAL_BROWSER_OK',JSON.stringify(pix));
 emit('physical_himalayas_ru',physical);
 // Polygon layer toggle must change visible contour pixels.
 await page.locator('#legendPanel input[data-area-layer="natural"]').uncheck();
 await wait(300);
 const hidden=await pixelSummary();
 assert(hidden.cyan<pix.cyan/2,'Natural contour layer toggle did not hide the outlines');
 await page.locator('#legendPanel input[data-area-layer="natural"]').check();
 // Political / megaregion contour; switches to EN without dropping selection.
 await open('/globus/index.html?grade=11&lang=ru&theme=dark');
 await choose('Босваш');
 assert.match(await page.locator('#mapMode').innerText(),/Политический/);
 pix=await pixelSummary();
 assert(pix.pink>20,'Urban megaregion contour is not visible');
 await page.locator('[data-lang="en"]').click();
 await wait(200);
 assert.match(await page.locator('#factHeading').innerText(),/About this location/);
 assert.match(await page.locator('#factName').innerText(),/BosWash/);
 assert.match(await page.locator('#legendTitle').innerText(),/Map legend/);
 assert.match(await page.locator('#factMeta').innerText(),/Approximate teaching outline/);
 const political=path.join(dir,'political_boswash_en.jpg');
 await page.screenshot({path:political,type:'jpeg',quality:70,fullPage:true});
 console.log('POLITICAL_BROWSER_OK',JSON.stringify(pix));
 emit('political_boswash_en',political);
 // Mobile: semantic info panel, readable legend and no horizontal scrolling.
 await page.setViewportSize({width:390,height:844});
 await open('/globus/index.html?grade=9&lang=be&theme=dark');
 await choose('Мінск');
 assert.equal((await page.locator('#factName').innerText()).trim(),'Мінск');
 assert.match(await page.locator('#legendTitle').innerText(),/Умоўныя абазначэнні/);
 const overflow=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth}));
 assert(overflow.documentWidth<=overflow.viewportWidth+4,'Horizontal overflow on mobile '+JSON.stringify(overflow));
 const mobile=path.join(dir,'mobile_minsk_be.jpg');
 await page.screenshot({path:mobile,type:'jpeg',quality:68,fullPage:true});
 console.log('MOBILE_BROWSER_OK',JSON.stringify(overflow));
 emit('mobile_minsk_be',mobile);
 assert.equal(errors.length,0,'JavaScript page errors:\n'+errors.join('\n'));
 console.log('VISUAL_BROWSER_TESTS_PASSED — actual built globe screenshots in visual-output/');
}catch(e){
 console.error('VISUAL_BROWSER_TEST_FAILED',e?.stack||String(e));
 process.exitCode=1;
}finally{await browser?.close().catch(()=>{});server.kill('SIGTERM')}

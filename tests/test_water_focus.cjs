/* Geographic water focus: real source matching, fit, pulsating line strokes.
   These tests do not depend on external data tile servers. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../public/globus');
const context=vm.createContext({window:{}});
for(const name of ['areas.js','water-focus.js']){
 vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
}
const focus=context.window.GLOBE_WATER_FOCUS,areas=context.window.GLOBE_AREAS;
assert(focus?.matching&&focus?.focusFor&&focus?.draw);
assert.equal(focus.fold('THE River Nile'),'nile');
const amazon={name:'Amazonas',paths:[[[-72,-4],[-66,-4],[-62,-3],[-56,-2],[-50,-1]]]};
const volga={name:'Volga',paths:[[[49,48],[46,52],[43,56]]]};
const baikal={name:'Baikal',paths:[[[106,52],[108,54],[110,56],[109,55],[106,52]]]};
const hydro={rivers:[{rank:1,...amazon},{rank:1,...volga}],lakes:[{rank:1,...baikal}]};
const river={rawName:'Амазонка',rawType:'Река',lat:-3.2,lon:-60};
const lake={rawName:'Байкал',rawType:'Озеро',lat:53.5,lon:108};
assert.equal(focus.matching(river,hydro,null).f.name,'Amazonas');
assert.equal(focus.matching(lake,hydro,null).f.name,'Baikal');
assert.equal(focus.matching({rawName:'Нил',rawType:'Река',lat:23.3,lon:32.6},hydro,null),null,'Must not invent a Nile course');
const regional={rivers:[{name:'Berezina',paths:[[[28,54],[28.1,53],[27.9,52]]]}],lakes:[]};
assert.equal(focus.matching({rawName:'Березина',rawType:'Река',lat:53,lon:28},hydro,regional).f.name,'Berezina');
function footprint(o,data,w,h){
 const fit=focus.focusFor(o,areas,data,null,w,h);
 assert(fit&&Number.isFinite(fit.zoom),'Missing focus: '+o.rawName);
 assert(fit.zoom>1&&fit.zoom<=650,'Zoom outside allowed limits');
 return fit;
}
const v=footprint(river,hydro,1020,670),b=footprint(lake,hydro,1020,670);
assert(v.zoom>6,'Long river should be enlarged');
assert(b.zoom>10,'Lake should be enlarged');
function sizeFraction(fit,w,h){
 const points=fit.bounds.pts,lat=fit.lat,lon=fit.lon;
 const size=.445*Math.min(w,h)*fit.zoom;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const point of points){
  const d=(point[0]*Math.PI/180-lon),p=point[1]*Math.PI/180;
  const x=size*Math.cos(p)*Math.sin(d);
  const y=size*(Math.cos(lat)*Math.sin(p)-Math.sin(lat)*Math.cos(p)*Math.cos(d));
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 return Math.max((maxX-minX)/w,(maxY-minY)/h);
}
assert(Math.abs(sizeFraction(v,1020,670)-.75)<.04,'River must span ~75% viewport');
assert(Math.abs(sizeFraction(b,1020,670)-.75)<.04,'Lake must span ~75% viewport');
const hill=focus.focusFor({rawName:'Минская возвышенность',rawType:'Возвышенность',lat:54,lon:27},areas,hydro,null,980,600);
assert(hill&&hill.zoom>10,'Belarusian highland should fit schematic geographic extent');
let strokes=0,colors=[];
const ctx={save(){},restore(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){strokes++;colors.push(this.strokeStyle)}};
const projection=(lat,lon)=>({x:350+(lon*180/Math.PI-108)*4,y:250-(lat*180/Math.PI-54)*4,vis:1});
focus.draw(ctx,{kind:'lakes',f:baikal},projection,0,false);
const first=colors.find(x=>x==='#4ffff4'||x==='#ffec69');
focus.draw(ctx,{kind:'lakes',f:baikal},projection,1,false);
const second=colors.findLast(x=>x==='#4ffff4'||x==='#ffec69');
assert(strokes>=6,'Layered outline strokes missing');
assert(first&&second,'Selection must be visibly accented');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!html.includes('id="back"')&&!html.includes("$('back')"),'Nested site backlink must be removed');
assert(html.includes('src="./water-focus.js"'),'Water focus script must load');
assert(html.includes('focusLayer')&&html.includes('function drawFocus()'),'Animated line must have own canvas');
assert(html.includes('pointers=new Map()')&&html.includes("dataset.gesture='pinch'"),'Two-finger gestures must work');
assert(html.includes('MAX_ZOOM=650'),'Manual zoom range not raised');
assert(!html.includes('touch-action:auto'),'Mobile map should own two-finger gesture');

const realBelarus=JSON.parse(fs.readFileSync(path.join(root,'belarus-hydrology-10m.json'),'utf8'));
const regionalCases=[
 ['Днепр','Река',52.4,30.15,'Dnipro'],
 ['Березина','Приток Днепра',53.4,28.9,'Byarezina'],
 ['Западный Буг','Река',52.16,23.62,'Bug'],
 ['Вилия','Приток Немана',54.55,26.05,'Neris'],
 ['Неман','Река',53.82,25.8,'Neman']
];
for(const [rawName,rawType,lat,lon,expected] of regionalCases){
 const match=focus.matching({rawName,rawType,lat,lon},null,realBelarus);
 assert(match,'Belarus vector watercourse cannot be matched: '+rawName);
 assert(match.f.name===expected,'Incorrect vector course for '+rawName+': '+match.f.name);
}
for(const [name,lat,lon] of [
 ['Червоное',52.38,27.75],['Вилейское водохранилище',54.38,27.05],
 ['Нарочь',54.86,26.73],['Освейское',56.05,28.15]]){
 const match=focus.matching({rawName:name,rawType:name.includes('водохранилище')?'Водохранилище':'Озеро',lat,lon},null,realBelarus);
 assert(match,'Natural Earth 10m actual unnamed lake geometry not matched: '+name);
 assert(match.f.paths.length,'No real shoreline for '+name);
}

console.log('Water-fit regression: river, lake, highland, 75% viewport, match safety, selection pulse and touch event handlers OK');
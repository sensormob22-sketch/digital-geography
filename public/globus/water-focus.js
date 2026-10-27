/* Geography focus: match the local, public-domain Natural Earth waterways
   with school nomenclature and compute a true geographic camera fit.
   Never fabricate a river course: if no reliable named feature exists,
   only the original point marker is shown. All coordinates are lon,lat. */
(function(){
'use strict';
const aliases={
 'Нил':'Nile','Амазонка':'Amazonas','Миссисипи':'Mississippi','Волга':'Volga',
 'Енисей':'Yenisey','Река Замбези':'Zambezi','Река Муррей':'Murray',
 'Река Парана':'Parana','Река Маккензи':'Mackenzie','Янцзы':'Yangtze',
 'Хуанхэ':'Huang He','Обь':'Ob','Днепр':'Dnipro|Dnieper|Dnepr','Днестр':'Dniester',
 'Березина':'Byarezina|Berezina|Biarezina','Западная Двина':'Daugava','Припять':'Pripyat|Prypyat|Prypiat',
 'Неман':'Neman|Nemunas|Niemen|Nyoman','Вилия':'Neris|Vilia|Viliya','Западный Буг':'Bug|Western Bug|Zakhidnyi Buh','Сож':'Sozh',
 'Птичь':'Ptich','Свислочь':'Svisloch','Байкал':'Baikal',
 'Виктория':'Victoria','Верхнее':'Superior','Мичиган':'Michigan',
 'Гурон':'Huron','Эри':'Erie','Онтарио':'Ontario','Великие озёра':'Great Lakes',
 'Ладожское озеро':'Ladoga','Женевское озеро':'Geneva',
 'Озеро Титикака':'Titicaca','Озеро Эйр-Норт':'Eyre',
 'Нарочь':'Naroch','Освейское':'Osveya','Червоное':'Chervonoye|Chyrvonaye|Cervonoje|Chervonoe',
 'Браславские озёра':'Braslav','Вилейское водохранилище':'Vileyka|Vileyskoe|Vileyskoye',
 'Каспийское море-озеро':'Caspian Sea'
};
function fold(s){
 return String(s||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'')
  .replace(/ё/g,'е').replace(/['’\-–()]/g,' ').replace(/\b(the|river|lake|lakes|reservoir|rio|reka)\b/g,'')
  .replace(/[^a-zа-я0-9]+/g,' ').trim();
}
function shortLon(a,b){return ((b-a+540)%360)-180}
function offsetDistance(pt,ref){
 const dx=shortLon(ref.lon,pt[0])*Math.cos(ref.lat*Math.PI/180);
 return Math.hypot(dx,pt[1]-ref.lat);
}
function featureDistance(f,ref){
 let min=1e9;
 for(const path of f.paths||[]){
  for(let i=0;i<path.length;i+=Math.max(1,Math.floor(path.length/45))){
   min=Math.min(min,offsetDistance(path[i],ref));
  }
 }
 return min;
}
function matching(o,global,regional){
 if(!o)return null;
 const kind=/Озеро|Группа озёр|Море-озеро|Водохранилище/.test(o.rawType||'')?'lakes':
  /Река|Приток/.test(o.rawType||'')?'rivers':null;
 if(!kind)return null;
 const ref={lat:o.lat,lon:o.lon};
 const names=[o.rawName,...String(aliases[o.rawName]||'').split('|')].map(fold).filter(Boolean);
 const pools=[{source:'regional',data:regional},{source:'global',data:global}].filter(x=>x.data);
 let candidates=[];
 for(const pool of pools)for(const feature of pool.data[kind]||[]){
  if(!feature.paths?.length)continue;
  const fName=fold(feature.name),d=featureDistance(feature,ref);
  const byName=fName.length>1&&names.some(n=>fName===n||n.length>5&&(fName.startsWith(n+' ')||n.startsWith(fName+' ')));
  if(byName)candidates.push({f:feature,source:pool.source,d});
 }
 // Natural Earth 1:10m Belarus lakes often have EMPTY names even when their
 // polygons are correctly surveyed. Only use a uniquely near regional lake.
 if(kind==='lakes'&&!candidates.length&&regional){
  const near=(regional.lakes||[]).filter(f=>f.paths?.length)
   .map(f=>({f,d:featureDistance(f,ref)})).sort((a,b)=>a.d-b.d);
  const first=near[0],second=near[1];
  if(first&&first.d<.16&&(!second||second.d>first.d*1.65)){
   return {kind,source:'regional',distance:first.d,f:{...first.f,name:o.rawName}};
  }
 }
 if(!candidates.length)return null;
 const region=candidates.filter(c=>c.source==='regional');
 // Major rivers frequently cross borders: retain matching segments from
 // BOTH Natural Earth datasets, including those outside the regional tile.
 const list=(kind==='rivers'?candidates:(region.length?region:candidates.filter(c=>c.source==='global'))).sort((a,b)=>a.d-b.d);
 const nearest=list[0];
 if(nearest.d>12&&nearest.source!=='regional')return null;
 if(kind==='lakes')return {f:nearest.f,kind,source:nearest.source,distance:nearest.d};
 // A named river frequently consists of MANY vector segments. Previously
 // selecting only the nearest segment highlighted a tiny fragment (e.g. Nile).
 // Merge all source-identified stretches, never join them with fake lines.
 const chosen=list.filter(c=>c.d<36);
 return {kind,source:nearest.source,distance:nearest.d,
  f:{name:nearest.f.name||o.rawName,rank:Math.min(...chosen.map(c=>c.f.rank??5)),
   paths:chosen.flatMap(c=>c.f.paths)}};
}
function boundsFromPaths(paths,ref){
 const pts=[];
 for(const arr of paths||[])for(const p of arr){
  if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
  pts.push([ref.lon+shortLon(ref.lon,p[0]),p[1]]);
 }
 if(!pts.length)return null;
 let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(const [lon,lat] of pts){
  if(lon<west)west=lon;if(lon>east)east=lon;
  if(lat<south)south=lat;if(lat>north)north=lat;
 }
 return {pts,west,east,south,north,lon:(west+east)/2,lat:(south+north)/2};
}
function focusFor(o,areas,global,regional,width,height,maxZoom=650){
 const ref={lat:o.lat,lon:o.lon};
 const hydro=matching(o,global,regional);
 const area=areas?.get?.(o.rawName)||null;
 // The source hydrology geometry has priority over the old schematic ellipse.
 let paths=null;
 if(hydro)paths=hydro.f.paths;
 else if(area)paths=area.rings.map(r=>r.map(([lat,lon])=>[lon,lat]));
 if(!paths)return null;
 const box=boundsFromPaths(paths,ref);
 if(!box)return null;
 const clat=box.lat*Math.PI/180,clon=box.lon,si=Math.sin(clat),co=Math.cos(clat);
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 const count=box.pts.length,step=Math.max(1,Math.floor(count/1500));
 for(let j=0;j<count;j+=step){
  const [lon,lat]=box.pts[j],phi=lat*Math.PI/180,d=shortLon(clon,lon)*Math.PI/180;
  const x=Math.cos(phi)*Math.sin(d),y=co*Math.sin(phi)-si*Math.cos(phi)*Math.cos(d);
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 const spanX=Math.max(.0001,right-left),spanY=Math.max(.0001,bottom-top);
 const unit=.445*Math.min(width||680,height||640),mw=Math.max(1,width||680),mh=Math.max(1,height||640);
 // 75% coverage of the map area (on the longest axis), not 75% of the Earth.
 const z=.75*Math.min(mw/(unit*spanX),mh/(unit*spanY));
 return {lon:clon*Math.PI/180,lat:Math.max(-1.45,Math.min(1.45,clat)),
  zoom:Math.max(1.05,Math.min(maxZoom,z)),hydro,area,spanX,spanY,bounds:box};
}
function draw(ctx,match,project,seconds,reducedMotion=false){
 if(!match?.f?.paths?.length)return;
 const isLake=match.kind==='lakes',phase=reducedMotion?0:Math.sin(seconds*4.2);
 const outer=isLake?7.2+phase*1.25:8.5+phase*1.8;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);
 for(const line of match.f.paths){
  if(!line?.length)continue;
  ctx.beginPath();let visible=false,pen=false;
  for(const [lon,lat] of line){
   const p=project(lat*Math.PI/180,lon*Math.PI/180);
   if(p.vis<=.002){pen=false;continue;}
   if(!pen)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   pen=true;visible=true;
  }
  if(!visible)continue;
  if(isLake&&line.length>2){ // close only fully front-visible rings
   const first=project(line[0][1]*Math.PI/180,line[0][0]*Math.PI/180);
   if(pen&&first.vis>.002)ctx.closePath();
   ctx.globalAlpha=.10+.035*(phase+1);ctx.fillStyle='#10ecff';ctx.fill('evenodd');
  }
  ctx.globalAlpha=.65;ctx.lineWidth=outer;ctx.strokeStyle='#071d43';ctx.stroke();
  ctx.globalAlpha=.94;ctx.lineWidth=isLake?4+phase*.9:4.7+phase*1.2;
  ctx.strokeStyle=phase>=0?'#4ffff4':'#ffec69';ctx.stroke();
  ctx.globalAlpha=.95;ctx.lineWidth=1.3;ctx.strokeStyle='#fff';ctx.stroke();
 }
 ctx.restore();
}
window.GLOBE_WATER_FOCUS={aliases,fold,matching,focusFor,draw,boundsFromPaths};
})();
/* Official protected-area boundary candidates for Belarus.
 * Source: UNEP-WCMC / IUCN, WDPCA October 2026 via public ArcGIS FeatureServer.
 * Noncommercial educational use; attribution: Protected Planet / UNEP-WCMC
 * (see README). NEVER substitute an ellipse for an unavailable true boundary.
 * Downloaded once at build time; served locally for offline use.
 */
import fs from 'node:fs/promises';
const out='public/globus/parks-belarus.json';
const url='https://data-gis.unep-wcmc.org/server/rest/services/ProtectedSites/The_World_Database_of_Protected_Areas/FeatureServer/1/query';
const query=new URLSearchParams({
 where:"iso3='BLR' AND (desig_eng LIKE '%National Park%' OR desig LIKE '%National Park%' OR iucn_cat='II' OR name_eng LIKE '%Berezins%')",
 outFields:'name,name_eng,desig_eng,iucn_cat,gis_area',
 outSR:'4326',returnGeometry:'true',geometryPrecision:'5',f:'geojson'
});
let raw;
for(let attempt=0;attempt<3;attempt++){
 try{
  const r=await fetch(url+'?'+query,{signal:AbortSignal.timeout(70000)});
  if(!r.ok)throw Error('HTTP '+r.status);
  raw=await r.json();
  if(!raw.features||!Array.isArray(raw.features))throw Error('Unexpected WDPCA response '+JSON.stringify(raw).slice(0,600));
  break;
 }catch(e){console.warn('WDPCA request',attempt+1,e.message);if(attempt===2)throw e;await new Promise(ok=>setTimeout(ok,2500*(attempt+1)))}
}
const targets={
 'Беловежская пуща':['belowez','bialowie','belovezh','belavezh','belovezhsk','belovezh'],
 'Браславские озёра (нацпарк)':['braslav','braslau','braslaws','braslaŭ'],
 'Припятский':['pripyat','prypiat','pripiats','pryppiats'],
 'Нарочанский':['naroch','narach','naroč'],
 'Березинский биосферный заповедник':['berezin','biarezin']
};
function paths(g){
 if(g?.type==='Polygon')return [g.coordinates];
 if(g?.type==='MultiPolygon')return g.coordinates;
 return [];
}
function compact(ring){
 // limit precision but preserve bends and islands; eliminate repeated coords
 const output=[];let last=null;
 for(const p of ring){
  if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
  const v=[+p[1].toFixed(5),+p[0].toFixed(5)];
  if(!last||Math.hypot(v[0]-last[0],v[1]-last[1])>.00016){output.push(v);last=v}
 }
 return output.length>=4?output:[];
}
console.log('WDPCA candidates:',raw.features.map(f=>(f.properties?.name_eng||f.properties?.name||'?')+' ['+(f.properties?.desig_eng||'?')+']').join(' | '));
const matched={};
for(const [target,aliases] of Object.entries(targets)){
 const features=raw.features.filter(f=>{
  const n=(f.properties?.name_eng||'')+' '+(f.properties?.name||'');
  const folded=n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return aliases.some(a=>folded.includes(a));
 });
 const rings=features.flatMap(f=>paths(f.geometry).flatMap(p=>p.map(compact).filter(a=>a.length>=4)));
 if(!rings.length){console.warn('No official polygon:',target);continue}
 matched[target]={kind:'natural',quality:'mapped',source:'WDPCA (UNEP-WCMC / IUCN, Oct 2026)',rings};
 console.log('Matched park',target,features.length,'polygons /',rings.length,'rings');
}

/* Narochansky is missing from the current WDPCA polygon subset. For this one
   case, look up a mapped boundary in OSM (ODbL), without fabricating a shape. */
if(!matched['Нарочанский']){
 const overpass='[out:json][timeout:75];(relation["name"~"Нарочан|Нарачан|Naroch|Narach",i]["boundary"~"national_park|protected_area"](53.6,25.3,55.8,28.7);relation["name"~"Нарочан|Нарачан|Naroch|Narach",i]["leisure"="nature_reserve"](53.6,25.3,55.8,28.7););out geom;';
 const APIs=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter'];
 function xy(p){return [p.lat,p.lon]}
 function closeWays(ways){
  const list=ways.map(w=>w.geometry.map(xy)).filter(a=>a.length>=2);
  const rings=[];
  const dist=(a,b)=>Math.hypot((a[0]-b[0])*.6,a[1]-b[1]);
  while(list.length){
   let current=list.pop(),tries=0;
   while(list.length&&tries++<1500&&dist(current[0],current.at(-1))>.00008){
    let found=false;
    for(let i=0;i<list.length;i++){
     const w=list[i];
     for(const [side,reverse] of [[0,false],[0,true],[1,false],[1,true]]){
      const needle=side===0?current[0]:current.at(-1);
      const candidate=reverse?w.at(-1):w[0];
      if(dist(needle,candidate)>.00012)continue;
      const pts=reverse?[...w].reverse():w;
      current=side===0?[...pts.slice(0,-1),...current]:[...current,...pts.slice(1)];
      list.splice(i,1);found=true;break;
     }
     if(found)break;
    }
    if(!found)break;
   }
   if(current.length>20&&dist(current[0],current.at(-1))<.00025)rings.push(current.filter((p,i)=>i%Math.max(1,Math.floor(current.length/3500))===0));
  }
  return rings;
 }
 for(const api of APIs){
  try{
   const r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({data:overpass}),signal:AbortSignal.timeout(70000)});
   if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json(),relations=data.elements?.filter(e=>e.type==='relation')||[];
   console.log('Naroch OSM candidate relations',relations.map(e=>e.id+':'+(e.tags?.name||'?')).join('; '));
   for(const relation of relations){
    const ways=(relation.members||[]).filter(m=>m.type==='way'&&m.role==='outer'&&m.geometry);
    const rings=closeWays(ways);
    if(!rings.length)continue;
    matched['Нарочанский']={kind:'natural',quality:'mapped',source:'© OpenStreetMap contributors (ODbL)',rings};
    console.log('Mapped Narochansky from OSM relation',relation.id,'rings',rings.length);break;
   }
   if(matched['Нарочанский'])break;
  }catch(e){console.warn('OSM park boundaries unavailable:',api,e.message)}
 }
}

if(Object.keys(matched).length<3)throw Error('National-park GIS geometry incomplete: '+JSON.stringify(Object.keys(matched))+'; candidate names: '+raw.features.map(f=>f.properties?.name_eng||f.properties?.name).slice(0,30));
await fs.writeFile(out,JSON.stringify({source:'WDPCA — UNEP-WCMC and IUCN, October 2026, Protected Planet; educational non-commercial use',matched}));
console.log('WDPCA Belarus national parks self-hosted:',Object.keys(matched).length);

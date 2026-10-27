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
 'Беловежская пуща':['bialowie','belovezh','belavezh','belovezhsk','belovezh'],
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
if(Object.keys(matched).length<3)throw Error('National-park GIS geometry incomplete: '+JSON.stringify(Object.keys(matched))+'; candidate names: '+raw.features.map(f=>f.properties?.name_eng||f.properties?.name).slice(0,30));
await fs.writeFile(out,JSON.stringify({source:'WDPCA — UNEP-WCMC and IUCN, October 2026, Protected Planet; educational non-commercial use',matched}));
console.log('WDPCA Belarus national parks self-hosted:',Object.keys(matched).length);

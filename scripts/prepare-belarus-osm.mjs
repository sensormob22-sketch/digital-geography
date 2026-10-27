/* Optional public OpenStreetMap border geometries for Belarus.
 * Converts named national parks and selected lakes into locally served
 * GeoJSON-style latitude/longitude rings. No runtime Overpass requests.
 * Only CLOSED relation/way rings are accepted. Unknown/missing boundaries
 * remain unhighlighted rather than drawing false shapes.
 * License: © OpenStreetMap contributors, ODbL.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=path.resolve('public/globus');
const names={
 'Беловежская пуща':[/беловеж|белавеж|białowie|belove/i,52.64,23.9],
 'Браславские озёра (нацпарк)':[/браслав|braslav/i,55.63,27.09],
 'Нарочанский':[/нароч|нарач|naroch/i,54.86,26.75],
 'Припятский':[/прыпя|припя|pripyat|prypia/i,52.1,27.85],
 'Березинский биосферный заповедник':[/березин|бярэзін|berezin/i,54.78,28.25],
 'Червоное':[/червоно|червон|chervon|čyrvon/i,52.4054,27.9656],
 'Вилейское водохранилище':[/вилей|вілей|viley|vilej/i,54.43,27.08]
};
const bbox='51.1,22.7,56.5,33.4';
const parks='Беловеж|Белавеж|Białowie|Belove|Браслав|Braslav|Нароч|Нарач|Naroch|Прыпя|Припя|Pripyat|Березин|Бярэзін|Berezin';
const lakes='Червоно|Червон|Chervon|Вилей|Вілей|Viley|Vilej';
const query=`[out:json][timeout:28];(relation(${bbox})["boundary"~"protected_area|national_park"]["name"~"${parks}",i];relation(${bbox})["name"~"${lakes}",i]["natural"="water"];way(${bbox})["name"~"${lakes}",i]["natural"="water"];);out geom;`;
function same(a,b){return Math.abs(a[0]-b[0])<.00012&&Math.abs(a[1]-b[1])<.00012}
function buildRings(element){
 let ways=[];
 if(element.type==='way'&&element.geometry)ways=[element.geometry];
 if(element.type==='relation')ways=(element.members||[]).filter(m=>m.role==='outer'&&m.geometry?.length>=3).map(m=>m.geometry);
 const segments=ways.map(w=>w.map(pt=>[pt.lat,pt.lon])).filter(r=>r.length>=3);
 const rings=[];
 while(segments.length){
  let ring=segments.shift();
  for(let j=0;j<segments.length&&ring.length<40000;){
   const b=segments[j],first=ring[0],last=ring[ring.length-1];
   let take=false;
   if(same(last,b[0])){ring.push(...b.slice(1));take=true}
   else if(same(last,b[b.length-1])){ring.push(...b.slice(0,-1).reverse());take=true}
   else if(same(first,b[b.length-1])){ring.unshift(...b.slice(0,-1));take=true}
   else if(same(first,b[0])){ring.unshift(...b.slice(1).reverse());take=true}
   if(take){segments.splice(j,1);j=0}else j++;
  }
  if(ring.length>=8&&same(ring[0],ring[ring.length-1]))rings.push(ring.slice(0,-1));
 }
 return rings;
}
function centroid(rings){
 let a=0,b=0,n=0;for(const ring of rings)for(const pt of ring){a+=pt[0];b+=pt[1];n++}
 return n?[a/n,b/n]:[0,0];
}
function bounds(rings){
 let a=Infinity,b=-Infinity,c=Infinity,d=-Infinity;
 for(const ring of rings)for(const [lat,lon] of ring){a=Math.min(a,lat);b=Math.max(b,lat);c=Math.min(c,lon);d=Math.max(d,lon)}
 return [a,b,c,d];
}
const output={source:'OpenStreetMap © contributors (ODbL); relation/way geometries downloaded during site build',regions:{}};
let elements=[];
for(const server of ['https://overpass.private.coffee/api/interpreter','https://lz4.overpass-api.de/api/interpreter']){
 try{
  const response=await fetch(server,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'DigitalGeographySchool/1.0'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(11000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.elements))throw Error('No elements');
  elements=data.elements;break;
 }catch(e){console.warn('OSM protected areas source unavailable:',e.message)}
}
/* OSM APIs are preferred; on a slow/rate-limited Overpass instance
   request only specific objects from Nominatim, respecting 1 req/sec. We do
   not draw invented boundaries when a confirmed polygon cannot be found. */
const directPolygons={};
if(!elements.length){
 const queries={
  'Беловежская пуща':'Belavezhskaya Pushcha National Park, Belarus',
  'Браславские озёра (нацпарк)':'Braslaw Lakes National Park, Belarus',
  'Нарочанский':'Narachanski National Park, Belarus',
  'Припятский':'Pripyatsky National Park, Belarus',
  'Березинский биосферный заповедник':'Berezinsky Biosphere Reserve, Belarus',
  'Червоное':'Lake Chervonoye, Belarus',
  'Вилейское водохранилище':'Vileyskoye Reservoir, Belarus'
 };
 function polygonRings(g){
  if(!g||!['Polygon','MultiPolygon'].includes(g.type))return [];
  const source=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  const result=[];
  for(const poly of source){
   for(const outer of poly.slice(0,1)){
    if(!Array.isArray(outer)||outer.length<8)continue;
    result.push(outer.map(([lon,lat])=>[lat,lon]));
   }
  }
  return result;
 }
 for(const [name,queryName] of Object.entries(queries)){
  try{
   const url='https://nominatim.openstreetmap.org/search?format=geojson&polygon_geojson=1&limit=3&q='+encodeURIComponent(queryName);
   const response=await fetch(url,{headers:{'User-Agent':'DigitalGeographyEducation/1.0 (GIS data for a school map)','Accept':'application/geo+json'},signal:AbortSignal.timeout(14000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json();
   const [pattern,lat,lon]=names[name],candidates=[];
   for(const feature of json.features||[]){
    const rings=polygonRings(feature.geometry);
    if(!rings.length)continue;
    const c=centroid(rings),bbox=bounds(rings);
    const distance=Math.hypot(c[0]-lat,(c[1]-lon)*.6);
    const diameter=Math.max(bbox[1]-bbox[0],(bbox[3]-bbox[2])*.6);
    if(distance>1||diameter<.05||diameter>1.65)continue;
    const display=String(feature.properties?.display_name||'');
    if(!pattern.test(display))continue;
    candidates.push({rings,distance});
   }
   candidates.sort((a,b)=>a.distance-b.distance);
   if(candidates.length){
    directPolygons[name]=candidates[0].rings;
    console.log('Nominatim OSM confirmed closed polygon:',name,candidates[0].rings[0].length);
   }else console.warn('No confirmed Nominatim polygon:',name);
  }catch(error){console.warn('Nominatim unavailable:',name,error.message)}
  await new Promise(resolve=>setTimeout(resolve,1250));
 }
}
for(const [name,[rx,lat,lon]] of Object.entries(names)){
 const candidates=[];
 if(directPolygons[name]){
  output.regions[name]={kind:'natural',quality:'osm',rings:directPolygons[name],attribution:output.source};
  console.log('OSM confirmed',name,'via Nominatim polygon');
  continue;
 }
 for(const element of elements){
  const full=[element.tags?.name,element.tags?.['name:ru'],element.tags?.['name:be'],element.tags?.['name:en']].filter(Boolean).join(' ');
  if(!rx.test(full))continue;
  if((name==='Червоное'||name==='Вилейское водохранилище')!== (element.tags?.natural==='water'))continue;
  const rings=buildRings(element);
  if(!rings.length)continue;
  const center=centroid(rings),dist=Math.hypot(center[0]-lat,(center[1]-lon)*.6);
  const bb=bounds(rings),height=bb[1]-bb[0],width=(bb[3]-bb[2])*.6;
  const maxDim=Math.max(height,width);
  if(dist>(name==='Беловежская пуща'?.75:1)||maxDim>(name==='Беловежская пуща'?1.6:1.25))continue;
  // A tiny wood/pond with the same name is NOT a national park.
  if(!['Червоное','Вилейское водохранилище'].includes(name)&&maxDim<.065)continue;
  candidates.push({rings,dist,rank:rings.reduce((n,r)=>n+r.length,0),bbox:bb});
 }
 candidates.sort((a,b)=>a.dist-b.dist);
 if(candidates.length){
  const chosen=candidates[0];
  output.regions[name]={kind:'natural',quality:'osm',rings:chosen.rings,attribution:output.source};
  console.log('OSM confirmed',name,'closed polygons',chosen.rings.length,'vertices',chosen.rank,'distance',chosen.dist.toFixed(3));
 }else console.warn('OSM boundary NOT verified:',name);
}
await fs.writeFile(path.join(ROOT,'protected-belarus-osm.json'),JSON.stringify(output));
console.log('OSM national park/lake polygons:',Object.keys(output.regions).length,'of',Object.keys(names).length);

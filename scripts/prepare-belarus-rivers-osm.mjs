/* Supplement the coarsely generalized Natural Earth 10m stream data with
 * actual named OSM way segments of selected Belarus main rivers (ODbL).
 * Fetch only at build time and cache locally. If public Overpass is rate
 * limited, preserve the preexisting Natural Earth offline fallback.
 */
import fs from 'node:fs/promises';
const outfile='public/globus/belarus-rivers-osm.json';
const keys={
 Neman:/н[ёе]ман|нямунас|neman|nemunas|niemen/i,
 Byarezina:/бяр[эе]з[іи]на|березина|berezina|byarezina/i,
 Dnipro:/дн[еі]пр|дняпро|dnipro|dnieper|dnepr/i,
 Bug:/заходн[іы]\s*буг|западн[ыий]+\s*буг|western\s*bug|zakhidnyi\s*buh/i
};
const names=['Нёман','Неман','Нямунас','Nemunas','Neman','Бярэзіна','Березина','Berezina',
 'Дняпро','Днепр','Dnipro','Dnieper','Заходні Буг','Западный Буг','Bug','Western Bug'];
const pattern=names.join('|');
const bbox='(51.35,22.7,56.3,33.2)';
const query='[out:json][timeout:55];('+
 ['name','name:ru','name:be','name:en'].map(tag=>'way["waterway"="river"]["'+tag+'"~"'+pattern+'",i]'+bbox+';').join('')+
 ');out geom;';
let raw=null;
for(const endpoint of ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']){
 try{
  const response=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),
   headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(66000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data.elements))throw Error('Overpass invalid response');
  raw=data.elements;console.log('Overpass Belarus river ways',raw.length);break;
 }catch(e){console.warn('Supplemental OSM named rivers unavailable from',endpoint,e.message)}
}
const sets=Object.fromEntries(Object.keys(keys).map(n=>[n,[]]));
if(raw)for(const e of raw){
 if(e.type!=='way'||!Array.isArray(e.geometry)||e.geometry.length<2)continue;
 const strings=['name','name:ru','name:be','name:en','alt_name'].map(k=>e.tags?.[k]||'').join(' | ');
 const match=Object.entries(keys).find(([,pattern])=>pattern.test(strings));
 if(!match)continue;
 const path=[];
 for(const node of e.geometry){
  const pt=[+node.lon.toFixed(5),+node.lat.toFixed(5)];
  if(!path.length||Math.hypot((path.at(-1)[0]-pt[0])*.6,path.at(-1)[1]-pt[1])>.00017)path.push(pt);
 }
 if(path.length>=2)sets[match[0]].push(path);
}
const rivers=Object.entries(sets).filter(([,paths])=>paths.length).map(([name,paths])=>({
 name,rank:1,source:'© OpenStreetMap contributors (ODbL)',paths
}));
await fs.writeFile(outfile,JSON.stringify({source:'OpenStreetMap contributors (ODbL); only named source-verified river segments',rivers,lakes:[]}));
console.log('Offline Belarus OSM source river groups:',rivers.map(r=>r.name+' '+r.paths.length).join('; ')||'none (Natural Earth fallback)');

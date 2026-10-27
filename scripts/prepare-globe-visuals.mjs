/* Build-time, open-data assets for the globe. No runtime dependency on
   Wikimedia/GitHub: NASA Blue Marble and Natural Earth hydrology are copied
   into public/globus before Astro builds and cached for offline use.
   Sources: NASA Visible Earth/NOAA via Wikimedia Commons (public domain);
   Natural Earth 1:50m rivers/lake centerlines and lakes (public domain).
*/
import {mkdir,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve('public/globus');
await mkdir(output,{recursive:true});
async function fetchSource(url,limit){
 const ctrl=new AbortController(),alarm=setTimeout(()=>ctrl.abort(),90000);
 try{
  const res=await fetch(url,{headers:{'User-Agent':'DigitalGeographyEducationalSite/1.0 (offline build; public domain attribution in README)'},signal:ctrl.signal});
  if(!res.ok)throw Error(url+' HTTP '+res.status);
  const raw=Buffer.from(await res.arrayBuffer());
  if(raw.length<128||raw.length>limit)throw Error('Unexpected download size '+url+': '+raw.length);
  return raw;
 }finally{clearTimeout(alarm)}
}
const rasterURL='https://upload.wikimedia.org/wikipedia/commons/4/4d/Whole_world_-_land_and_oceans.jpg';
const jpg=await fetchSource(rasterURL,11000000);
if(jpg[0]!==0xff||jpg[1]!==0xd8)throw Error('NASA raster file is not JPEG');
await writeFile(path.join(output,'relief-nasa-8192.jpg'),jpg);
console.log('NASA shaded-landcover relief, 8192x4096:',(jpg.length/1048576).toFixed(2),'MiB');
const prefix='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
function round(v){return Math.round(v*10000)/10000}
function transformLine(line){return line.map(([lon,lat])=>[round(lon),round(lat)])}
function getPaths(feature){
 const {type,coordinates}=feature.geometry||{};
 if(type==='LineString')return [coordinates];
 if(type==='MultiLineString')return coordinates;
 if(type==='Polygon')return coordinates;
 if(type==='MultiPolygon')return coordinates.flat();
 return [];
}
const hydrology={source:'Natural Earth 1:50m; generalized educational hydrography',rivers:[],lakes:[]};
for(const [key,file,max] of [
 ['rivers','ne_50m_rivers_lake_centerlines.geojson',16000000],
 ['lakes','ne_50m_lakes.geojson',12000000]]){
 const data=JSON.parse((await fetchSource(prefix+file,max)).toString('utf8'));
 for(const f of data.features){
  const rank=Number(f.properties?.scalerank??6);
  if(rank>5)continue;
  const lines=getPaths(f).filter(a=>Array.isArray(a)&&a.length>=3).map(transformLine);
  if(lines.length)hydrology[key].push({rank,name:f.properties?.name||'',paths:lines});
 }
 console.log('Natural Earth',key+':',hydrology[key].length,'visible features');
}
await writeFile(path.join(output,'hydrology-50m.json'),JSON.stringify(hydrology));
console.log('Offline hydrology size:',(await stat(path.join(output,'hydrology-50m.json'))).size);

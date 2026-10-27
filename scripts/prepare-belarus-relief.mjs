/* Belarus-specific hypsometric physical map, using REAL elevation samples.
 * Source: Mapzen Terrain Tiles / AWS Open Data terrarium tiles (global DEM).
 * Elevation = R*256 + G + B/256 - 32768 metres, Web Mercator.
 * Clip precisely to Belarus boundary from Natural Earth 1:50m world-atlas.
 * Only generated at build time. Final PNG works offline; no AWS requests
 * from a pupil browser. Credit in UI and README.
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=path.resolve('public/globus');
const source=JSON.parse(await fs.readFile(path.join(ROOT,'world-50m.json'),'utf8'));
const geometry=source.objects.countries.geometries.find(g=>String(g.id)==='112'); // ISO numeric BLR
if(!geometry)throw Error('Belarus 112 polygon not found in world-atlas');
function arcsToRings(top,g){
 const cache=new Map();
 const arc=(id)=>{const rev=id<0,k=rev?~id:id;
  if(!cache.has(k)){
   let lon=0,lat=0;cache.set(k,top.arcs[k].map(p=>{
    lon+=p[0];lat+=p[1];
    return [lon*top.transform.scale[0]+top.transform.translate[0],
            lat*top.transform.scale[1]+top.transform.translate[1]]
   }));
  }
  const arr=cache.get(k);return rev?[...arr].reverse():arr;
 };
 const ring=ids=>ids.flatMap((id,i)=>{const p=arc(id);return i?p.slice(1):p});
 const polys=g.type==='Polygon'?[g.arcs]:g.arcs;
 return polys.map(p=>p.map(ring));
}
const polygons=arcsToRings(source,geometry);
function insideRing(lon,lat,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat) && lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function inBelarus(lon,lat){
 return polygons.some(rings=>insideRing(lon,lat,rings[0])&&!rings.slice(1).some(r=>insideRing(lon,lat,r)));
}
const bounds={west:22.8,east:33.0,south:51.1,north:56.3};
const Z=8,N=2**Z,SIZE=256;
const mercX=lon=>(lon+180)/360*N;
const mercY=lat=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*N;
const minX=Math.floor(mercX(bounds.west)),maxX=Math.floor(mercX(bounds.east));
const minY=Math.floor(mercY(bounds.north)),maxY=Math.floor(mercY(bounds.south));
const jobs=[];for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)jobs.push({x,y});
const tiles=new Map();let next=0;
async function fetchOne({x,y}){
 const url=`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const raw=Buffer.from(await response.arrayBuffer());
   const image=await sharp(raw).removeAlpha().raw().toBuffer({resolveWithObject:true});
   if(image.info.width!==SIZE||image.info.height!==SIZE||image.info.channels!==3)throw Error('Unexpected tile '+url);
   tiles.set(`${x}/${y}`,image.data);return;
  }catch(err){
   if(attempt===3)throw new Error(url+': '+err.message);
   await new Promise(r=>setTimeout(r,400*attempt));
  }
 }
}
const workers=Array.from({length:8},async()=>{while(next<jobs.length){const i=next++;await fetchOne(jobs[i])}});
await Promise.all(workers);
const elevation=(lon,lat)=>{
 const xt=mercX(lon),yt=mercY(lat),tx=Math.floor(xt),ty=Math.floor(yt);
 const tile=tiles.get(`${tx}/${ty}`);if(!tile)return 140;
 const cx=Math.max(0,Math.min(255,Math.floor((xt-tx)*SIZE)));
 const cy=Math.max(0,Math.min(255,Math.floor((yt-ty)*SIZE)));
 const k=(cy*SIZE+cx)*3;
 return Math.max(-200,Math.min(750,tile[k]*256+tile[k+1]+tile[k+2]/256-32768));
};
const stops=[
 [60,[19,67,39]],[100,[24,93,46]],[125,[37,116,53]],[145,[67,137,63]],
 [165,[114,156,76]],[185,[162,168,84]],[205,[199,165,67]],
 [225,[223,151,60]],[245,[224,132,49]],[275,[208,105,44]],
 [310,[187,81,41]],[380,[154,62,32]]
];
function color(m){
 let i=1;while(i<stops.length-1&&m>stops[i][0])i++;
 const [a,from]=stops[i-1],[b,to]=stops[i],f=Math.max(0,Math.min(1,(m-a)/(b-a)));
 return from.map((v,j)=>v+(to[j]-v)*f);
}
const width=2048,height=1152,out=Buffer.alloc(width*height*4);
let land=0,minElevation=1e9,maxElevation=-1e9;
const degreesPerPixel=(bounds.east-bounds.west)/width;
for(let y=0;y<height;y++){
 const lat=bounds.north-(y+.5)*(bounds.north-bounds.south)/height;
 for(let x=0;x<width;x++){
  const lon=bounds.west+(x+.5)*degreesPerPixel;
  if(!inBelarus(lon,lat))continue;
  const m=elevation(lon,lat);
  minElevation=Math.min(minElevation,m);maxElevation=Math.max(maxElevation,m);land++;
  const west=elevation(lon-.012,lat),east=elevation(lon+.012,lat);
  const north=elevation(lon,lat+.006),south=elevation(lon,lat-.006);
  const dzdx=(east-west)*.023,dzdy=(south-north)*.025;
  const shade=Math.max(.73,Math.min(1.20,.99+(-dzdx-dzdy)*.12));
  const c=color(m),i=(y*width+x)*4;
  for(let k=0;k<3;k++)out[i+k]=Math.min(255,Math.round(c[k]*shade));
  out[i+3]=255;
 }
}
if(land<250000||minElevation>125||maxElevation<260)throw Error('Belarus DEM unrealistic: '+JSON.stringify({land,minElevation,maxElevation}));
const target=path.join(ROOT,'belarus-relief-9.png');
await sharp(out,{raw:{width,height,channels:4}}).png({compressionLevel:9,palette:true,quality:95}).toFile(target);
await fs.writeFile(path.join(ROOT,'belarus-relief-9.json'),JSON.stringify({bounds,width,height,range:[Math.round(minElevation),Math.round(maxElevation)],source:'Mapzen Terrain Tiles/Mapzen Joerd, AWS Open Data; Natural Earth 50m boundary',clip:'BLR Natural Earth 1:50m',grades:[9]}));
console.log('Belarus local 9th-grade DEM ready:',jobs.length,'elevation tiles,',land,'land pixels,',minElevation.toFixed(1),'-',maxElevation.toFixed(1),'m,',target);

/* Derive hill/lowland contours from actual DEM cells, not manually invented
 * ellipses. These are approximate terrain-height zones, NOT surveyed regional
 * administrative or physiographic boundaries. School-friendly simplification.
 */
const cellsX=680,cellsY=345,dx=(bounds.east-bounds.west)/cellsX,dy=(bounds.north-bounds.south)/cellsY;
const grid=new Float32Array(cellsX*cellsY),valid=new Uint8Array(cellsX*cellsY);
for(let y=0;y<cellsY;y++)for(let x=0;x<cellsX;x++){
 const lon=bounds.west+(x+.5)*dx,lat=bounds.north-(y+.5)*dy,i=y*cellsX+x;
 if(inBelarus(lon,lat)){grid[i]=elevation(lon,lat);valid[i]=1}
}
const regions=[
 {name:'Белорусская гряда',box:[23.3,52.9,30.3,55.0],m:187,dir:1,seed:[26.9,53.8],multiple:true},
 {name:'Минская возвышенность',box:[26.2,53.55,28.2,54.6],m:199,dir:1,seed:[27.1,54.05]},
 {name:'Новогрудская возвышенность',box:[25.0,53.25,26.68,54.04],m:193,dir:1,seed:[25.87,53.6]},
 {name:'Ошмянская возвышенность',box:[25.3,53.97,27.05,54.92],m:190,dir:1,seed:[26.1,54.45]},
 {name:'Полесская низменность',box:[23.2,51.38,31.24,53.05],m:156,dir:-1,seed:[27.7,52.15]},
 {name:'Центральноберезинская равнина',box:[27.0,52.82,30.55,54.25],m:187,dir:-1,seed:[28.65,53.35]}
];
function makeTerrainZone(spec){
 const mask=new Uint8Array(valid.length);let count=0;
 for(let y=0;y<cellsY;y++)for(let x=0;x<cellsX;x++){
  const i=y*cellsX+x;if(!valid[i])continue;
  const lon=bounds.west+(x+.5)*dx,lat=bounds.north-(y+.5)*dy;
  if(lon<spec.box[0]||lon>spec.box[2]||lat<spec.box[1]||lat>spec.box[3])continue;
  const h=grid[i],inside=spec.dir>0?h>=spec.m:h<=spec.m;
  if(inside)mask[i]=1,count++;
 }
 // Components keep the terrain region around the nomenclature anchor. The
 // longitudinal Belarusian Ridge is a chain of separate elevated hills.
 const component=new Int32Array(mask.length);let id=0,components=[],queue=new Int32Array(mask.length);
 for(let i=0;i<mask.length;i++){
  if(!mask[i]||component[i])continue;
  id++;let size=0,front=0,back=1;queue[0]=i;component[i]=id;
  let closest=1e9;
  while(front<back){
   const u=queue[front++],ux=u%cellsX,uy=Math.floor(u/cellsX);size++;
   const lon=bounds.west+(ux+.5)*dx,lat=bounds.north-(uy+.5)*dy;
   closest=Math.min(closest,Math.hypot((lon-spec.seed[0])*.6,lat-spec.seed[1]));
   for(const nb of [ux>0?u-1:-1,ux<cellsX-1?u+1:-1,uy>0?u-cellsX:-1,uy<cellsY-1?u+cellsX:-1]){
    if(nb>=0&&mask[nb]&&!component[nb]){component[nb]=id;queue[back++]=nb}
   }
  }
  components.push({id,size,closest});
 }
 components.sort((a,b)=>a.closest-b.closest);
 let keep=new Set();
 if(spec.multiple)for(const c of components)if(c.size>=55)keep.add(c.id);
 else for(const c of components.slice(0,3))if(c.size>=10&&c.closest<.8)keep.add(c.id);
 if(!keep.size&&components[0])keep.add(components[0].id);
 const edges=new Map();
 const addEdge=(a,b)=>{
  const k=a.join(','),j=b.join(',');
  if(!edges.has(k))edges.set(k,[]);
  edges.get(k).push(j);
 };
 const active=(x,y)=>x>=0&&x<cellsX&&y>=0&&y<cellsY&&keep.has(component[y*cellsX+x]);
 for(let y=0;y<cellsY;y++)for(let x=0;x<cellsX;x++){
  if(!active(x,y))continue;
  if(!active(x,y-1))addEdge([x,y],[x+1,y]);
  if(!active(x+1,y))addEdge([x+1,y],[x+1,y+1]);
  if(!active(x,y+1))addEdge([x+1,y+1],[x,y+1]);
  if(!active(x-1,y))addEdge([x,y+1],[x,y]);
 }
 const rings=[];let maxSteps=cellsX*cellsY*4;
 while(edges.size&&rings.length<150){
  const first=edges.keys().next().value,current=[...first.split(',').map(Number)],ring=[],origin=first;
  let key=first,steps=0;
  while(steps++<maxSteps){
   const [x,y]=key.split(',').map(Number);
   ring.push([+(bounds.north-y*dy).toFixed(4),+(bounds.west+x*dx).toFixed(4)]);
   const next=edges.get(key)?.pop();if(!next)break;
   if(!edges.get(key).length)edges.delete(key);
   key=next;if(key===origin)break;
  }
  if(ring.length>=15){
   const sampled=ring.filter((p,i)=>i%Math.max(1,Math.floor(ring.length/2000))===0);
   if(sampled.length>=12)rings.push(sampled);
  }
 }
 if(!rings.length)throw Error('No DEM-derived ring for '+spec.name+' components '+JSON.stringify(components.slice(0,3)));
 console.log('DEM-derived outline',spec.name,count,'cells',rings.length,'rings');
 return {name:spec.name,kind:'natural',quality:'dem-derived',source:'Mapzen elevation zone '+(spec.dir>0?'>=':'<=')+spec.m+' m; not an official physiographic boundary',rings};
}
const terrainRegions=Object.fromEntries(regions.map(spec=>[spec.name,makeTerrainZone(spec)]));
await fs.writeFile(path.join(ROOT,'belarus-regions-dem.json'),JSON.stringify({source:'Mapzen/AWS elevation-derived approximate terrain zone boundaries',regions:terrainRegions}));
console.log('Six Belarus relief contours generated from DEM, not geometric ellipses');

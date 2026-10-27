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

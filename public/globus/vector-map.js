/* Local, scale-independent Natural Earth screen vectors.
   Uses the exact orthographic projection shared with the globe; geometry
   is self-hosted world-110m.json (public domain). No tile-server dependency.
   Above zoom 1.7 polygons are painted at actual screen pixel resolution,
   so country borders do not blur when the image-based globe is magnified.
   Physical elevation color texture remains a raster relief image. */
(function(){
'use strict';
const DEG=Math.PI/180;
function hashHue(id){
 const seed=Array.from(String(id)).reduce((a,c)=>(a*37+c.charCodeAt(0))%9973,73);
 return 'hsl('+((seed*137.508)%360).toFixed(0)+',47%,'+(58+(seed%4)*5)+'%)';
}
function shortLon(a,b){return ((b-a+540)%360)-180}
function paintRing(ctx,ring,project,zoom){
 let started=false,drew=false;
 if(ring.length<3)return false;
 const maxStep=zoom>8?.8:1.6;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],diffLon=shortLon(a[0],b[0]);
  const span=Math.hypot(diffLon*Math.cos(((a[1]+b[1])*.5)*DEG),b[1]-a[1]);
  const n=Math.max(1,Math.min(280,Math.ceil(span/maxStep)));
  for(let step=0;step<n;step++){
   const k=step/n,lat=a[1]+(b[1]-a[1])*k,lon=a[0]+diffLon*k;
   const p=project(lat*DEG,lon*DEG);
   if(p.vis<=0.0001){started=false;continue}
   if(!started)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
   started=true;drew=true;
  }
 }
 // Close original ring only if the starting and ending point are on the front.
 const first=project(ring[0][1]*DEG,ring[0][0]*DEG);
 if(started&&first.vis>.0001)ctx.closePath();
 return drew;
}
/* Polygon bounds cached once: at close zoom do not project countries that
   cannot intersect the current map viewport. */
const extents=new WeakMap();
function boxFor(poly){
 if(extents.has(poly))return extents.get(poly);
 let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(const ring of poly.rings||[])for(const p of ring){
  west=Math.min(west,p[0]);east=Math.max(east,p[0]);
  south=Math.min(south,p[1]);north=Math.max(north,p[1]);
 }
 const b={west,east,south,north};extents.set(poly,b);return b;
}
function inView(poly,camera,zoom){
 if(!camera||zoom<3)return true;
 const b=boxFor(poly),radius=110/zoom;
 if(camera.lat<b.south-radius||camera.lat>b.north+radius)return false;
 const maxLon=radius/Math.max(.22,Math.cos(camera.lat*DEG));
 return [-360,0,360].some(shift=>{
  const min=b.west+shift,max=b.east+shift;
  return camera.lon>=min-maxLon&&camera.lon<=max+maxLon;
 });
}
function draw(ctx,polys,project,zoom,mode,width,height,camera=null){
 if(!Array.isArray(polys)||zoom<1.8)return;
 ctx.save();
 ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
 ctx.lineJoin='round';ctx.lineCap='round';
 for(const poly of polys){
  if(!inView(poly,camera,zoom))continue;
  ctx.beginPath();let any=false;
  for(const ring of poly.rings){any=paintRing(ctx,ring,project,zoom)||any}
  if(!any)continue;
  if(mode==='political'){
   ctx.globalAlpha=1;ctx.fillStyle=hashHue(poly.id);
   ctx.fill('evenodd');ctx.strokeStyle='rgba(21,39,62,.88)';ctx.lineWidth=1.3;ctx.stroke();
  }else{
   // Relief is kept intact, while coastlines gain vector-sharp definition.
   ctx.strokeStyle='rgba(8,59,81,.75)';ctx.lineWidth=1.2;ctx.stroke();
  }
 }
 ctx.restore();
}
window.GLOBE_VECTOR_MAP={draw,hashHue,shortLon,paintRing,inView};
})();
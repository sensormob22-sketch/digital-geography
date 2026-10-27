/* Offline rivers and lakes for BOTH globe modes.
   Natural Earth 1:50m geography is in public/globus/hydrology-50m.json.
   Lines and lakes follow orthographic front-hemisphere clipping.
   No network tile service; coordinates are longitude,latitude. */
(function(){
'use strict';
const DEG=Math.PI/180;
function visiblePoint(pair,project){
 const p=project(pair[1]*DEG,pair[0]*DEG);
 return {x:p.x,y:p.y,front:p.vis>.002};
}
function path(ctx,coordinates,project,close=false){
 let started=false,any=false;
 for(let i=0;i<coordinates.length;i++){
  const pt=visiblePoint(coordinates[i],project);
  if(!pt.front){started=false;continue;}
  if(!started)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);
  any=true;started=true;
 }
 if(close&&started&&visiblePoint(coordinates[0],project).front)ctx.closePath();
 return any;
}
const extents=new WeakMap();
function boxFor(f){
 if(extents.has(f))return extents.get(f);
 let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(const line of f.paths||[])for(const p of line){
  west=Math.min(west,p[0]);east=Math.max(east,p[0]);
  south=Math.min(south,p[1]);north=Math.max(north,p[1]);
 }
 const box={west,east,south,north};extents.set(f,box);return box;
}
function inView(f,camera,zoom){
 if(!camera||zoom<3)return true;
 const box=boxFor(f),radius=110/zoom;
 if(camera.lat<box.south-radius||camera.lat>box.north+radius)return false;
 const margin=radius/Math.max(.22,Math.cos(camera.lat*DEG));
 return [-360,0,360].some(shift=>camera.lon>=box.west+shift-margin&&camera.lon<=box.east+shift+margin);
}
function draw(ctx,data,project,zoom,mode,rankOverride=null,camera=null){
 if(!data)return;
 const rankLimit=rankOverride??(zoom<1.35?1:zoom<2.2?2:zoom<4?3:5);
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 // Lakes appear over colored national polygons and over the natural relief.
 ctx.lineWidth=zoom>=6?1.35:.85;
 for(const lake of data.lakes||[]){
  if(lake.rank>rankLimit||!inView(lake,camera,zoom))continue;
  ctx.beginPath();let drawn=false;
  for(const line of lake.paths)drawn=path(ctx,line,project,true)||drawn;
  if(drawn){
   ctx.fillStyle=mode==='political'?'#62bae9':'#57bee6';
   ctx.strokeStyle=mode==='political'?'#22629a':'#163f62';
   ctx.globalAlpha=.93;ctx.fill('evenodd');ctx.stroke();
  }
 }
 const streamLimit=rankLimit;
 for(const river of data.rivers||[]){
  if(river.rank>streamLimit||!inView(river,camera,zoom))continue;
  ctx.beginPath();let drawn=false;
  for(const line of river.paths)drawn=path(ctx,line,project,false)||drawn;
  if(drawn){
   ctx.globalAlpha=mode==='political'?.93:.85;
   ctx.strokeStyle=mode==='political'?'#176dad':'#70dcf8';
   ctx.lineWidth=Math.max(.8,(zoom>5?1.55:1.1) - river.rank*.09);
   ctx.stroke();
  }
 }
 ctx.restore();
}
window.GLOBE_HYDROLOGY_RENDERER={draw,visiblePoint,path,inView};
})();
/* Draw geographic contours on the same orthographic projection as the globe.
   Handles antimeridian wrapping and clips outline strokes at the front horizon.
   All coordinates use [latitude, longitude] in degrees.
   Canvas operations work with logical screen pixels (caller sets DPR transform).
 */
(function(){
'use strict';
const PI=Math.PI, DEG=PI/180;
const palette={natural:'#5fe6eb',urban:'#ff63bd',activeNatural:'#56f5fb',activeUrban:'#ff3d9e'};
function wrappedDiff(a,b){return ((b-a+540)%360)-180}
function geoInterpolate(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+wrappedDiff(a[1],b[1])*t]}
function projected(pt,project){
 const p=project(pt[0]*DEG,pt[1]*DEG);
 return {x:p.x,y:p.y,vis:p.vis};
}
function horizon(a,b,project,t0,t1){
 // Bisect the front/back transition along this short geographic segment.
 const front=projected(geoInterpolate(a,b,t0),project).vis>0;
 for(let i=0;i<18;i++){
  const mid=(t0+t1)*.5,p=projected(geoInterpolate(a,b,mid),project);
  if((p.vis>0)===front)t0=mid;else t1=mid;
 }
 return projected(geoInterpolate(a,b,(t0+t1)*.5),project);
}
function ringPath(ctx,ring,project,zoom){
 let drawing=false,complete=true,valid=false;const visible=(p)=>p.vis>1e-6;
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];
  const dl=wrappedDiff(a[1],b[1]),diff=Math.hypot((b[0]-a[0]),dl*Math.cos((a[0]+b[0])*.5*DEG));
  const sampleStep=Math.max(.25,Math.min(2,60/Math.max(1,zoom)));
  const steps=Math.max(1,Math.min(250,Math.ceil(diff/sampleStep)));
  let prevA=a,prev=projected(a,project);
  for(let j=1;j<=steps;j++){
   const t=j/steps,nextA=geoInterpolate(a,b,t),next=projected(nextA,project);
   const pv=visible(prev),nv=visible(next);
   if(pv&&nv){
    if(!drawing){ctx.moveTo(prev.x,prev.y);drawing=true;}
    ctx.lineTo(next.x,next.y);valid=true;
   }else if(pv&&!nv){
    if(!drawing)ctx.moveTo(prev.x,prev.y);
    const cut=horizon(prevA,nextA,project,0,1);
    ctx.lineTo(cut.x,cut.y);drawing=false;complete=false;valid=true;
   }else if(!pv&&nv){
    const cut=horizon(prevA,nextA,project,0,1);
    ctx.moveTo(cut.x,cut.y);ctx.lineTo(next.x,next.y);
    drawing=true;complete=false;valid=true;
   }else{drawing=false;complete=false;}
   prev=next;prevA=nextA;
  }
 }
 if(complete&&drawing)ctx.closePath();
 return {valid,complete};
}
function buildPath(ctx,shape,project,zoom){
 let valid=false,complete=true;ctx.beginPath();
 for(const ring of shape.rings){
  const r=ringPath(ctx,ring,project,zoom);valid=valid||r.valid;complete=complete&&r.complete;
 }
 return {valid,complete};
}
function uniqueObjects(items,areas,flags){
 const result=[],seen=new Set();
 for(const o of items){
  const name=o.rawName||o.name;
  const shape=areas.get(name);
  if(!shape||seen.has(name)||!flags[shape.kind])continue;
  seen.add(name);result.push({object:o,shape});
 }
 return result;
}
/* One outline appears only for the selected object, in its matching map. */
function activeArea(selected,areas,mode){
 if(!selected||!areas?.get)return null;
 const shape=areas.get(selected.rawName||selected.name);
 if(!shape||((shape.kind==='urban'?'political':'physical')!==mode))return null;
 return shape;
}
function draw(ctx,items,selected,areas,project,zoom,mode='physical'){
 const shape=activeArea(selected,areas,mode);if(!shape)return;
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 const done=buildPath(ctx,shape,project,zoom);
 if(done.valid){
  ctx.globalAlpha=1;ctx.setLineDash([]);
  const color=shape.kind==='urban'?palette.activeUrban:palette.activeNatural;
  const terrain=shape.quality==='dem-derived',mapped=shape.quality==='mapped';
  if(done.complete&&!terrain){
   ctx.fillStyle=shape.kind==='urban'?'rgba(255,61,158,.12)':'rgba(41,209,221,.10)';
   ctx.fill('evenodd');
  }
  ctx.strokeStyle=terrain?'rgba(7,35,46,.78)':'rgba(5,16,37,.94)';
  ctx.lineWidth=terrain?3.1:mapped?4.3:6.5;ctx.stroke();
  ctx.strokeStyle=terrain?'rgba(116,237,218,.9)':color;
  ctx.lineWidth=terrain?1.7:mapped?2.6:3.4;ctx.stroke();
  if(!terrain){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.9;ctx.stroke();}
 }
 ctx.restore();
}
function distanceToSegment(x,y,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=den===0?0:Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/den));
 return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
}
function nearContour(x,y,items,areas,project,zoom,mode='physical',selected=null){
 const shape=activeArea(selected,areas,mode);
 if(!shape)return null;
 let distance=13;
 for(const ring of shape.rings){
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length],dl=wrappedDiff(a[1],b[1]);
   const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],dl)/Math.max(.2,Math.min(2,70/zoom))));
   let prev=projected(a,project);
   for(let k=1;k<=n;k++){
    const curr=projected(geoInterpolate(a,b,k/n),project);
    if(prev.vis>.002&&curr.vis>.002){
     const d=distanceToSegment(x,y,prev,curr);
     if(d<distance)return selected;
    }
    prev=curr;
   }
  }
 }
 return null;
}
window.GLOBE_AREA_RENDERER={draw,nearContour,wrappedDiff,geoInterpolate,buildPath,palette,uniqueObjects,activeArea};
})();
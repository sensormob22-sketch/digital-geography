/* Belarus: six administrative oblasts and the distinct city of Minsk.
 * Source shapes are derived from geoBoundaries gbOpen BLR ADM1 (CC BY 3.0),
 * bundled as belarus-oblasts.json. No guessed ellipse borders.
 * Render only on the grade 9 political map using the globe's projection. */
(function(){
'use strict';
const RAD=Math.PI/180;
const palette={
 brest:'#3e9ada',grodno:'#9f83cf',minsk:'#e9c765',
 vitebsk:'#e77dae',mogilev:'#70bd89',gomel:'#f18a7a','minsk-city':'#fef5bf'
};
const translations={
 brest:['Брестская область','Брэсцкая вобласць','Brest Region'],
 grodno:['Гродненская область','Гродзенская вобласць','Grodno Region'],
 minsk:['Минская область','Мінская вобласць','Minsk Region'],
 vitebsk:['Витебская область','Віцебская вобласць','Vitebsk Region'],
 mogilev:['Могилёвская область','Магілёўская вобласць','Mogilev Region'],
 gomel:['Гомельская область','Гомельская вобласць','Gomel Region'],
 'minsk-city':['г. Минск','г. Мінск','Minsk City']
};
const countryLabels=[
 {lat:55.15,lon:32.90,names:['Россия','Расія','Russia']},
 {lat:51.47,lon:28.30,names:['Украина','Украіна','Ukraine']},
 {lat:52.82,lon:22.89,names:['Польша','Польшча','Poland']},
 {lat:54.76,lon:24.87,names:['Литва','Літва','Lithuania']},
 {lat:56.18,lon:26.96,names:['Латвия','Латвія','Latvia']}
];
const centers=[
 ['brest',52.50,25.60],['grodno',53.86,25.30],['minsk',54.03,28.20],
 ['vitebsk',55.22,29.60],['mogilev',53.95,30.45],['gomel',52.49,30.39]
];
let regions=[];
function setData(data){
 regions=(data?.regions||[]).filter(v=>Object.hasOwn(palette,v.key)&&Array.isArray(v.rings));
 return regions.length;
}
function languageIndex(lang){return lang==='be'?1:lang==='en'?2:0}
function title(key,lang){return translations[key]?.[languageIndex(lang)]||key}
function label(ctx,value,point,{color='#fff',fill='rgba(15,35,63,.83)',size=12,weight=800}={}){
 if(!point||point.vis<=.02)return false;
 const labelText=String(value);
 ctx.save();ctx.font=weight+' '+size+'px system-ui,"Segoe UI",sans-serif';
 const tw=ctx.measureText(labelText).width,ww=tw+15,hh=size+13;
 const x=point.x-ww/2,y=point.y-hh/2;
 if(x<3||x+ww>ctx.canvas.width/Math.max(1,ctx.getTransform().a)-3||
    y<3||y+hh>ctx.canvas.height/Math.max(1,ctx.getTransform().d)-3){ctx.restore();return false}
 ctx.fillStyle=fill;ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=.8;
 ctx.beginPath();ctx.roundRect(x,y,ww,hh,5);ctx.fill();ctx.stroke();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
 ctx.fillText(labelText,point.x,point.y+1);
 ctx.restore();return true;
}
function draw(ctx,project,zoom,mode,lang,chosenRegion){
 if(mode!=='political'||zoom<1.8||!regions.length)return;
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 for(const region of regions){
  ctx.beginPath();let visible=false;
  for(const ring of region.rings){
   let started=false,first=null;
   for(const [lon,lat] of ring){
    const p=project(lat*RAD,lon*RAD);
    if(p.vis<=.005){started=false;continue}
    if(!started){ctx.moveTo(p.x,p.y);first=p}else ctx.lineTo(p.x,p.y);
    started=true;visible=true;
   }
   if(started&&first)ctx.closePath();
  }
  if(!visible)continue;
  ctx.fillStyle=palette[region.key];ctx.globalAlpha=region.key==='minsk-city'?.95:chosenRegion===region.key?.94:.86;
  ctx.fill('evenodd');ctx.globalAlpha=1;
  ctx.strokeStyle=chosenRegion===region.key?'#fff8a3':'#294358';
  ctx.lineWidth=chosenRegion===region.key?3.3:1.55;ctx.stroke();
 }
 ctx.restore();
 // Region names are tied to fixed geographic positions and clipped by the
 // globe projection. At small scale hide them to avoid an illegible cluster.
 if(zoom>=5.8){
  for(const [key,lat,lon] of centers)
   label(ctx,title(key,lang),project(lat*RAD,lon*RAD),{size:zoom<8?10:12,fill:'rgba(18,45,69,.79)'});
 }
}
function drawNeighbors(ctx,project,zoom,lang){
 if(zoom<2.9)return;
 const i=languageIndex(lang);
 for(const neighbor of countryLabels)
  label(ctx,neighbor.names[i],project(neighbor.lat*RAD,neighbor.lon*RAD),{size:zoom<7?11:13});
}
function legend(lang){return Object.entries(palette).filter(([key])=>key!=='minsk-city').map(([key,color])=>({key,color,label:title(key,lang)}))}
window.GLOBE_BELARUS_REGIONS={setData,draw,drawNeighbors,legend,palette,title,countryLabels,get count(){return regions.length}};
})();
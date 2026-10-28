/* Fit the full territory of Belarus into ~75% of the viewing stage.
 * For the grade 9 classroom camera, the six oblast outlines (and Minsk)
 * determine the country footprint; a geodetic fallback is used before they
 * arrive or during offline first paint. All values are in map coordinates,
 * not pixel offsets tied to one phone or desktop resolution.
 */
(function(){'use strict';
const DEG=Math.PI/180;
const fallback=[[23.17,51.26],[32.78,51.26],[32.78,56.17],[23.17,56.17]];
function coords(data){
 const from=data?.regions?.flatMap(region=>region.rings?.flatMap(r=>r)||[])||[];
 return from.length>16?from:fallback;
}
function fit(width,height,data,fraction=.75){
 const pts=coords(data),w=Math.max(1,width||680),h=Math.max(1,height||640);
 let west=180,east=-180,south=90,north=-90;
 for(const [lon,lat] of pts){west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat)}
 const lon=(west+east)/2,lat=(south+north)/2,lo=lon*DEG,la=lat*DEG;
 const cos=Math.cos(la),sin=Math.sin(la);
 let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
 for(const [x,y] of pts){
  const phi=y*DEG,d=(x-lon)*DEG,c=Math.cos(phi);
  const px=c*Math.sin(d),py=cos*Math.sin(phi)-sin*c*Math.cos(d);
  l=Math.min(l,px);r=Math.max(r,px);
  t=Math.min(t,py);b=Math.max(b,py);
 }
 const spanX=Math.max(.001,r-l),spanY=Math.max(.001,b-t);
 const unit=Math.min(w,h)*.445;
 const zoom=fraction*Math.min(w/(unit*spanX),h/(unit*spanY));
 return {lon:lo,lat:la,zoom,spanX,spanY,coverageX:unit*zoom*spanX/w,coverageY:unit*zoom*spanY/h,source:pts===fallback?'fallback':'oblasts'};
}
function cityTarget(city,camera){
 const t=.16;
 return {lon:camera.lon+(city.lon*DEG-camera.lon)*t,
  lat:camera.lat+(city.lat*DEG-camera.lat)*t,zoom:camera.zoom*1.08};
}
window.GLOBE_BELARUS_VIEW={fit,cityTarget,coords};
})();
/* Static geometry and unit tests for the school-globe contour layer. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..','public','globus'),window={};
const sandbox=vm.createContext({window});
for(const file of ['objects.js','areas.js','area-renderer.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const data=window.GLOBE_AREAS,render=window.GLOBE_AREA_RENDERER,cat=window.GLOBE_CATALOG;
assert(data?.get&&render?.draw&&render?.nearContour,'Area catalogue and renderer must load');
const names=new Set();
for(const grade of [6,7,8,9,10,11])for(const [,rows] of cat[grade])
 for(const entry of rows.split(';'))names.add(entry.split('|')[0]);
const contours=data.entries();
let natural=0,urban=0,nodes=0;
const existing=new Set();
for(const [name,shape] of contours){
 assert(names.has(name),'Area has no corresponding nomenclature object: '+name);
 assert(!existing.has(name),'Duplicate contour '+name);existing.add(name);
 assert(['natural','urban'].includes(shape.kind),'Invalid area kind '+name);
 assert.equal(shape.quality,'schematic','Contours must not claim survey accuracy');
 if(shape.kind==='urban')urban++;else natural++;
 for(const ring of shape.rings){
  assert(ring.length>=3,'Insufficient polygon vertices: '+name);
  for(const pt of ring){
   assert(pt.length===2&&Number.isFinite(pt[0])&&Number.isFinite(pt[1]),'Non-numeric coordinates: '+name);
   assert(Math.abs(pt[0])<=90&&Math.abs(pt[1])<=180,'Out-of-bounds coordinates: '+name);
   nodes++;
  }
 }
}
assert(natural>=60&&urban>=25,'Unexpected missing contour geometries');
assert(data.get('Гималаи').kind==='natural','Himalayas should be natural');
assert(data.get('Босваш (Приатлантический)').kind==='urban','BosWash should be urban');
assert(data.get('Токио').kind==='urban','Tokyo alias should be urban');
assert(!data.get('Минск'),'Individual cities must remain markers');
assert(Math.abs(render.wrappedDiff(179,-179)-2)<.00001,'Antimeridian should use short path');
assert(Math.abs(render.wrappedDiff(-179,179)+2)<.00001,'Reverse antimeridian should use short path');
let operations={line:0,stroke:0,fill:0};
const fake={
 save(){},restore(){},beginPath(){},moveTo(){},lineTo(){operations.line++},closePath(){},
 stroke(){operations.stroke++},fill(){operations.fill++},setLineDash(){}
};
const centerLat=29,centerLon=86,deg=Math.PI/180;
const projection=(lat,lon)=>({x:400+(lon/deg-centerLon)*12,y:300-(lat/deg-centerLat)*12,vis:1});
const him={id:'1-1',rawName:'Гималаи'};
render.draw(fake,[him],him,data,projection,3,{natural:true,urban:true});
assert(operations.stroke>=3&&operations.fill>=1,'Selected region should render outline and fill');
const ring=data.get('Гималаи').rings[0];
const hit=render.nearContour(400+(ring[0][1]-centerLon)*12,300-(ring[0][0]-centerLat)*12,[him],data,projection,3);
assert(hit&&hit.id===him.id,'Contour should be clickable near its edge');
const empty=render.nearContour(0,0,[him],data,projection,3,{natural:false,urban:true});
assert(!empty,'Hidden area layer should not be selectable');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const file of ['areas.js','area-renderer.js'])assert(html.includes('src="./'+file+'"'),'Missing globe import '+file);
assert(html.includes('AREA_RENDER.draw')&&html.includes('AREA_RENDER.nearContour'),'Renderer must be used for drawing and hit-testing');
assert(html.includes('data-area-layer="natural"')&&html.includes('data-area-layer="urban"')||html.includes('data-area-layer=\\\"natural\\\"'),'Both contour layer controls should be rendered');
console.log('Contour tests passed:',natural,'natural areas,',urban,'urban zones,',nodes,'vertices; antimeridian, selection, projection, visibility and local imports OK');

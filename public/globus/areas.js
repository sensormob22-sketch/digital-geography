/* Contour layer for the school globe (RU keys match objects.js).
   These polygons are SCHEMATIC teaching regions, not surveyed/legal/navigational
   limits and not derived from the point coordinates. Do not use them for area
   measurements. Countries remain sourced from the existing Natural Earth TopoJSON.
   Geometry stays in local JS for availability in Belarus and offline. */
(function(){
'use strict';
const shapes=Object.create(null);
function parse(text){return text.trim().split(/\s+/).map(v=>v.split(',').map(Number));}
// Each coordinate is latitude,longitude; stored as geographic radians-free degrees.
function add(name,kind,ring){const coords=parse(ring);if(coords.length<3)throw Error('Invalid ring '+name);
 shapes[name]={name,kind,quality:'schematic',rings:[coords]};}
function ellipse(name,kind,lat,lon,rLat,rLon,skew=0){
 const ring=[];for(let i=0;i<32;i++){const t=i*2*Math.PI/32;
  const dy=rLat*Math.sin(t),dx=rLon*Math.cos(t)+skew*Math.sin(t);
  ring.push([lat+dy,lon+dx]);}
 shapes[name]={name,kind,quality:'schematic',rings:[ring]};
}
// Corridors are traced along selected major centers and buffered to indicate a
// teaching zone. Their width is a visualization parameter, NOT a GIS boundary.
function corridor(name,stations,widthKm){
 const pts=parse(stations),plus=[],minus=[];
 for(let i=0;i<pts.length;i++){
  const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];
  const dy=(b[0]-a[0])*111.2,dx=(b[1]-a[1])*111.2*Math.cos(pts[i][0]*Math.PI/180);
  const length=Math.max(.00001,Math.hypot(dx,dy));
  const latShift=dx/length*widthKm/111.2;
  const lonShift=-dy/length*widthKm/(111.2*Math.max(.2,Math.cos(pts[i][0]*Math.PI/180)));
  plus.push([pts[i][0]+latShift,pts[i][1]+lonShift]);
  minus.push([pts[i][0]-latShift,pts[i][1]-lonShift]);
 }
 shapes[name]={name,kind:'urban',quality:'schematic',rings:[plus.concat(minus.reverse())]};
}
// 1. Continents and broad regions (school-oriented outlines, not coastlines).
add('Евразия','natural','36,-10 44,-10 55,-8 66,2 71,23 76,55 72,100 72,135 66,179 52,164 43,142 34,138 27,122 19,109 12,103 6,101 1,105 7,99 17,95 8,77 9,67 20,57 13,46 23,39 30,30 36,28 43,26');
add('Африка','natural','36,-6 38,10 31,34 13,51 0,43 -12,45 -26,34 -35,20 -34,17 -22,13 -15,11 -6,9 4,2 14,-17 25,-18 32,-12');
add('Северная Америка','natural','7,-82 13,-88 23,-98 32,-117 42,-125 55,-140 67,-168 72,-156 70,-136 73,-112 82,-92 77,-66 65,-52 57,-60 50,-66 45,-65 40,-72 25,-80 16,-84');
add('Южная Америка','natural','13,-72 12,-62 5,-51 -5,-35 -15,-39 -25,-47 -35,-54 -55,-68 -54,-75 -42,-75 -26,-72 -18,-76 -4,-81 8,-78');
add('Австралия','natural','-11,130 -12,137 -11,143 -16,145 -25,153 -34,151 -39,145 -35,137 -35,115 -22,113 -15,124');
add('Антарктида','natural','-60,-180 -61,-135 -65,-90 -62,-45 -61,0 -62,45 -65,90 -61,135 -60,179 -88,179 -88,-179');
add('Европа','natural','36,-10 43,-10 50,-9 57,-8 71,25 70,40 60,62 54,61 50,48 43,39 41,28 35,25 37,13');
add('Азия','natural','5,43 24,37 31,26 42,27 51,47 58,61 70,60 76,100 70,151 58,180 35,142 19,123 7,119 -9,117 5,96 8,77 22,55');
// 2. Oceans: indicative regional limits, non-exclusive, not hydrographic boundaries.
add('Тихий океан','natural','65,-175 56,-160 43,-129 31,-115 13,-94 -7,-82 -56,-76 -61,-105 -58,-150 -52,-179 5,-179 60,-179');
add('Атлантический океан','natural','70,-45 60,-56 48,-53 34,-78 11,-61 -4,-36 -27,-47 -53,-66 -61,-48 -60,-2 -36,17 -10,15 6,10 26,-17 37,-8 56,-12 67,-21');
add('Индийский океан','natural','22,39 25,60 18,74 7,77 -8,96 -18,113 -36,115 -56,115 -60,40 -35,18 -14,41 3,49');
add('Северный Ледовитый океан','natural','77,-180 71,-148 71,-100 75,-55 66,-28 67,10 70,45 73,90 73,135 69,180 89,180 89,-179');
// 3. Mountain systems, relief and deserts (general geographic envelopes).
add('Гималаи','natural','35,73 35,80 33,87 31,94 29,98 27,97 27,92 26,87 27,81 30,74');
add('Альпы','natural','46,6 48,7 48,11 47.7,14 46.3,16 44.7,13 44.9,10');
add('Кавказ','natural','41,39 43,39 44.5,44 44,51 41,50 40,45');
add('Уральские горы','natural','51,58 53,57 59,58 65,60 68,65 67,68 60,63 53,61');
add('Кордильеры','natural','15,-106 24,-113 35,-121 47,-129 57,-142 63,-153 69,-165 72,-151 63,-143 55,-131 47,-119 34,-108 21,-98');
add('Анды','natural','12,-73 4,-78 -8,-80 -20,-74 -34,-72 -44,-75 -55,-71 -55,-67 -44,-69 -34,-68 -19,-67 -7,-75 4,-74');
add('Скандинавские горы','natural','58,5 63,6 67,12 71,22 70,29 65,18 61,13');
add('Большой Водораздельный хребет','natural','-16,143 -19,150 -27,153 -38,149 -39,145 -30,148 -23,147');
add('Тибетское нагорье','natural','30,75 36,77 39,88 38,99 33,104 28,96 28,83');
add('Амазонская низменность','natural','4,-76 4,-58 0,-48 -9,-46 -13,-59 -11,-71');
add('Восточно-Европейская равнина','natural','46,20 55,19 68,30 68,50 57,61 47,51');
add('Западно-Сибирская равнина','natural','51,60 59,59 71,67 73,85 67,95 54,87');
add('Среднесибирское плоскогорье','natural','55,89 66,87 73,103 69,115 59,113');
add('Впадина Конго','natural','5,13 5,26 -4,31 -10,24 -7,15');
add('Пустыня Сахара','natural','16,-17 23,-17 32,-10 33,12 30,26 22,35 15,24 14,4');
add('Большая Песчаная пустыня','natural','-17,120 -17,130 -24,129 -27,121');
add('Оринокская низменность','natural','11,-72 12,-65 7,-59 4,-63 5,-70');
add('Аравийский полуостров','natural','30,35 31,40 25,56 15,52 12,43 17,41');
add('Белорусская гряда','natural','53.1,23.2 54.5,24 55,28.5 54.2,30.5 53.3,27');
add('Минская возвышенность','natural','53.6,26.2 54.5,26.7 54.6,28 53.7,28.1');
add('Новогрудская возвышенность','natural','53.3,25 54,25.1 54,26.5 53.4,26.6');
add('Ошмянская возвышенность','natural','54,25.3 54.9,25.5 54.8,27 54,26.9');
add('Полесская низменность','natural','51.4,23.4 52.7,23.3 53,29.4 51.5,31.2');
add('Центральноберезинская равнина','natural','52.8,27 54,27.1 54.2,30 53,30.5');
// 4. Inland and coastal waters. Approximate hulls make small areas visible at high zoom.
add('Средиземное море','natural','35,-6 40,0 42,8 44,12 43,18 42,28 36,36 31,33 30,19 34,9');
add('Черное море','natural','42,28 44,30 47,32 47,39 44,42 40.8,41 40.8,33');
add('Балтийское море','natural','54,10 58,11 60.5,18 65.5,22 65.5,25 61,27 56,21 53.8,15');
add('Баренцево море','natural','70,16 75,12 81,15 83,55 79,63 69,53');
add('Красное море','natural','12.5,43 17,40 24,35 29,33 29,35 21,40 13,45');
add('Мексиканский залив','natural','19,-98 25,-99 30,-92 30,-84 23,-81 18,-87');
add('Бенгальский залив','natural','5,80 22,87 22,92 16,95 5,99');
add('Каспийское море-озеро','natural','36.5,50 41,47 45,47 47.4,51 46,54 41,54 37,54');
ellipse('Байкал','natural',53.55,108.1,3.1,1.8,-1.0);
ellipse('Виктория','natural',-1.05,33.0,1.5,1.8);
ellipse('Озеро Титикака','natural',-15.95,-69.3,.65,.40);
ellipse('Озеро Эйр-Норт','natural',-28.3,137.4,.85,.85);
ellipse('Верхнее','natural',47.6,-87.7,1.4,3.9);
ellipse('Мичиган','natural',44,-87,2.4,1.1);
ellipse('Гурон','natural',45,-82.5,1.7,2.3);
ellipse('Эри','natural',42.2,-81,0.6,2.7);
ellipse('Онтарио','natural',43.8,-77.8,.55,1.5);
ellipse('Великие озёра','natural',45.3,-84.0,4.4,9.5);
ellipse('Ладожское озеро','natural',60.85,31.5,.95,1.5);
ellipse('Женевское озеро','natural',46.45,6.6,.21,.58);
ellipse('Нарочь','natural',54.87,26.72,.058,.092);
ellipse('Освейское','natural',56.05,28.15,.085,.135);
ellipse('Червоное','natural',52.38,27.75,.085,.22);
ellipse('Браславские озёра','natural',55.65,27,.5,.7);
ellipse('Вилейское водохранилище','natural',54.5,26.9,.13,.15);
add('Беловежская пуща','natural','52.45,23.35 52.9,23.5 52.85,24.2 52.4,24.1');
ellipse('Браславские озёра (нацпарк)','natural',55.66,27.05,.38,.55);
ellipse('Припятский','natural',52.05,27.95,.33,.83);
ellipse('Нарочанский','natural',54.83,26.83,.50,.65);
// 5. Nine megaregions: schematic corridors along named urban centers.
corridor('Босваш (Приатлантический)','38.91,-77.04 39.29,-76.61 39.95,-75.16 40.71,-74.00 41.76,-72.68 42.36,-71.06',42);
corridor('Чипитс (Приозёрный)','41.88,-87.63 41.68,-86.25 41.65,-83.54 42.33,-83.05 41.50,-81.69 40.44,-79.99',65);
corridor('Сансан (Калифорнийский)','37.78,-122.42 36.97,-122.03 36.60,-121.89 34.42,-119.70 34.05,-118.24 33.75,-118.19 32.72,-117.16',52);
corridor('Голубой банан','51.51,-.12 50.85,4.35 51.23,4.40 51.45,6.76 50.93,6.95 50.11,8.68 48.58,7.75 47.55,7.59 47.37,8.54 45.46,9.19',90);
corridor('Рандстад','52.37,4.90 52.09,5.12 51.92,4.48 52.07,4.30 52.37,4.90',19);
corridor('Токайдо','35.68,139.69 35.45,139.64 35.18,136.90 35.01,135.77 34.69,135.50 34.68,135.18',44);
corridor('Дельта реки Янцзы','32.06,118.79 31.58,120.30 31.30,120.62 31.23,121.47 30.25,120.17 29.87,121.55',51);
corridor('Дельта Жемчужной реки (Гуандун)','23.13,113.26 23.02,113.12 23.05,113.75 22.54,114.06 22.32,114.17 22.28,113.57 22.20,113.54',46);
corridor('Сан-Рио','-22.91,-43.17 -23.00,-44.30 -23.18,-45.88 -23.55,-46.63 -22.91,-47.06',67);
// 6. Urban agglomerations in Grade 10–11: deliberately generalized local extents.
ellipse('Токио — Иокогама','urban',35.57,139.66,.48,.72);
ellipse('Дели','urban',28.61,77.21,.33,.42);
ellipse('Шанхай','urban',31.23,121.47,.34,.53);
ellipse('Дакка','urban',23.81,90.41,.25,.28);
ellipse('Сан-Паулу','urban',-23.55,-46.63,.45,.50);
ellipse('Мехико','urban',19.43,-99.13,.35,.40);
ellipse('Каир','urban',30.04,31.24,.35,.32);
ellipse('Пекин','urban',39.90,116.41,.39,.46);
ellipse('Мумбаи (Бомбей)','urban',19.08,72.88,.29,.30);
ellipse('Осака — Кобе — Киото','urban',34.72,135.49,.41,.72);
ellipse('Нью-Йорк','urban',40.71,-74.01,.38,.46);
ellipse('Карачи','urban',24.86,67.01,.31,.35);
ellipse('Чунцин','urban',29.56,106.55,.42,.48);
ellipse('Стамбул','urban',41.01,28.98,.29,.40);
ellipse('Киншаса','urban',-4.32,15.31,.28,.29);
ellipse('Москва','urban',55.75,37.62,.36,.58);
// America is a multipart world region; reuse North and South America outlines.
shapes['Америка']={name:'Америка',kind:'natural',quality:'schematic',
 rings:[...shapes['Северная Америка'].rings,...shapes['Южная Америка'].rings]};
// Alias names that represent the same geographical area across grades.
shapes['Токио']=shapes['Токио — Иокогама'];
const counts={natural:0,urban:0};
for(const [name,obj] of Object.entries(shapes)){if(name!=='Токио')counts[obj.kind]++;}
window.GLOBE_AREAS={
 shapes,
 get:(name)=>shapes[name]||null,
 entries:()=>Object.entries(shapes).filter(([name])=>name!=='Токио'),
 counts,
 credits:'Curated schematic classroom geometry. Countries: Natural Earth / local world-110m TopoJSON.',
 warning:'Illustrative regions. Boundaries are not measured, official or suitable for location decisions.'
};
})();
/* Regression checks for the globe catalogue and three-language names. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public/globus'),window={};
const context=vm.createContext({window});
for(const file of ['objects.js','translations.js','facts.js','country-facts.js','belarus-cities.js','belarus-regions.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const catalog=window.GLOBE_CATALOG,translations=window.GLOBE_TRANSLATIONS,facts=window.GLOBE_FACTS,countries=window.GLOBE_COUNTRIES,cities=window.GLOBE_BELARUS_CITIES,oblasts=window.GLOBE_BELARUS_REGIONS;
assert(facts&&facts.get,'Object reference descriptions must load');
assert(facts.get('Гималаи','en').includes('Himalayas'),'English Himalayas reference missing');
assert(facts.get('Минск','be').includes('Беларусь'),'Belarusian Minsk reference missing');
assert(catalog&&translations,'The globe catalogue and translations must load');
let count=0,names=new Set(),groups=0;
for(const grade of [6,7,8,9,10,11]){
 assert(Array.isArray(catalog[grade])&&catalog[grade].length,'Grade '+grade+' must have nomenclature');
 for(const [label,rows] of catalog[grade]){
  const [ru,be]=label.split('|');groups++;
  for(const lang of ['ru','be','en'])assert(translations.group(ru,be,lang).length,'Group translation '+lang+': '+ru);
  assert(translations.group(ru,be,'en')!==ru||/^(Австралия|Антарктида)$/.test(ru),'Missing English group name: '+ru);
  for(const row of rows.split(';')){
   const [name,lat,lon,type]=row.split('|');count++;names.add(name);
   assert(Number.isFinite(+lat)&&Number.isFinite(+lon),'Invalid coordinates for '+name);
   assert(+lat>=-90&&+lat<=90&&+lon>=-180&&+lon<=180,'Coordinates out of range for '+name);
   for(const lang of ['be','en']){
    assert(Object.hasOwn(translations.names[lang],name),'Missing '+lang+' translation: '+name);
    assert(translations.name(name,lang).length,'Empty '+lang+' name: '+name);
    assert(translations.type(type,lang).length,'Missing '+lang+' type: '+type);
   }
  }
 }
}
assert(names.size>=170,'Unexpected loss of names in catalogue');
assert.equal(translations.name('Тихий океан','en'),'Pacific Ocean');
assert.equal(translations.name('Минск','be'),'Мінск');
assert.equal(translations.name('Токио','en'),'Tokyo');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('id="factPanel"')&&html.includes('id="legendPanel"'),'Reference and legend panels must exist');
assert(html.includes('renderFact()')&&html.includes('id="factDescription"'),'Object card must render on selection');
assert(html.includes('facts.js'),'Fact descriptions need script import');
assert(html.includes('country-facts.js'),'Country profiles need script import');
assert(html.includes('belarus-cities.js')&&html.includes('belarus-regions.js'),'Belarus city and region layers must load');
assert(html.includes('const helpText={')&&html.includes('updateHelp()'),'RU/BE/EN user guidance required');
assert(html.includes('function mapFor(o)')&&html.includes('visibleMap()'),'Map-specific object separation required');
assert(!html.includes('data-area-layer')&&!html.includes('type="checkbox"'),'No manual contour layer toggles');
assert(html.includes('src="./vector-map.js"'),'Local dynamic vector basemap required');
assert(!html.includes('data-lang="ru"'),'Standalone globe language buttons must be removed');
assert(html.includes("localStorage.getItem('geo_site_lang')"),'Globe must inherit global homepage language');
assert(html.includes("grade===9?7:1"),'Grade 9 should keep Europe zoom rather than the whole world');
assert(html.includes('belarus-relief-9.png')&&html.includes('belarusOn')&&html.includes('belarusTexture'),'Separate Belarus physical DEM texture missing');
for(const term of ['relief-nasa-8192.jpg','hydrology-50m.json','HYDRO_RENDER.draw','ResizeObserver','function cancelTravel()','dataset.flight=','drawMarkerLabel','id="fullscreen"','globeLayout','geo-disclosure'])assert(html.includes(term),'Missing requested globe feature: '+term);
assert(!html.includes('thumb.wikimedia.org'),'Old blurred third-party live relief must be removed');
assert(html.includes("mapMode==='political'&&isWater(o)"),'Water markers must be visible on political globe');
assert(html.includes('new ResizeObserver(resize)'),'Globe canvas must resize with its parent');
const disclosure=fs.readFileSync(path.resolve(root,'../assets/disclosures.js'),'utf8');
assert(disclosure.includes('geo-disclosure-change'),'Shared disclosure control required');
assert(!html.includes('id="count"')&&!html.includes('class="counter"'),'Object and topic counters must be absent');
assert(!html.includes("$('count')")&&!html.includes('g.objects.length+'), 'No hidden count rendering');
assert(html.includes('const rows=country')&&html.includes('[d.territory,country.area]')&&html.includes('[d.structure,country.structure]'),'Country profiles must have five geography fields');
assert(html.includes(':[[d.type,chosen.type],[d.topic,group],[d.coordinate,coords]]'),'Non-country objects should keep their three metadata fields');
const expectedCountries=new Set();
for(const grade of [10,11])for(const [,rows] of catalog[grade])
 for(const item of rows.split(';')){
  const name=item.split('|')[0];
  if(['Россия','Канада','Китай','США','Бразилия','Индия','Индонезия','Пакистан','Бахрейн','Монголия','Катар','Папуа — Новая Гвинея','Саудовская Аравия','Германия','Япония','Сингапур','Сомали','Нигер','Бангладеш','Нигерия','Норвегия'].includes(name))expectedCountries.add(name);
 }
assert.equal(expectedCountries.size,21,'Country name set unexpectedly changed');
assert.deepEqual(Array.from(countries.names()).sort(),Array.from(expectedCountries).sort(),'Country metadata must exactly cover all 10–11 grade countries');
for(const name of countries.names())for(const language of ['ru','be','en']){
 const info=countries.get(name,language);
 for(const field of ['area','capital','population','government','structure','kind','note'])
  assert(info[field]&&String(info[field]).length>2,'Missing '+language+' '+field+' for '+name);
 assert(info.population.includes('2025'),'Population year must be explicit');
}
assert.equal(countries.get('Индия','ru').capital,'Нью-Дели');
assert.match(countries.get('Нигер','ru').government,/переходное военное/i);
assert.equal(countries.get('Германия','be').structure,'Федэрацыя');
assert.equal(countries.get('Канада','en').capital,'Ottawa');
assert.equal(countries.get('Дели','ru'),null,'A city must never be misclassified as a country');
assert(!html.includes('Границы на глобусе'),'Obsolete contour label should be removed from reference');
const gradeNineCities=new Set();
for(const [label,rows] of catalog[9])if(/города|центры/.test(label.toLowerCase()))
 for(const item of rows.split(';'))gradeNineCities.add(item.split('|')[0]);
assert.equal(gradeNineCities.size,14,'Expected fourteen Belarus city entries');
assert.deepEqual(cities.names().sort(),Array.from(gradeNineCities).sort(),'Every grade 9 city must have a city reference');
for(const name of cities.names())for(const lang of ['ru','be','en']){
 const info=cities.get(name,lang);
 assert(info.region&&info.population&&info.populationYear===2026,'Missing region/population/year '+name);
 assert(info.emblemUrl.includes('commons.wikimedia.org/wiki/Special:FilePath/'),'Real Wikimedia coat of arms required: '+name);
}
assert.equal(cities.get('Минск','ru').regionKey,'minsk-city','Minsk must be distinct from Minsk Oblast');
assert(cities.get('Бобруйск','ru').region.includes('Могилёв'));
assert(cities.get('Пинск','ru').region.includes('Брест'));
assert(cities.get('Орша','be').region.includes('Віцеб'));
assert.equal(Number(cities.get('Гомель','ru').population.replace(/\D/g,'')),499853);

const mapFn=html.match(/function mapFor\(o\)\{[\s\S]*?\n\}/);
assert(mapFn,'Physical/political classifier not found');
const mapFor=vm.runInNewContext('('+mapFn[0]+')');
const physicallyTyped=/^(Материк|Часть света|Океан|Горы|Горная система|Горная вершина|Вершина|Высшая точка|Низменность|Равнина|Плоскогорье|Нагорье|Море|Море-озеро|Залив|Пролив|Река|Приток|Озеро|Группа озёр|Впадина|Пустыня|Вулкан|Водопад|Остров|Мыс|Полуостров|Гряда|Возвышенность|Водохранилище|Национальный парк|Биосферный заповедник)/;
let physicalCount=0,politicalCount=0;
for(const grade of [6,7,8,9,10,11])for(const [,rows] of catalog[grade])
 for(const row of rows.split(';')){
  const [name,,,type]=row.split('|');
  const actual=mapFor({rawName:name,rawType:type});
  const expected=physicallyTyped.test(type)?'physical':'political';
  assert.equal(actual,expected,'Wrong globe mode for '+name+' ('+type+')');
  if(actual==='physical')physicalCount++;else politicalCount++;
 }
assert.equal(mapFor({rawName:'Гималаи',rawType:'Горная система'}),'physical');
assert.equal(mapFor({rawName:'Европа',rawType:'Часть света'}),'physical');
assert.equal(mapFor({rawName:'Минск',rawType:'Столица'}),'political');
assert.equal(mapFor({rawName:'Босваш (Приатлантический)',rawType:'Мегалополис · США'}),'political');
const boundData=JSON.parse(fs.readFileSync(path.join(root,'belarus-oblasts.json'),'utf8'));
assert.equal(oblasts.setData(boundData),7,'Six oblasts and Minsk city must be in bundled geometry');
assert.equal(oblasts.legend('ru').length,6,'Oblast key must show six distinct regions');
assert.equal(new Set(oblasts.legend('ru').map(x=>x.color)).size,6,'Each oblast needs its own color');
for(const region of boundData.regions)assert(region.rings.every(r=>r.length>=4),'Invalid boundary shape '+region.name);
assert.equal(oblasts.countryLabels.length,5,'Belarus must have five neighbors');
assert(html.includes('loadBelarusOblasts()'),'Administrative shapes loader must be called');
assert(html.includes('BELARUS_REGIONS.drawNeighbors'),'Neighbor country names must be painted');
console.log('Map partition validated:',physicalCount,'physical and',politicalCount,'political instances');
console.log('Globe tests passed:',count,'objects,',names.size,'unique names,',groups,'groups; RU/BE/EN coverage complete');
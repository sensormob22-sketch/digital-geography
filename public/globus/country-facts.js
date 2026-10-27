/* Country reference data for all sovereign states in the grade 10–11 catalogue.
 * Population: World Bank indicator SP.POP.TOTL, 2025 (rounded to 0.1 million).
 * https://data.worldbank.org/indicator/SP.POP.TOTL
 * Territory: approximate total area in km²; conventional reference figures,
 * not derived from the map's schematic outlines or selected anchor.
 * Government classifications: educational summaries, reviewed October 2026.
 * Niger is described by its current transitional rule, not as an elected republic.
 */
(function(){
'use strict';
const governments={
 presidential:['Президентская республика','Прэзідэнцкая рэспубліка','Presidential republic'],
 parliamentary:['Парламентская республика','Парламенцкая рэспубліка','Parliamentary republic'],
 semipresidential:['Президентско-парламентская республика','Прэзідэнцка-парламенцкая рэспубліка','Semi-presidential republic'],
 constitution:['Конституционная монархия','Канстытуцыйная манархія','Constitutional monarchy'],
 parliamentMonarchy:['Парламентская конституционная монархия','Парламенцкая канстытуцыйная манархія','Parliamentary constitutional monarchy'],
 absoluteMonarchy:['Абсолютная монархия','Абсалютная манархія','Absolute monarchy'],
 socialist:['Социалистическая республика (однопартийная система)','Сацыялістычная рэспубліка (аднапартыйная сістэма)','One-party socialist republic'],
 transition:['Переходное военное правление','Пераходнае ваеннае кіраванне','Military-led transitional government']
};
const structures={
 federal:['Федерация','Федэрацыя','Federation'],
 unitary:['Унитарное государство','Унітарная дзяржава','Unitary state']
};
/* RU catalogue name; area km²; WB 2025 population millions;
   capital RU, BE, EN; government key; administrative structure key. */
const rows=[
 ['Россия',17098246,143.5,'Москва','Масква','Moscow','semipresidential','federal'],
 ['Канада',9984670,41.7,'Оттава','Атава','Ottawa','parliamentMonarchy','federal'],
 ['Китай',9596961,1406.6,'Пекин','Пекін','Beijing','socialist','unitary'],
 ['США',9833517,341.8,'Вашингтон','Вашынгтон','Washington, D.C.','presidential','federal'],
 ['Бразилия',8515767,212.8,'Бразилиа','Бразіліа','Brasília','presidential','federal'],
 ['Индия',3287263,1463.9,'Нью-Дели','Нью-Дэлі','New Delhi','parliamentary','federal'],
 ['Индонезия',1904569,285.7,'Джакарта','Джакарта','Jakarta','presidential','unitary'],
 ['Пакистан',881913,255.2,'Исламабад','Ісламабад','Islamabad','parliamentary','federal'],
 ['Бахрейн',790,1.6,'Манама','Манама','Manama','constitution','unitary'],
 ['Монголия',1564116,3.6,'Улан-Батор','Улан-Батар','Ulaanbaatar','parliamentary','unitary'],
 ['Катар',11586,3.0,'Доха','Доха','Doha','absoluteMonarchy','unitary'],
 ['Папуа — Новая Гвинея',462840,10.8,'Порт-Морсби','Порт-Морсбі','Port Moresby','parliamentMonarchy','unitary'],
 ['Саудовская Аравия',2149690,37.0,'Эр-Рияд','Эр-Рыяд','Riyadh','absoluteMonarchy','unitary'],
 ['Германия',357588,83.5,'Берлин','Берлін','Berlin','parliamentary','federal'],
 ['Япония',377975,123.4,'Токио','Токіа','Tokyo','parliamentMonarchy','unitary'],
 ['Сингапур',744,6.1,'Сингапур','Сінгапур','Singapore','parliamentary','unitary'],
 ['Сомали',637657,19.7,'Могадишо','Магадыша','Mogadishu','parliamentary','federal'],
 ['Нигер',1267000,27.9,'Ниамей','Ніямей','Niamey','transition','unitary'],
 ['Бангладеш',148460,175.7,'Дакка','Дака','Dhaka','parliamentary','unitary'],
 ['Нигерия',923768,237.5,'Абуджа','Абуджа','Abuja','presidential','federal'],
 ['Норвегия',385207,5.6,'Осло','Осла','Oslo','parliamentMonarchy','unitary']
];
const languages={ru:0,be:1,en:2},lookup=Object.create(null);
for(const r of rows)lookup[r[0]]=r;
const populationUnits={ru:'млн чел. (2025)',be:'млн чал. (2025)',en:'million (2025)'};
const areaUnits={ru:'км²',be:'км²',en:'km²'};
const note={
 ru:'Площадь — справочная (округлённая для небольших стран); население — оценка за 2025 г., Всемирный банк / ООН. Государственный строй — учебное обобщение на октябрь 2026 г.',
 be:'Плошча — даведачная (акругленая для невялікіх краін); насельніцтва — ацэнка за 2025 г., Сусветны банк / ААН. Дзяржаўны лад — вучэбнае абагульненне на кастрычнік 2026 г.',
 en:'Area is approximate (rounded for small states); population is a 2025 World Bank / UN estimate. Political system is a teaching summary as of October 2026.'
};
const nation={ru:'Государство',be:'Дзяржава',en:'Country'};
function get(name,language){
 const r=lookup[name];if(!r)return null;
 const i=languages[language]??0,loc=language==='en'?'en-US':language==='be'?'be-BY':'ru-RU';
 const fArea=new Intl.NumberFormat(loc,{maximumFractionDigits:0}).format(r[1]);
 const fPop=new Intl.NumberFormat(loc,{minimumFractionDigits:1,maximumFractionDigits:1}).format(r[2]);
 return {area:fArea+' '+areaUnits[language]||'',capital:r[3+i],
  population:'≈ '+fPop+' '+populationUnits[language],
  government:governments[r[6]][i],structure:structures[r[7]][i],
  kind:nation[language]||nation.ru,note:note[language]||note.ru};
}
window.GLOBE_COUNTRIES={get,has:name=>Object.hasOwn(lookup,name),names:()=>Object.keys(lookup),source:'https://data.worldbank.org/indicator/SP.POP.TOTL'};
})();
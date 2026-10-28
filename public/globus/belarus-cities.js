/* Belarusian cities appearing in the grade-9 teaching catalogue.
 * City population as of 1 January 2026 (Belstat figures, published 27 Mar 2026):
 * https://nashaniva.com/ru/391394
 * Heraldry: Wikimedia Commons, SVG Coats of Arms of Belarus category.
 * City of Minsk is NOT administratively part of Minsk Oblast. */
(function(){
'use strict';
const regions={
 brest:['Брестская область','Брэсцкая вобласць','Brest Region'],
 vitebsk:['Витебская область','Віцебская вобласць','Vitebsk Region'],
 gomel:['Гомельская область','Гомельская вобласць','Gomel Region'],
 grodno:['Гродненская область','Гродзенская вобласць','Grodno Region'],
 mogilev:['Могилёвская область','Магілёўская вобласць','Mogilev Region'],
 minsk:['Минская область','Мінская вобласць','Minsk Region'],
 'minsk-city':['Город республиканского подчинения (окружён Минской областью, но не входит в неё)','Горад рэспубліканскага падпарадкавання (акружаны Мінскай вобласцю, але не ўваходзіць у яе)','City of republican subordination (surrounded by, but not part of, Minsk Region)']
};
const cities=[
 ['Минск','minsk-city',1995091,'Coat of arms of Minsk.svg'],
 ['Брест','brest',347138,'Coat of Arms of Brest, Belarus.svg'],
 ['Витебск','vitebsk',357899,'Coat of Arms of Viciebsk, Belarus.svg'],
 ['Гомель','gomel',499853,'Coat of Arms of Homiel, Belarus.svg'],
 ['Гродно','grodno',364902,'Coat of arms of Hrodna.svg'],
 ['Могилёв','mogilev',352891,'Coat of Arms of Mahiloŭ.svg'],
 ['Барановичи','brest',170039,'Coat of arms Baranavičy.svg'],
 ['Бобруйск','mogilev',204103,'Coat of Arms of Babruisk, Belarus.svg'],
 ['Борисов','minsk',133700,'Coat of Arms of Barysaŭ.svg'],
 ['Мозырь','gomel',104302,'Coat of Arms of Mazyr, Belarus.svg'],
 ['Орша','vitebsk',100422,'Coat of Arms of Vorsza, Belarus.svg'],
 ['Пинск','brest',123283,'Coat of Arms of Pinsk, Belarus.svg'],
 ['Полоцк','vitebsk',79105,'Coat of Arms of Połack, Belarus.svg'],
 ['Солигорск','minsk',96418,'Coat of Arms of Salihorsk, Belarus.svg']
];
const map=Object.create(null);
for(const row of cities)map[row[0]]=row;
function get(name,lang){
 const row=map[name];if(!row)return null;
 const i=lang==='be'?1:lang==='en'?2:0;
 const loc=lang==='be'?'be-BY':lang==='en'?'en-US':'ru-RU';
 return {region:regions[row[1]][i],regionKey:row[1],population:new Intl.NumberFormat(loc).format(row[2]),
  populationYear:2026,emblem:row[3],emblemUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(row[3])};
}
window.GLOBE_BELARUS_CITIES={get,names:()=>Object.keys(map),regions};
})();
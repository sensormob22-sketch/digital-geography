/* Grade 10–11 urban geography reference.
 * City lists identify MAIN centres, not all municipalities/districts of each
 * statistical agglomeration or loosely defined megalopolis.
 * Metro figures for the 15 study cities and Moscow are preserved verbatim
 * from the user's educational catalogue; no false "UN 2025" labelling.
 * Megalopolis populations always expose their year and geographic definition.
 */
(function(){'use strict';
const rows=[
 // Agglomerations: main constituent urban centres; population comes from
 // existing grade 11 catalog row, including ≈ sign and original decimal.
 ['Токио — Иокогама','metro','Токио, Иокогама, Кавасаки, Сайтама, Тиба','Токіа, Ёкагама, Кавасакі, Сайтама, Тыба','Tokyo, Yokohama, Kawasaki, Saitama, Chiba'],
 ['Дели','metro','Дели, Нью-Дели, Нойда, Гургаон, Газиабад, Фаридабад','Дэлі, Нью-Дэлі, Нойда, Гургаон, Газіябад, Фарыдабад','Delhi, New Delhi, Noida, Gurugram, Ghaziabad, Faridabad'],
 ['Шанхай','metro','Шанхай, Сучжоу, Куньшань, Цзясин','Шанхай, Сучжоу, Куньшань, Цзясін','Shanghai, Suzhou, Kunshan, Jiaxing'],
 ['Дакка','metro','Дакка, Газипур, Нараянгандж, Савар','Дака, Газіпур, Нараянгандж, Савар','Dhaka, Gazipur, Narayanganj, Savar'],
 ['Сан-Паулу','metro','Сан-Паулу, Гуарульюс, Озаску, Санту-Андре, Сан-Бернарду-ду-Кампу','Сан-Паўлу, Гуарульюс, Озаску, Санту-Андрэ, Сан-Бернарду-ду-Кампу','São Paulo, Guarulhos, Osasco, Santo André, São Bernardo do Campo'],
 ['Мехико','metro','Мехико, Экатепек, Несауалькойотль, Наукальпан','Мехіка, Экатэпек, Несауалькаётль, Наукальпан','Mexico City, Ecatepec, Nezahualcóyotl, Naucalpan'],
 ['Каир','metro','Каир, Гиза, Шубра-эль-Хейма, город 6 Октября','Каір, Гіза, Шубра-эль-Хейма, горад 6 Кастрычніка','Cairo, Giza, Shubra El Kheima, 6th of October City'],
 ['Пекин','metro','Пекин и близлежащие города Ланфан, Саньхэ (пригородная зона)','Пекін і бліжэйшыя гарады Ланфан, Саньхэ (прыгарадная зона)','Beijing and nearby Langfang, Sanhe (metro fringe)'],
 ['Мумбаи (Бомбей)','metro','Мумбаи, Тхане, Нави-Мумбаи, Кальян-Домбивли','Мумбаі, Тханэ, Наві-Мумбаі, Кальян-Дамбівлі','Mumbai, Thane, Navi Mumbai, Kalyan-Dombivli'],
 ['Осака — Кобе — Киото','metro','Осака, Кобе, Киото, Сакаи, Хигасиосака','Осака, Кобе, Кіёта, Сакай, Хігасіосака','Osaka, Kobe, Kyoto, Sakai, Higashiosaka'],
 ['Нью-Йорк','metro','Нью-Йорк, Ньюарк, Джерси-Сити, Йонкерс, Патерсон','Нью-Ёрк, Ньюарк, Джэрсі-Сіці, Ёнкерс, Патэрсан','New York, Newark, Jersey City, Yonkers, Paterson'],
 ['Карачи','metro','Карачи (основные городские районы: Коранги, Малир, Лиари, Оранги)','Карачы (асноўныя гарадскія раёны: Корангі, Малір, Ліяры, Арангі)','Karachi (principal urban districts: Korangi, Malir, Lyari, Orangi)'],
 ['Чунцин','metro','Чунцин (городские районы: Юйчжун, Цзянбэй, Юйбэй, Баньань)','Чунцін (гарадскія раёны: Юйчжун, Цзянбэй, Юйбэй, Баньань)','Chongqing (urban districts: Yuzhong, Jiangbei, Yubei, Banan)'],
 ['Стамбул','metro','Стамбул, Гебзе и пригородные муниципалитеты','Стамбул, Гебзэ і прыгарадныя муніцыпалітэты','Istanbul, Gebze and surrounding suburban municipalities'],
 ['Киншаса','metro','Киншаса (городские коммуны: Гомбе, Лимете, Кимбансеке, Нджили)','Кіншаса (гарадскія камуны: Гомбэ, Лімэтэ, Кімбансэкэ, Нджылі)','Kinshasa (urban communes: Gombe, Limete, Kimbanseke, Ndjili)'],
 ['Москва','metro','Москва, Химки, Мытищи, Красногорск, Балашиха','Масква, Хімкі, Мыцішчы, Краснагорск, Балашыха','Moscow, Khimki, Mytishchi, Krasnogorsk, Balashikha'],
 // Megalopolises: population, source reference year and actual spatial scope.
 ['Босваш (Приатлантический)','mega','Бостон, Нью-Йорк, Филадельфия, Балтимор, Вашингтон','Бостан, Нью-Ёрк, Філадэльфія, Балтымар, Вашынгтон','Boston, New York, Philadelphia, Baltimore, Washington',51.8,2010,'https://www.prb.org/resource/u-s-megalopolises-50-years-later/','historical'],
 ['Чипитс (Приозёрный)','mega','Чикаго, Детройт, Кливленд, Питтсбург','Чыкага, Дэтройт, Кліўленд, Пітсбург','Chicago, Detroit, Cleveland, Pittsburgh',17.7,2010,'https://www.prb.org/resource/u-s-megalopolises-50-years-later/','historical'],
 ['Сансан (Калифорнийский)','mega','Сан-Франциско, Лос-Анджелес, Сан-Диего','Сан-Францыска, Лос-Анджэлес, Сан-Дыега','San Francisco, Los Angeles, San Diego',26.7,2010,'https://www.prb.org/resource/u-s-megalopolises-50-years-later/','historical'],
 ['Голубой банан','mega','Лондон, Брюссель, Амстердам, Франкфурт-на-Майне, Милан','Лондан, Брусель, Амстэрдам, Франкфурт-на-Майне, Мілан','London, Brussels, Amsterdam, Frankfurt, Milan',100,2019,'https://www.evs.ee/en/StandardDownload/DownloadPreview?language=EnglishLanguage&productId=113666','informal'],
 ['Рандстад','mega','Амстердам, Роттердам, Гаага, Утрехт','Амстэрдам, Ротэрдам, Гаага, Утрэхт','Amsterdam, Rotterdam, The Hague, Utrecht',8.2,2019,'https://documents1.worldbank.org/curated/en/278861591018281649/pdf/International-Practices-of-Metropolitan-Governance-A-Compendium-of-Collaborative-Arrangements-in-Metropolitan-Areas.pdf','historical'],
 ['Токайдо','mega','Токио, Иокогама, Нагоя, Киото, Осака, Кобе','Токіа, Ёкагама, Нагоя, Кіёта, Осака, Кобе','Tokyo, Yokohama, Nagoya, Kyoto, Osaka, Kobe',67,2019,'https://www.evs.ee/en/StandardDownload/DownloadPreview?language=EnglishLanguage&productId=113666','informal'],
 ['Дельта реки Янцзы','mega','Шанхай, Нанкин, Ханчжоу, Сучжоу, Нинбо, Хэфэй','Шанхай, Нанкін, Ханчжоу, Сучжоу, Нінбо, Хэфэй','Shanghai, Nanjing, Hangzhou, Suzhou, Ningbo, Hefei',237.99,2024,'https://www.mdpi.com/2071-1050/17/24/11011','regional'],
 ['Дельта Жемчужной реки (Гуандун)','mega','Гуанчжоу, Шэньчжэнь, Фошань, Дунгуань, Чжухай, Гонконг, Макао','Гуанчжоу, Шэньчжэнь, Фошань, Дунгуань, Чжухай, Ганконг, Макаа','Guangzhou, Shenzhen, Foshan, Dongguan, Zhuhai, Hong Kong, Macao',88,2025,'https://www.bayarea.gov.hk/en/about/overview.html','greaterBay'],
 ['Сан-Рио','mega','Сан-Паулу, Рио-де-Жанейро, Кампинас','Сан-Паўлу, Рыа-дэ-Жанэйра, Кампінас','São Paulo, Rio de Janeiro, Campinas',37.8,2024,'https://agenciagov.ebc.com.br/noticias/202408/mais-da-metade-dos-brasileiros-vivem-em-apenas-387-dos-mais-de-5-mil-municipios-1','sumThree']
];
const indexed=new Map(rows.map(r=>[r[0],r]));
indexed.set('Токио',rows[0]); // grade 10 short alias
const text={
 ru:{people:'млн чел.',noYear:'год оценки не указан',metro:'Учебная оценка из номенклатуры 11 класса; не сопоставлять с обновлёнными рейтингами ООН.',historical:'Историческая оценка указанного года: современные границы/численность могут отличаться.',informal:'Ориентировочная оценка; общепринятой официальной границы мегалополиса нет.',regional:'Охват: весь регион дельты Янцзы (41 город), не только сплошная городская застройка.',greaterBay:'Охват: официальная территория Большого залива Гуандун–Гонконг–Макао, а не только непрерывная застройка дельты.',sumThree:'Сумма трёх крупнейших агломераций (Сан-Паулу, Рио, Кампинас), нижний ориентир, НЕ всё население коридора Сан-Рио.'},
 be:{people:'млн чал.',noYear:'год ацэнкі не пазначаны',metro:'Вучэбная ацэнка з наменклатуры 11 класа; не параўноўваць з абноўленымі рэйтынгамі ААН.',historical:'Гістарычная ацэнка пазначанага года; сучасныя межы і насельніцтва могуць адрознівацца.',informal:'Прыблізная ацэнка; адзінай афіцыйнай мяжы мегалопаліса няма.',regional:'Ахоп: увесь рэгіён дэльты Янцзы (41 горад), не толькі суцэльная гарадская забудова.',greaterBay:'Ахоп: афіцыйная тэрыторыя Вялікага заліва Гуандун–Ганконг–Макаа, а не толькі суцэльная забудова дэльты.',sumThree:'Сума трох буйных агламерацый (Сан-Паўлу, Рыа, Кампінас), ніжні арыенцір, НЕ ўсё насельніцтва Сан-Рыа.'},
 en:{people:'million people',noYear:'estimate year unspecified',metro:'Teaching estimate from the grade 11 catalogue; not comparable with updated UN rankings.',historical:'Historical figure for the stated year; current population and boundaries may differ.',informal:'Indicative estimate; this megalopolis has no single official boundary.',regional:'Scope: the full 41-city Yangtze River Delta region, not just contiguous urban fabric.',greaterBay:'Scope: the official Guangdong–Hong Kong–Macao Greater Bay Area, not only the contiguous delta.',sumThree:'Sum of three major metros (São Paulo, Rio, Campinas), a lower-bound indicator, NOT the full San-Rio corridor.'}
};
function get(name,lang,rawType=''){
 const r=indexed.get(name);if(!r)return null;
 lang=['ru','be','en'].includes(lang)?lang:'ru';
 const i=lang==='ru'?2:lang==='be'?3:4,t=text[lang];
 if(r[1]==='metro'){
  const match=(String(rawType).match(/≈\s*(\d+(?:[.,]\d+)?)\s*млн/i));
  // The same object may appear in grade 10 or in a grade 11 environment
  // group without its classroom population string: retrieve the grade 11 row.
  const table=window.GLOBE_CATALOG?.[11]||[];
  const row=table.flatMap(v=>v[1].split(';')).map(v=>v.split('|')).find(v=>v[0]===r[0]);
  const n=match?.[1]||row?.[3]?.match(/≈\s*(\d+(?:[.,]\d+)?)\s*млн/i)?.[1];
  if(!n)return null;
  return {population:'≈ '+n+' '+t.people,centers:r[i],note:t.metro,kind:'metro',source:'Educational grade 11 catalogue',year:null};
 }
 const value=new Intl.NumberFormat(lang==='be'?'be-BY':lang==='en'?'en-US':'ru-RU',{maximumFractionDigits:2}).format(r[5]);
 const prefix=r[8]==='greaterBay'?(lang==='ru'?'более ':lang==='be'?'больш за ':'over '):'≈ ';
 return {population:prefix+value+' '+t.people+(r[6]?' ('+r[6]+')':''),
  centers:r[i],kind:'mega',year:r[6],source:r[7],note:t[r[8]]};
}
window.GLOBE_URBAN_FACTS={get,names:()=>rows.map(r=>r[0]),sources:rows.filter(r=>r[1]==='mega').map(r=>r[7])};
})();
/* Short, classroom-oriented descriptions. Object keys match the original RU catalogue.
   We do not infer object boundaries or numerical facts from its reference point. */
(function(){
'use strict';
const rows=[
['Гималаи','Гималаи — горная система в Южной Азии. Здесь находится высочайшая вершина Земли — Джомолунгма.','Гімалаі — горная сістэма ў Паўднёвай Азіі. Тут знаходзіцца найвышэйшая вяршыня Зямлі — Джамалунгма.','The Himalayas are a mountain system in South Asia and contain Earth’s highest peak, Mount Everest.'],
['Джомолунгма (Эверест)','Высочайшая вершина Земли, расположенная в Гималаях на границе Непала и Китая.','Найвышэйшая вяршыня Зямлі, размешчаная ў Гімалаях на мяжы Непала і Кітая.','Earth’s highest summit, in the Himalayas on the Nepal–China border.'],
['Альпы','Горная система Центральной и Южной Европы. Альпы влияют на климат, речные бассейны и транспортные пути региона.','Горная сістэма Цэнтральнай і Паўднёвай Еўропы, якая ўплывае на клімат, рэкі і транспарт рэгіёна.','A mountain range in central and southern Europe that influences regional climate, rivers and transport.'],
['Анды','Крупная горная система вдоль западного побережья Южной Америки.','Буйная горная сістэма ўздоўж заходняга ўзбярэжжа Паўднёвай Амерыкі.','A major mountain chain along the western edge of South America.'],
['Тихий океан','Крупнейший океан Земли. Омывает берега Азии, Австралии и обеих Америк.','Найбуйнейшы акіян Зямлі. Абмывае берагі Азіі, Аўстраліі і абедзвюх Амерык.','Earth’s largest ocean, bordering Asia, Australia, and North and South America.'],
['Атлантический океан','Океан между Америками на западе и Европой с Африкой на востоке.','Акіян паміж Амерыкамі на захадзе і Еўропай з Афрыкай на ўсходзе.','An ocean between the Americas to the west and Europe and Africa to the east.'],
['Евразия','Крупнейший материк, объединяющий Европу и Азию.','Найбуйнейшы мацярык, які аб’ядноўвае Еўропу і Азію.','The largest continental landmass, comprising Europe and Asia.'],
['Байкал','Глубокое пресноводное озеро в Южной Сибири, известное исключительной глубиной и своеобразной экосистемой.','Глыбокае прэснаводнае возера ў Паўднёвай Сібіры, вядомае выключнай глыбінёй і своеасаблівай экасістэмай.','A deep freshwater lake in southern Siberia, known for its exceptional depth and unique ecosystem.'],
['Нил','Одна из крупнейших рек Африки. Течёт преимущественно на север и впадает в Средиземное море.','Адна з найбуйнейшых рэк Афрыкі. Цячэ пераважна на поўнач і ўпадае ў Міжземнае мора.','One of Africa’s major rivers, flowing generally northward into the Mediterranean Sea.'],
['Амазонка','Крупная река Южной Америки, протекающая через влажные экваториальные леса и впадающая в Атлантический океан.','Буйная рака Паўднёвай Амерыкі, якая працякае праз вільготныя экватарыяльныя лясы і ўпадае ў Атлантычны акіян.','A major South American river flowing through tropical rainforest into the Atlantic Ocean.'],
['Нарочь','Крупнейшее озеро Беларуси, расположенное в северо-западной части страны.','Найбуйнейшае возера Беларусі, размешчанае на паўночным захадзе краіны.','Belarus’s largest lake, located in the northwestern part of the country.'],
['Минск','Столица Республики Беларусь и крупнейший город страны.','Сталіца Рэспублікі Беларусь і найбуйнейшы горад краіны.','The capital and largest city of the Republic of Belarus.'],
['Брест','Областной центр на юго-западе Беларуси, недалеко от границы с Польшей.','Абласны цэнтр на паўднёвым захадзе Беларусі, недалёка ад мяжы з Польшчай.','A regional capital in southwestern Belarus near the Polish border.'],
['Гомель','Областной центр на юго-востоке Беларуси, расположенный на реке Сож.','Абласны цэнтр на паўднёвым усходзе Беларусі, размешчаны на рацэ Сож.','A regional capital in southeastern Belarus on the Sozh River.'],
['Россия','Государство, занимающее обширные территории в Восточной Европе и Северной Азии.','Дзяржава, якая займае вялікія тэрыторыі ва Усходняй Еўропе і Паўночнай Азіі.','A country stretching across eastern Europe and northern Asia.'],
['Белорусская гряда','Цепь возвышенностей в центральной части Беларуси.','Паласа ўзвышшаў у цэнтральнай частцы Беларусі.','A chain of uplands across central Belarus.'],
['Босваш (Приатлантический)','Протяжённая урбанизированная зона северо-востока США между Бостоном и Вашингтоном. Её границы условны.','Працяглая ўрбанізаваная зона паўночнага ўсходу ЗША паміж Бостанам і Вашынгтонам. Яе межы ўмоўныя.','An extended urban corridor in the northeastern USA between Boston and Washington. Its boundaries are approximate.'],
['Голубой банан','Условно выделяемый пояс крупных городов и экономических центров Западной Европы.','Умоўна вылучаны пояс буйных гарадоў і эканамічных цэнтраў Заходняй Еўропы.','An approximate belt of large cities and economic centers in western Europe.'],
['Рандстад','Полицентричная городская агломерация в западной части Нидерландов.','Паліцэнтрычная гарадская агламерацыя на захадзе Нідэрландаў.','A polycentric urban region in the western Netherlands.'],
['Токайдо','Урбанизированный и транспортно-промышленный коридор Японии вдоль тихоокеанской стороны острова Хонсю.','Урбанізаваны і транспартна-прамысловы калідор Японіі ўздоўж ціхаакіянскага боку вострава Хансю.','An urban, transport and industrial corridor along the Pacific side of Japan’s Honshu Island.'],
['Дельта реки Янцзы','Один из важнейших городских и промышленных регионов восточного Китая вокруг устья Янцзы.','Адзін з найважнейшых гарадскіх і прамысловых рэгіёнаў усходняга Кітая вакол вусця Янцзы.','A major urban and industrial region of eastern China surrounding the Yangtze estuary.'],
['Дельта Жемчужной реки (Гуандун)','Крупный городской и промышленный регион южного Китая вокруг устья Жемчужной реки.','Буйны гарадскі і прамысловы рэгіён паўднёвага Кітая вакол вусця Жамчужнай ракі.','A major urban and manufacturing region around the Pearl River estuary in southern China.']
];
const texts={ru:Object.create(null),be:Object.create(null),en:Object.create(null)};
for(const [key,ru,be,en] of rows){texts.ru[key]=ru;texts.be[key]=be;texts.en[key]=en;}
window.GLOBE_FACTS={
 get:(key,language)=>texts[language]?.[key]||'',
 has:(key)=>Boolean(texts.ru[key])
};
})();
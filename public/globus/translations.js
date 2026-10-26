/* Цифровая география. Имена географических объектов RU/BE/EN.
   Ключ — исходное русское наименование; координаты и списки хранятся отдельно. */
(function(){
'use strict';
const source=`
Евразия|Еўразія|Eurasia
Африка|Афрыка|Africa
Северная Америка|Паўночная Амерыка|North America
Южная Америка|Паўднёвая Амерыка|South America
Антарктида|Антарктыда|Antarctica
Австралия|Аўстралія|Australia
Европа|Еўропа|Europe
Азия|Азія|Asia
Америка|Амерыка|America
Тихий океан|Ціхі акіян|Pacific Ocean
Атлантический океан|Атлантычны акіян|Atlantic Ocean
Индийский океан|Індыйскі акіян|Indian Ocean
Северный Ледовитый океан|Паўночны Ледавіты акіян|Arctic Ocean
Альпы|Альпы|Alps
Кавказ|Каўказ|Caucasus Mountains
Уральские горы|Уральскія горы|Ural Mountains
Гималаи|Гімалаі|Himalayas
Джомолунгма (Эверест)|Джамалунгма (Эверэст)|Mount Everest (Chomolungma)
Кордильеры|Кардыльеры|Cordillera
Анды|Анды|Andes
Амазонская низменность|Амазонская нізіна|Amazon Basin
Восточно-Европейская равнина|Усходне-Еўрапейская раўніна|East European Plain
Западно-Сибирская равнина|Заходне-Сібірская раўніна|West Siberian Plain
Среднесибирское плоскогорье|Сярэднесібірскае пласкагор’е|Central Siberian Plateau
Средиземное море|Міжземнае мора|Mediterranean Sea
Черное море|Чорнае мора|Black Sea
Балтийское море|Балтыйскае мора|Baltic Sea
Баренцево море|Баранцава мора|Barents Sea
Красное море|Чырвонае мора|Red Sea
Мексиканский залив|Мексіканскі заліў|Gulf of Mexico
Бенгальский залив|Бенгальскі заліў|Bay of Bengal
Гибралтарский пролив|Гібралтарскі праліў|Strait of Gibraltar
Магелланов пролив|Магеланаў праліў|Strait of Magellan
Берингов пролив|Берынгаў праліў|Bering Strait
Нил|Ніл|Nile
Амазонка|Амазонка|Amazon River
Миссисипи|Місісіпі|Mississippi River
Волга|Волга|Volga River
Енисей|Енісей|Yenisei River
Байкал|Байкал|Lake Baikal
Каспийское море-озеро|Каспійскае мора-возера|Caspian Sea
Виктория|Вікторыя|Lake Victoria
Впадина Конго|Упадзіна Конга|Congo Basin
Пустыня Сахара|Пустыня Сахара|Sahara Desert
Килиманджаро|Кіліманджара|Mount Kilimanjaro
Река Замбези|Рака Замбезі|Zambezi River
Водопад Виктория|Вадаспад Вікторыя|Victoria Falls
Остров Мадагаскар|Востраў Мадагаскар|Madagascar Island
Мыс Альмади|Мыс Альмадзі|Cape Almadies
Мыс Игольный|Ігольны мыс|Cape Agulhas
Мыс Рас-Хафун|Мыс Рас-Хафун|Cape Hafun
Мыс Зелёный|Зялёны мыс|Cap-Vert
Большой Водораздельный хребет|Вялікі Водападзельны хрыбет|Great Dividing Range
Река Муррей|Рака Мурэй|Murray River
Озеро Эйр-Норт|Возера Эйр-Норт|Lake Eyre North
Большая Песчаная пустыня|Вялікая Пясчаная пустыня|Great Sandy Desert
Вулкан Эребус|Вулкан Эрэбус|Mount Erebus
Станция «Восток»|Станцыя «Усход»|Vostok Station
Аконкагуа|Аканкагуа|Aconcagua
Оринокская низменность|Арынокская нізіна|Orinoco Lowlands
Река Парана|Рака Парана|Paraná River
Озеро Титикака|Возера Тытыкака|Lake Titicaca
Денали (Мак-Кинли)|Дэналі (Мак-Кінлі)|Denali (Mount McKinley)
Река Маккензи|Рака Макензі|Mackenzie River
Великие озёра|Вялікія азёры|Great Lakes
Верхнее|Верхняе|Lake Superior
Мичиган|Мічыган|Lake Michigan
Гурон|Гурон|Lake Huron
Эри|Эры|Lake Erie
Онтарио|Антарыа|Lake Ontario
Монблан|Манблан|Mont Blanc
Скандинавские горы|Скандынаўскія горы|Scandinavian Mountains
Тибетское нагорье|Тыбецкае нагор’е|Tibetan Plateau
Аравийский полуостров|Аравійскі паўвостраў|Arabian Peninsula
Янцзы|Янцзы|Yangtze River
Хуанхэ|Хуанхэ|Yellow River
Обь|Об|Ob River
Ладожское озеро|Ладажскае возера|Lake Ladoga
Женевское озеро|Жэнеўскае возера|Lake Geneva
Белорусская гряда|Беларуская града|Belarusian Ridge
Минская возвышенность|Мінскае ўзвышша|Minsk Upland
Новогрудская возвышенность|Навагрудскае ўзвышша|Navahrudak Upland
Ошмянская возвышенность|Ашмянскае ўзвышша|Ashmyany Upland
Гора Дзержинская|Гара Дзяржынская|Dzyarzhynskaya Hill
Полесская низменность|Палеская нізіна|Polesie Lowland
Центральноберезинская равнина|Цэнтральнабярэзінская раўніна|Central Berezina Plain
Днепр|Дняпро|Dnieper River
Припять|Прыпяць|Pripyat River
Сож|Сож|Sozh River
Березина|Бярэзіна|Berezina River
Западная Двина|Заходняя Дзвіна|Western Dvina River
Неман|Нёман|Neman River
Вилия|Вілія|Viliya River
Западный Буг|Заходні Буг|Western Bug River
Нарочь|Нарач|Lake Narach
Освейское|Асвейскае|Lake Asveya
Червоное|Чырвонае|Chyrvonaye Lake
Браславские озёра|Браслаўскія азёры|Braslaw Lakes
Вилейское водохранилище|Вілейскае вадасховішча|Vileyka Reservoir
Брест|Брэст|Brest
Витебск|Віцебск|Vitebsk
Гомель|Гомель|Gomel
Гродно|Гродна|Grodno
Минск|Мінск|Minsk
Могилёв|Магілёў|Mogilev
Барановичи|Баранавічы|Baranavichy
Бобруйск|Бабруйск|Babruysk
Борисов|Барысаў|Barysaw
Мозырь|Мазыр|Mazyr
Орша|Орша|Orsha
Пинск|Пінск|Pinsk
Полоцк|Полацк|Polatsk
Солигорск|Салігорск|Salihorsk
Березинский биосферный заповедник|Бярэзінскі біясферны запаведнік|Berezinsky Biosphere Reserve
Беловежская пуща|Белавежская пушча|Białowieża Forest
Браславские озёра (нацпарк)|Браслаўскія азёры (нацпарк)|Braslaw Lakes National Park
Припятский|Прыпяцкі|Pripyatsky National Park
Нарочанский|Нарачанскі|Narachansky National Park
Россия|Расія|Russia
Канада|Канада|Canada
Китай|Кітай|China
США|ЗША|United States
Бразилия|Бразілія|Brazil
Индия|Індыя|India
Индонезия|Інданезія|Indonesia
Пакистан|Пакістан|Pakistan
Бахрейн|Бахрэйн|Bahrain
Монголия|Манголія|Mongolia
Катар|Катар|Qatar
Папуа — Новая Гвинея|Папуа — Новая Гвінея|Papua New Guinea
Токио|Токіа|Tokyo
Дели|Дэлі|Delhi
Шанхай|Шанхай|Shanghai
Саудовская Аравия|Саудаўская Аравія|Saudi Arabia
Германия|Германія|Germany
Япония|Японія|Japan
Сингапур|Сінгапур|Singapore
Роттердам|Ратэрдам|Rotterdam
Дубай|Дубай|Dubai
Панамский канал|Панамскі канал|Panama Canal
Токио — Иокогама|Токіа — Ёкагама|Tokyo–Yokohama
Дакка|Дака|Dhaka
Сан-Паулу|Сан-Паўлу|São Paulo
Мехико|Мехіка|Mexico City
Каир|Каір|Cairo
Пекин|Пекін|Beijing
Мумбаи (Бомбей)|Мумбаі (Бамбей)|Mumbai (Bombay)
Осака — Кобе — Киото|Осака — Кобэ — Кіёта|Osaka–Kobe–Kyoto
Нью-Йорк|Нью-Ёрк|New York
Карачи|Карачы|Karachi
Чунцин|Чунцын|Chongqing
Стамбул|Стамбул|Istanbul
Киншаса|Кіншаса|Kinshasa
Москва|Масква|Moscow
Босваш (Приатлантический)|Босваш (Прыатлантычны)|BosWash (Northeast Corridor)
Чипитс (Приозёрный)|Чыпітс (Прыазёрны)|ChiPitts (Great Lakes)
Сансан (Калифорнийский)|Сансан (Каліфарнійскі)|SanSan (California)
Голубой банан|Блакітны банан|Blue Banana
Рандстад|Рандстад|Randstad
Токайдо|Токайда|Tōkaidō
Дельта реки Янцзы|Дэльта ракі Янцзы|Yangtze River Delta
Дельта Жемчужной реки (Гуандун)|Дэльта Жамчужнай ракі (Гуандун)|Pearl River Delta (Guangdong)
Сан-Рио|Сан-Рыу|San-Rio
Карьер Чукикамата|Кар’ер Чукікамата|Chuquicamata Mine
Аральское море|Аральскае мора|Aral Sea
Кузнецкий угольный бассейн|Кузнецкі вугальны басейн|Kuznetsk Coal Basin
Рурский промышленный район|Рурскі прамысловы раён|Ruhr Industrial Region
Арктика|Арктыка|Arctic
Сахель|Сахель|Sahel
Северный Китай|Паўночны Кітай|Northern China
Озеро Чад|Возера Чад|Lake Chad
Река Ганг|Рака Ганг|Ganges River
Большой Барьерный риф|Вялікі Бар’ерны рыф|Great Barrier Reef
Амазонские леса|Амазонскія лясы|Amazon Rainforest
Борнео|Барнэа|Borneo
Большое тихоокеанское мусорное пятно|Вялікая ціхаакіянская смеццевая пляма|Great Pacific Garbage Patch
Сомали|Самалі|Somalia
Нигер|Нігер|Niger
Бангладеш|Бангладэш|Bangladesh
Нигерия|Нігерыя|Nigeria
Норвегия|Нарвегія|Norway
`.trim();
const names={be:Object.create(null),en:Object.create(null)};
for(const row of source.split('\n')){const [ru,be,en]=row.split('|');if(ru&&be&&en){names.be[ru]=be;names.en[ru]=en;}}
const groupEn=`
Материки|Continents
Части света|World regions
Океаны|Oceans
Литосфера — горы и вершины|Lithosphere — mountains and peaks
Литосфера — равнины|Lithosphere — plains and plateaus
Гидросфера — моря|Hydrosphere — seas
Гидросфера — заливы|Hydrosphere — bays and gulfs
Гидросфера — проливы|Hydrosphere — straits
Гидросфера — реки|Hydrosphere — rivers
Гидросфера — озёра|Hydrosphere — lakes
Африка — рельеф и пустыни|Africa — landforms and deserts
Африка — воды и острова|Africa — waters and islands
Африка — мысы|Africa — capes
Австралия|Australia
Антарктида|Antarctica
Южная Америка|South America
Северная Америка — горы и реки|North America — mountains and rivers
Северная Америка — Великие озёра|North America — Great Lakes
Евразия — горы и нагорья|Eurasia — mountains and highlands
Евразия — полуостров|Eurasia — peninsula
Евразия — реки|Eurasia — rivers
Евразия — озёра|Eurasia — lakes
Рельеф — гряда и возвышенности|Relief — ridges and uplands
Рельеф — низменности и равнины|Relief — lowlands and plains
Реки Беларуси|Rivers of Belarus
Озёра и водохранилища|Lakes and reservoirs
Областные центры Беларуси|Regional capitals of Belarus
Другие города Беларуси|Other cities of Belarus
Особо охраняемые природные территории|Protected natural areas
Крупнейшие страны мира|Largest countries
Размещение и расселение населения|Population distribution and settlement
Мировое хозяйство — учебные ориентиры|World economy — examples
15 агломераций — учебная подборка|15 urban agglomerations — teaching list
Европейский ориентир — Москва|European example — Moscow
Мегалополисы — Северная Америка|Megalopolises — North America
Мегалополисы — Европа|Megalopolises — Europe
Мегалополисы — Азия|Megalopolises — Asia
Мегалополисы — Латинская Америка|Megalopolises — Latin America
Геоэкологические проблемы литосферы|Geoecological problems of the lithosphere
Атмосфера и климат|Atmosphere and climate
Воды и биосфера|Water and biosphere
Социально-экономические проблемы|Socioeconomic problems
`.trim();
const groupsEn=Object.fromEntries(groupEn.split('\n').map(s=>s.split('|')));
const types=`
Материк|Мацерык|Continent
Часть света|Частка свету|World region
Океан|Акіян|Ocean
Горы|Горы|Mountains
Горная система|Горная сістэма|Mountain system
Вершина|Вяршыня|Peak
Горная вершина|Горная вяршыня|Mountain peak
Низменность|Нізіна|Lowland
Равнина|Раўніна|Plain
Плоскогорье|Пласкагор’е|Plateau
Нагорье|Нагор’е|Highland
Море|Мора|Sea
Море-озеро|Мора-возера|Inland sea
Залив|Заліў|Bay
Пролив|Праліў|Strait
Река|Рака|River
Озеро|Возера|Lake
Группа озёр|Група азёр|Group of lakes
Впадина|Упадзіна|Basin
Пустыня|Пустыня|Desert
Вулкан|Вулкан|Volcano
Вулкан, вершина|Вулкан, вяршыня|Volcano, peak
Водопад|Вадаспад|Waterfall
Остров|Востраў|Island
Мыс|Мыс|Cape
Полуостров|Паўвостраў|Peninsula
Гряда|Града|Ridge
Возвышенность|Узвышша|Upland
Приток Днепра|Прыток Дняпра|Dnieper tributary
Приток Немана|Прыток Нёмана|Neman tributary
Водохранилище|Вадасховішча|Reservoir
Областной центр|Абласны цэнтр|Regional capital
Столица|Сталіца|Capital
Город|Горад|City
Биосферный заповедник|Біясферны запаведнік|Biosphere reserve
Национальный парк|Нацыянальны парк|National park
Антарктическая станция|Антарктычная станцыя|Antarctic research station
Площадь и население|Плошча і насельніцтва|Area and population
Площадь|Плошча|Area
Население|Насельніцтва|Population
Высокая плотность|Высокая шчыльнасць|High population density
Низкая плотность|Нізкая шчыльнасць|Low population density
Высокая урбанизация|Высокая урбанізацыя|High urbanization
Низкая урбанизация|Нізкая урбанізацыя|Low urbanization
Агломерация|Агламерацыя|Urban agglomeration
Производство|Вытворчасць|Manufacturing
Сельское хозяйство|Сельская гаспадарка|Agriculture
Нефть|Нафта|Oil
Промышленность|Прамысловасць|Industry
Порт и финансы|Порт і фінансы|Port and finance
Морской порт|Марскі порт|Seaport
Транспорт|Транспарт|Transport
Морской транспорт|Марскі транспарт|Marine transport
Добыча меди|Здабыча медзі|Copper mining
Деградация ландшафта|Дэградацыя ландшафту|Landscape degradation
Горнодобывающая деятельность|Горназдабыўная дзейнасць|Mining
Промышленный район|Прамысловы раён|Industrial region
Потепление|Пацяпленне|Warming
Опустынивание|Апустыньванне|Desertification
Загрязнение воздуха|Забруджванне паветра|Air pollution
Городская атмосфера|Гарадская атмасфера|Urban atmosphere
Озоновый слой|Азонавы слой|Ozone layer
Водная проблема|Водная праблема|Water crisis
Изменение площади|Змяненне плошчы|Area change
Загрязнение воды|Забруджванне вады|Water pollution
Состояние кораллов|Стан каралаў|Coral reef health
Обезлесение|Абязлесенне|Deforestation
Загрязнение океана|Забруджванне акіяна|Ocean pollution
Продовольственная безопасность|Харчовая бяспека|Food security
Демографические процессы|Дэмаграфічныя працэсы|Demographic trends
Уязвимость к наводнениям|Уразлівасць да паводак|Flood vulnerability
Старение населения|Старэнне насельніцтва|Population aging
Рост населения|Рост насельніцтва|Population growth
Энергетические ресурсы|Энергетычныя рэсурсы|Energy resources
`.trim();
const typesBe=Object.create(null),typesEn=Object.create(null);
for(const row of types.split('\n')){const [ru,be,en]=row.split('|');typesBe[ru]=be;typesEn[ru]=en;}
const replacements={
be:[['млн чел.','млн чал.'],['Мегалополис','Мегалаполіс'],['Северо-Восток','Паўночны Усход'],['Западная Европа','Заходняя Еўропа'],['Восточный Китай','Усходні Кітай'],['Южный Китай','Паўднёвы Кітай'],['Япония','Японія'],['Нидерланды','Нідэрланды'],['Бразилии','Бразіліі'],['Россия','Расія'],['Китай','Кітай'],['Индия','Індыя'],['США','ЗША'],['Европа','Еўропа'],['остров','востраў'],['Река','Рака'],['район','раён']],
en:[['млн чел.','million people'],['Мегалополис','Megalopolis'],['Северо-Восток','Northeastern'],['Великие озёра','Great Lakes'],['Западная Европа','Western Europe'],['Восточный Китай','Eastern China'],['Южный Китай','Southern China'],['Юго-Восток Бразилии','Southeastern Brazil'],['Япония','Japan'],['Нидерланды','Netherlands'],['Бразилия','Brazil'],['Россия','Russia'],['Китай','China'],['Индия','India'],['США','USA'],['Европа','Europe'],['остров Хонсю','Honshu Island']]
};
function translateDescription(s,lang){if(lang==='ru'||!s)return s;let result=s;
  for(const [a,b] of replacements[lang])result=result.split(a).join(b);
  if(lang==='en')result=result.replace(/(≈\d+),(\d+)/g,'$1.$2');
  return result;
}
window.GLOBE_TRANSLATIONS={
 name:(name,lang)=>lang==='ru'?name:(names[lang]?.[name]||name),
 group:(name,be,lang)=>lang==='ru'?name:lang==='be'?(be||name):(groupsEn[name]||name),
 type:(value,lang)=>lang==='ru'?value:(lang==='be'?typesBe[value]:typesEn[value])||translateDescription(value,lang),
 detail:translateDescription,
 names
};
})();
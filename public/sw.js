/* Платформа «Цифровая география». Service Worker: core shell + opt-in works. */
const VERSION='geo-core-2026-10-v26';
const CITY_ARMS='geo-belarus-city-heraldry-v1';
const CORE=`${VERSION}-shell`;
const WORKS='geo-offline-works-v6';
const BASE=new URL(self.registration.scope);
const coreFiles=['./','index.html','offline.html','manifest.webmanifest','assets/styles.css','assets/home.css','assets/disclosures.css','assets/disclosures.js','assets/app.js','assets/pwa.js','assets/favicon.svg','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','globus/index.html','globus/objects.js','globus/translations.js','globus/facts.js','globus/country-facts.js','globus/belarus-regions.js','globus/belarus-cities.js','globus/belarus-view.js','globus/urban-facts.js','globus/belarus-oblasts.json','globus/protected-belarus-osm.json','globus/areas.js','globus/area-renderer.js','globus/hydrology-renderer.js','globus/water-focus.js','globus/vector-map.js','globus/world-110m.json','globus/world-50m.json','globus/hydrology-50m.json','globus/relief-nasa-8192.jpg','globus/belarus-relief-9.png','globus/belarus-relief-9.json','globus/belarus-hydrology-10m.json'];
const inScope=(url)=>url.origin===self.location.origin && url.pathname.startsWith(BASE.pathname);
const absolute=path=>new URL(path,BASE).href;
const workURL=absolute('works/9/3/index.html');
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CORE).then(cache=>cache.addAll(coreFiles.map(absolute))));
  // No skipWaiting: never interrupt a pupil's unfinished work.
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith('geo-core-')&&n!==CORE).map(n=>caches.delete(n)));
    // Preserve pupils' opt-in offline download while upgrading its HTML.
    // Fetch a fresh mobile layout when online; fall back to the old cached
    // HTML rather than making the work disappear if the network drops.
    const priorWorks=['geo-offline-works-v5','geo-offline-works-v4','geo-offline-works-v3','geo-offline-works-v2','geo-offline-works-v1'];
    let previous=null;
    for(const name of priorWorks){
      if(!names.includes(name))continue;
      const old=await caches.open(name);
      previous=await old.match(workURL);
      if(previous)break;
    }
    if(previous){
      let replacement=previous;
      try{
        const fresh=await fetch(workURL,{cache:'reload'});
        if(fresh.ok)replacement=fresh;
      }catch(e){ /* Keep the downloaded work for offline access. */ }
      await (await caches.open(WORKS)).put(workURL,replacement.clone());
    }
    await Promise.all(priorWorks.filter(name=>names.includes(name)).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  // Public Wikimedia city-coat assets are fetched on first use and kept for
  // future offline visits. A failed remote request never blocks the site.
  const assetUrl=new URL(request.url);
  if(request.destination==='image'&&assetUrl.origin==='https://commons.wikimedia.org'&&
     assetUrl.pathname.startsWith('/wiki/Special:FilePath/')){
    event.respondWith((async()=>{
      const cache=await caches.open(CITY_ARMS);
      const stored=await cache.match(request);
      if(stored)return stored;
      try{
        const response=await fetch(request);
        if(response.ok||response.type==='opaque')await cache.put(request,response.clone());
        return response;
      }catch(error){return Response.error()}
    })());
    return;
  }
  if(!inScope(assetUrl))return;
  const uri=new URL(request.url);
  const isWork=uri.pathname===new URL(workURL).pathname || uri.pathname===new URL(absolute('works/9/3/')).pathname;
  if(isWork){
    event.respondWith((async()=>{
      const cache=await caches.open(WORKS);
      const hit=await cache.match(workURL);
      if(hit)return hit;
      try{return await fetch(request)}catch{return (await caches.match(absolute('offline.html'))) || Response.error()}
    })());
    return;
  }
  // The interactive globe and its self-hosted geometry must open without internet.
  // Serve those immutable PWA-core files from the active cache, including query-string
  // variants such as ?grade=9&lang=be, so an installed globe never falls back
  // to the site's generic home page when offline.
  if(uri.pathname.startsWith(new URL(absolute('globus/')).pathname)){
    event.respondWith((async()=>{
      const cached=await caches.match(request,{ignoreSearch:true});
      if(cached)return cached;
      try{return await fetch(request)}catch{return (await caches.match(absolute('offline.html'))) || Response.error()}
    })());
    return;
  }
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CORE);await cache.put(absolute('index.html'),response.clone());}return response;}
      catch{return (await caches.match(absolute('index.html'))) || (await caches.match(absolute('offline.html'))) || Response.error()}
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached)return cached;
    try{return await fetch(request)}catch{return Response.error()}
  })());
});
self.addEventListener('message',event=>{
  const msg=event.data||{}; const port=event.ports?.[0];
  const reply=data=>port?.postMessage(data);
  if(msg.type==='SKIP_WAITING'){self.skipWaiting();return;}
  event.waitUntil((async()=>{
    if(['CACHE_WORK','REMOVE_WORK','CHECK_WORK'].includes(msg.type)){
      const cache=await caches.open(WORKS);
      try{
        if(msg.type==='CHECK_WORK'){reply({ok:true,downloaded:!!(await cache.match(workURL))});return;}
        if(msg.type==='REMOVE_WORK'){await cache.delete(workURL);reply({ok:true,downloaded:false});return;}
        const response=await fetch(workURL,{cache:'reload'});
        if(!response.ok)throw Error(`HTTP ${response.status}`);
        await cache.put(workURL,response.clone());
        reply({ok:true,downloaded:true});return;
      }catch(err){reply({ok:false,error:String(err)});return;}
    }
    reply({ok:false,error:'Unknown request'});
  })());
});
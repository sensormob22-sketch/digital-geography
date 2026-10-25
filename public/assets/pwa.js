/* Independent PWA controller. No page reload or surprise service worker updates. */
(()=>{'use strict';
const TRANSLATIONS={
 ru:{install:'Установить',saved:'✓ Сохранено для офлайна',notSaved:'Пока доступно только онлайн',busy:'Загрузка офлайн-копии…',failed:'Не удалось скачать работу. Проверьте соединение.',removed:'Офлайн-копия удалена',unsupported:'Офлайн-режим работает после публикации сайта по HTTPS (или на localhost).',installHint:'Установка зависит от браузера. В его меню выберите «Установить приложение» или «Добавить на главный экран».',update:'Доступна новая версия сайта',updateBtn:'Обновить, когда закончите работу',
 },
 be:{install:'Усталяваць',saved:'✓ Захавана для афлайну',notSaved:'Пакуль даступна толькі анлайн',busy:'Загрузка афлайн-копіі…',failed:'Не ўдалося спампаваць работу. Праверце злучэнне.',removed:'Афлайн-копія выдалена',unsupported:'Афлайн-рэжым працуе пасля размяшчэння сайта праз HTTPS (або на localhost).',installHint:'Усталяванне залежыць ад браўзера. Выберыце «Усталяваць праграму» або «Дадаць на галоўны экран».',update:'Даступная новая версія сайта',updateBtn:'Абнавіць пасля завяршэння работы',
 },
 en:{install:'Install',saved:'✓ Saved for offline use',notSaved:'Online only so far',busy:'Saving offline copy…',failed:'Download failed. Check your internet connection.',removed:'Offline copy removed',unsupported:'Offline mode works after hosting on HTTPS (or on localhost).',installHint:'Installation depends on your browser. Find “Install app” or “Add to Home screen” in its menu.',update:'A site update is available',updateBtn:'Update after finishing your work'}
};
let registration=null,installPrompt=null,downloaded=false,updating=false;
const el=id=>document.getElementById(id);
const L=()=>TRANSLATIONS[window.GeographySite?.getState()?.lang||'ru']||TRANSLATIONS.ru;
const currentStatus=()=>el('offlineStatus');
const present=()=>{
  const status=currentStatus();if(!status)return;
  status.textContent=(registration? downloaded?L().saved:L().notSaved:L().unsupported);
  const remove=el('removeWorkButton');if(remove)remove.hidden=!downloaded;
  const save=el('cacheWorkButton');if(save){save.disabled=!registration||updating;save.hidden=downloaded;}
};
const message=(type)=>new Promise(async(resolve,reject)=>{
  if(!('serviceWorker' in navigator)){reject(Error('unsupported'));return;}
  const reg=registration||await navigator.serviceWorker.ready;
  const worker=reg.active;
  if(!worker){reject(Error('Service worker is not active'));return;}
  const channel=new MessageChannel();const timeout=setTimeout(()=>{channel.port1.close();reject(Error('Service worker timeout'));},18000);
  channel.port1.onmessage=e=>{clearTimeout(timeout);channel.port1.close();resolve(e.data)};
  worker.postMessage({type},[channel.port2]);
});
async function refresh(){if(registration)try{const reply=await message('CHECK_WORK');downloaded=Boolean(reply.downloaded);}catch(e){}present()}
async function perform(type){const status=currentStatus();if(!registration){if(status)status.textContent=L().unsupported;return;}
 updating=true;present();if(status)status.textContent=L().busy;
 try{const response=await message(type);if(!response.ok)throw Error(response.error);downloaded=Boolean(response.downloaded);if(status)status.textContent=type==='REMOVE_WORK'?L().removed:L().saved;}
 catch(e){if(status)status.textContent=L().failed;}
 finally{updating=false;present();}
}
const installButton=()=>el('installAppButton');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const b=installButton();if(b){b.hidden=false;b.querySelector('span').textContent=L().install}});
window.addEventListener('appinstalled',()=>{installPrompt=null;const b=installButton();if(b)b.hidden=true});
const install=async()=>{
 if(installPrompt){const event=installPrompt;installPrompt=null;await event.prompt();const b=installButton();if(b)b.hidden=true;return;}
 alert(L().installHint);
};
const showUpdate=()=>{const banner=el('updateBanner');if(!banner)return;el('updateText').textContent=L().update;el('updateAppButton').textContent=L().updateBtn;banner.hidden=false;};
const checkWaiting=()=>{if(registration?.waiting)showUpdate();};
const init=async()=>{
 if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol)){present();return;}
 try{
   registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
   await navigator.serviceWorker.ready;
   registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate()});});
   checkWaiting();await refresh();
 }catch(e){registration=null;present();}
};
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-offline-action="save"]'))await perform('CACHE_WORK');
 if(e.target.closest('[data-offline-action="remove"]'))await perform('REMOVE_WORK');
 if(e.target.closest('#installAppButton'))await install();
 if(e.target.closest('#updateAppButton')){if(registration?.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});}
 if(e.target.closest('#dismissUpdate'))el('updateBanner').hidden=true;
});
let hadController=Boolean(navigator.serviceWorker?.controller);
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(hadController)location.reload();else{hadController=true;refresh();}});
window.addEventListener('geography:render',()=>{present();if(registration)refresh();const b=installButton();if(b&&installPrompt)b.querySelector('span').textContent=L().install;});
window.addEventListener('online',refresh);
init();
window.GeographyPWA={refresh,download:()=>perform('CACHE_WORK'),remove:()=>perform('REMOVE_WORK'),getStatus:()=>({registered:!!registration,downloaded})};
})();
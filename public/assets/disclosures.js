/* Reusable disclosure controller for native <details class="geo-disclosure">.
   No custom click hijacking: preserves Space/Enter, Escape, screen readers,
   and browser-native accessibility. Expand/collapse broadcasts resize intent.
*/
(function(){
'use strict';
function init(root=document){
 if(!root?.querySelectorAll)return;
 for(const el of root.querySelectorAll('details.geo-disclosure')){
  if(el.dataset.geoReady==='true')continue;
  el.dataset.geoReady='true';
  function changed(){
   el.setAttribute('aria-expanded',String(el.open));
   el.dispatchEvent(new CustomEvent('geo-disclosure-change',{bubbles:true,detail:{open:el.open}}));
  }
  el.addEventListener('toggle',changed);
  changed();
 }
}
function watch(root=document){
 init(root);
 if(typeof MutationObserver!=='undefined'){
  new MutationObserver(()=>init(root)).observe(root===document?document.documentElement:root,{subtree:true,childList:true});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>watch());else watch();
window.GeoDisclosure={init,watch};
})();
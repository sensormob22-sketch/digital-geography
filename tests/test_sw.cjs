const fs=require('fs');const path=require('path');const vm=require('vm');
const root=path.join(__dirname,'..','public');
const base='https://example.edu/geography/';const listeners={};const stores=new Map();let offline=false;
const key=r=>typeof r==='string'?r:r.url;
class Cache {constructor(){this.m=new Map()}async match(url,opts={}){const direct=this.m.get(key(url));if(direct)return direct.clone();if(opts.ignoreSearch){const needle=new URL(key(url));for(const [u,r] of this.m){if(new URL(u).pathname===needle.pathname)return r.clone();}}return undefined}async put(url,r){this.m.set(key(url),r.clone())}async delete(url){return this.m.delete(key(url))}async addAll(urls){for(const url of urls){let response=await remote(url);if(!response.ok)throw Error('fail '+url);await this.put(url,response)}}async keys(){return [...this.m.keys()].map(url=>({url}))}}
const caches={open:async(name)=>{if(!stores.has(name))stores.set(name,new Cache());return stores.get(name)},keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),match:async (url,opts={})=>{for(const c of stores.values()){let r=await c.match(url,opts);if(r)return r}},};
async function remote(req){if(offline)throw Error('OFFLINE');const url=new URL(key(req));if(!url.pathname.startsWith('/geography/'))return new Response('404',{status:404});let rel=url.pathname.substring('/geography/'.length)||'index.html';let f=path.join(root,rel);if(rel==='index.html'&&!fs.existsSync(f))f=path.join(__dirname,'fixtures','index.html');if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return new Response('404',{status:404});return new Response(fs.readFileSync(f),{status:200});}
const self={registration:{scope:base},location:{origin:'https://example.edu'},clients:{claim:async()=>{}},skipWaiting:()=>{},addEventListener:(name,cb)=>listeners[name]=cb};
vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{self,caches,Response,Request,URL,console,fetch:remote});
async function event(name,extra={}){let job=Promise.resolve();let result;listeners[name]({waitUntil:p=>job=Promise.resolve(p),respondWith:p=>result=p,...extra});await job;return result?await result:null;}
async function message(type){let reply;await event('message',{data:{type},ports:[{postMessage(x){reply=x}}]});return reply}
(async()=>{await event('install');await event('activate');console.log('core cache', [...stores.keys()]);console.log('status before',await message('CHECK_WORK'));console.log('download',await message('CACHE_WORK'));console.log('status after',await message('CHECK_WORK'));offline=true;const workURL=base+'works/9/3/index.html';let answer=await event('fetch',{request:{method:'GET',url:workURL,mode:'navigate'}});console.log('offline climate title?',(await answer.text()).includes('Метеолаб'),answer.status);let home=await event('fetch',{request:{method:'GET',url:base,mode:'navigate'}});console.log('offline home menu?',(await home.text()).includes('Практические работы по географии'));const globe=await event('fetch',{request:{method:'GET',url:base+'globus/index.html?grade=9&lang=ru',mode:'navigate'}});
const globeHtml=await globe.text();if(!globeHtml.includes('Учебный глобус'))throw Error('Offline globe was not served from PWA cache');
const globeData=await event('fetch',{request:{method:'GET',url:base+'globus/world-110m.json',mode:'cors'}});
const topology=JSON.parse(await globeData.text());if(topology.type!=='Topology')throw Error('Offline globe geometry missing');
const objects=await event('fetch',{request:{method:'GET',url:base+'globus/objects.js',mode:'cors'}});
if(!(await objects.text()).includes('GLOBE_CATALOG'))throw Error('Offline nomenclature catalogue missing');
const translations=await event('fetch',{request:{method:'GET',url:base+'globus/translations.js',mode:'cors'}});
if(!(await translations.text()).includes('GLOBE_TRANSLATIONS'))throw Error('Offline three-language names missing');
console.log('offline globe, geometry, grade catalogue and translations: ok');
offline=false;console.log('remove',await message('REMOVE_WORK'));console.log('final',await message('CHECK_WORK'));})().catch(e=>{console.error(e);process.exit(1)});

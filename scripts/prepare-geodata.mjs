/* Embed public-domain Natural Earth 1:50m geometry from pinned world-atlas
   into the static Astro site. Build-time npm dependency only, never a runtime
   request to OpenFreeMap, jsDelivr or another tile server. */
import {copyFileSync,existsSync,mkdirSync,statSync} from 'node:fs';
import {join,dirname} from 'node:path';
const input=join(process.cwd(),'node_modules','world-atlas','countries-50m.json');
const output=join(process.cwd(),'public','globus','world-50m.json');
if(!existsSync(input))throw new Error('Missing world-atlas@2.0.2 countries-50m.json');
mkdirSync(dirname(output),{recursive:true});
copyFileSync(input,output);
console.log('Prepared self-hosted Natural Earth 1:50m geography: '+statSync(output).size+' bytes');
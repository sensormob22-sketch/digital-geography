import { defineConfig } from 'astro/config';
// Static output: works on Cloudflare Pages or GitHub Pages. Custom PWA SW is in public/sw.js.
export default defineConfig({output:'static'});

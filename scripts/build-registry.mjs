import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const item = {$schema:'https://ui.shadcn.com/schema/registry-item.json',name:'globetrotters',type:'registry:component',title:'Globetrotters',description:'A customizable, telemetry-free visitor globe for React.',author:'0xfreddy',dependencies:['cobe@^2.0.1'],files:[{path:'src/components/globetrotters.tsx',type:'registry:component',content:readFileSync('src/components/globetrotters.tsx','utf8')}]};
mkdirSync('public/r',{recursive:true});writeFileSync('public/r/globetrotters.json',JSON.stringify(item,null,2));
const tracked={...item,name:'tracked-globe',title:'Connected visitor globe',description:'A visitor globe connected to your chosen self-hosted or Globetrotters backend.',files:[...item.files,{path:'src/components/tracked-globe.tsx',type:'registry:component',content:readFileSync('src/components/tracked-globe.tsx','utf8')}]};
writeFileSync('public/r/tracked-globe.json',JSON.stringify(tracked,null,2));

await import("./package-setup.mjs");

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const item = {$schema:'https://ui.shadcn.com/schema/registry-item.json',name:'globetrotters',type:'registry:component',title:'Globetrotters',description:'A customizable, telemetry-free visitor globe for React.',author:'0xfreddy',dependencies:['cobe@^2.0.1'],files:[{path:'src/components/globetrotters.tsx',type:'registry:component',content:readFileSync('src/components/globetrotters.tsx','utf8')}]};
mkdirSync('public/r',{recursive:true});writeFileSync('public/r/globetrotters.json',JSON.stringify(item,null,2));

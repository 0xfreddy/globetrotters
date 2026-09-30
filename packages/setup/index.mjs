#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const site='https://globetrotters-production-dc49.up.railway.app';
const args=process.argv.slice(2);
if(args.includes('--help')){console.log('Usage: globetrotters-setup --site https://your-website.com [--workspace WORKSPACE_ID] [--no-wait]\nCreates a new Railway app and Redis database. Railway hosting charges apply. Requires Node 22+ and a Railway account.');process.exit(0);}
function option(name){const i=args.indexOf(name);return i>=0?args[i+1]:undefined;}
let website=option('--site');
if(!website){const terminal=createInterface({input:process.stdin,output:process.stdout});website=await terminal.question('Website URL (the frontend that will display your globe): ');terminal.close();}
let origin;
try{const url=new URL(website);if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new Error();origin=url.origin;}catch{console.error('Use an HTTPS origin without a path, or http://localhost:PORT.');process.exit(1);}
const workspace=option('--workspace'),directory=mkdtempSync(join(tmpdir(),'globetrotters-setup-'));
const probe=spawnSync('railway',['--version'],{encoding:'utf8'});
const command=probe.error?'npx':'railway',prefix=probe.error?['--yes','@railway/cli']:[];
function run(args,{json=false,interactive=false}={}){
 const result=spawnSync(command,[...prefix,...args],{cwd:directory,encoding:'utf8',stdio:interactive?'inherit':['inherit','pipe','pipe']});
 if(result.status!==0){throw new Error(`Railway ${args[0]} failed. Inspect the project in Railway before retrying. Setup directory: ${directory}`);}
 if(json){try{return JSON.parse(result.stdout);}catch{throw new Error('Railway returned an unexpected response. Check the project dashboard before retrying.');}}
 return result.stdout;
}
try{
 console.log('Deploying your tracker to Railway. Hosting charges apply to your account.');
 const auth=spawnSync(command,[...prefix,'whoami'],{cwd:directory,stdio:'ignore'});
 if(auth.status!==0)run(['login'],{interactive:true});
 const project=run(['init','--name','globetrotters-tracker',...(workspace?['--workspace',workspace]:[]),'--json'],{json:true});
 console.log(`Created project ${project.name||project.id}. Adding Redis…`);
 run(['add','--database','redis','--json'],{json:true});
 const vars={REDIS_URL:'${{Redis.REDIS_URL}}',TRACKING_SECRET:randomBytes(32).toString('hex'),APP_URL:'https://${{RAILWAY_PUBLIC_DOMAIN}}',GEOIP_PROVIDER:'railway',SELF_HOSTED_ORIGIN:origin,HOSTED_ENABLED:'false',PORT:'3000'};
 run(['add','--service','tracker','--repo','0xfreddy/globetrotters','--branch','main',...Object.entries(vars).flatMap(([key,value])=>['--variables',`${key}=${value}`]),'--json'],{json:true});
 const domain=run(['domain','--service','tracker','--port','3000','--json'],{json:true});
 const endpoint=new URL(domain.domain.startsWith('https://')?domain.domain:`https://${domain.domain}`).origin;
 const install=`npx shadcn@latest add "${site}/r/connected-globe.json?projectId=self&endpoint=${encodeURIComponent(endpoint)}"`;
 writeFileSync(join(directory,'NEXT-STEPS.txt'),`Backend: ${endpoint}\nWebsite: ${origin}\n\n${install}\n\nimport { VisitorGlobe } from "@/components/visitor-globe";\n<VisitorGlobe />\n`);
 console.log(`Backend: ${endpoint}\nWebsite allowed: ${origin}\nWaiting for the deployment health check…`);
 let ready=false;
 for(let i=0;i<(args.includes("--no-wait")?0:60);i++){try{const res=await fetch(`${endpoint}/api/health`,{signal:AbortSignal.timeout(5000)});if(res.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,3000));}
 console.log(ready?'Your backend is healthy.':'Deployment is still starting. Check the Railway dashboard before using the globe.');
 console.log(`\nRun this in your React app (with shadcn initialized):\n\n${install}\n\nThen add:\nimport { VisitorGlobe } from "@/components/visitor-globe";\n<VisitorGlobe />\n\nSaved next steps: ${join(directory,'NEXT-STEPS.txt')}\nProject: https://railway.com/project/${project.id}`);
 if(!ready&&!args.includes("--no-wait"))process.exitCode=2;
}catch(error){console.error(error.message);console.error('A partially created project may remain in your Railway account; check it before rerunning.');process.exitCode=1;}

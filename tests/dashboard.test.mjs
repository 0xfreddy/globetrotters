import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as core from '../src/lib/hosted-core.ts';
const id='gt_'+'a'.repeat(24);
function harness(file,userId='user_a'){
 const record={id,name:'Site',origin:'https://example.com',ownerId:'user_a',keyHash:'private',createdAt:1,disabled:false};
 const state={record,mutations:0,created:null};
 const db={smembers:async()=>[id],mget:async()=>[JSON.stringify(state.record)],get:async()=> '12',set:async(_,value)=>{state.mutations++;state.record=JSON.parse(value);return 'OK';}};
 const modules={
  '@clerk/nextjs/server':{auth:async()=>({userId})},
  '@/lib/auth-config':{clerkConfigured:()=>true},
  '@/lib/hosted-core':core,
  '@/lib/hosted-http':{json:(data,status=200)=>Response.json(data,{status}),sameOrigin:r=>r.headers.get('origin')==='https://app.test',smallBody:r=>r.json()},
  '@/lib/tracking':{redis:()=>db},
  '@/lib/hosted-store':{hostedEnabled:()=>true,indexKey:'index',projectKey:x=>x,dataPrefix:x=>x,getProject:async()=>state.record,projectStats:async()=>({online:1,countries:{US:1}}),allowRequest:async()=>true,deleteProject:async()=>{state.mutations++;state.record=null;},createProject:async(name,origin,ownerId)=>{state.created={...record,name,origin,ownerId};return{project:state.created,managementKey:'never-return'};}}
 };
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(!(name in modules))throw new Error(name);return modules[name];},process:{env:{}},Response});
 return {routes:exports,state};
}
const request=(body={},method='PATCH',origin='https://app.test')=>new Request('https://app.test/api/dashboard/projects/'+id,{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
const context={params:Promise.resolve({id})};
test('ownership rejects missing identities and legacy projects; public data excludes credentials',()=>{
 assert.equal(core.ownsProject(null,'a'),false);assert.equal(core.ownsProject({ownerId:'a'},null),false);assert.equal(core.ownsProject({},'a'),false);assert.equal(core.ownsProject({ownerId:'a'},'b'),false);assert.equal(core.ownsProject({ownerId:'a'},'a'),true);
 assert.deepEqual(core.publicProject({id:'x',name:'x',origin:'x',createdAt:1,disabled:false,ownerId:'secret',keyHash:'secret'}),{id:'x',name:'x',origin:'x',createdAt:1,disabled:false});
});
test('dashboard list and create enforce signed-in identity and never expose management keys',async()=>{
 const file='src/app/api/dashboard/projects/route.ts';
 for(const user of [null,'user_b']){const{routes}=harness(file,user);const r=await routes.GET();assert.equal(r.status,user?200:401);if(user)assert.deepEqual((await r.json()).projects,[]);}
 const{routes,state}=harness(file);const listed=await(await routes.GET()).json();assert.equal(listed.projects.length,1);assert.ok(!JSON.stringify(listed).includes('private'));assert.ok(!JSON.stringify(listed).includes('user_a'));
 assert.equal((await routes.POST(request({name:'New',origin:'https://new.test',consent:true,ownerId:'attacker'},'POST'))).status,201);assert.equal(state.created.ownerId,'user_a');
 assert.equal((await routes.POST(request({name:'New',origin:'https://new.test'},'POST'))).status,400);
 assert.equal((await routes.POST(request({},'POST','https://evil.test'))).status,403);
});
test('cross-account project mutation and forged origins never mutate storage',async()=>{
 const file='src/app/api/dashboard/projects/[id]/route.ts';
 for(const user of [null,'user_b']){const{routes,state}=harness(file,user);assert.equal((await routes.PATCH(request({disabled:true}),context)).status,404);assert.equal((await routes.DELETE(request(),context)).status,404);assert.equal(state.mutations,0);}
 const{routes,state}=harness(file);assert.equal((await routes.PATCH(request({disabled:true},'PATCH','https://evil.test'),context)).status,403);assert.equal(state.mutations,0);
 assert.equal((await routes.PATCH(request({origin:'https://evil.test/path'}),context)).status,400);
 assert.equal((await routes.PATCH(request({disabled:true,ownerId:'attacker',keyHash:'attacker'}),context)).status,200);assert.equal(state.record.ownerId,'user_a');assert.equal(state.record.keyHash,'private');assert.equal(state.record.disabled,true);
 assert.equal((await routes.DELETE(request(),context)).status,200);assert.equal(state.record,null);
});

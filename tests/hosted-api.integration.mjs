// Requires a built app and REDIS_URL. Uses an isolated namespace and loopback server.
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import Redis from 'ioredis';
const namespace='gt:integration:'+randomUUID(),base='http://127.0.0.1:4317',invite=randomBytes(32).toString('hex'),admin=randomBytes(32).toString('hex');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4317'],{env:{...process.env,APP_URL:base,TRACKING_NAMESPACE:namespace,HOSTED_ENABLED:'true',HOSTED_SIGNUP_CODE:invite,HOSTED_ADMIN_KEY:admin,HOSTED_MAX_PROJECTS:'3',HOSTED_REQUESTS_PER_MINUTE:'100',HOSTED_MONTHLY_REQUEST_LIMIT:'3',SELF_HOSTED_ORIGIN:'https://self.example.test',TRUSTED_COUNTRY_HEADER:'x-test-country',TRACKING_SECRET:randomBytes(32).toString('hex')},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
const db=new Redis(process.env.REDIS_URL,{maxRetriesPerRequest:1});
const request=(path,{origin=base,body,method='POST',key}={})=>fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
try{
 let ready=false;for(let i=0;i<40;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'test app did not start: '+output.slice(-1000));
 assert.equal((await request('/api/hosted/projects',{origin:'https://evil.example',body:{}})).status,403);
 assert.equal((await request('/api/hosted/projects',{body:{name:'test',origin:'https://a.example.test',inviteCode:'wrong'}})).status,401);
 const create=async(name,origin)=>{const r=await request('/api/hosted/projects',{body:{name,origin,inviteCode:invite}});assert.equal(r.status,201);return r.json();};
 const a=await create('Integration A','https://a.example.test'),b=await create('Integration B','https://b.example.test');
 const collect=(p,origin,id)=>request('/api/collect/'+p,{origin,body:{visitorId:id}});
 let pre=await request('/api/collect/'+a.project.id,{origin:a.project.origin,method:'OPTIONS'});assert.equal(pre.status,200);assert.equal(pre.headers.get('access-control-allow-origin'),a.project.origin);
 pre=await request('/api/collect/'+a.project.id,{origin:'https://evil.example',method:'OPTIONS'});assert.equal(pre.status,403);assert.equal(pre.headers.get('access-control-allow-origin'),null);
 const visitor=randomUUID();let r=await collect(a.project.id,a.project.origin,visitor);assert.equal(r.status,200);let data=await r.json();assert.equal(data.online,1);assert.equal(data.countries.unknown,1);
 r=await collect(a.project.id,a.project.origin,visitor);assert.equal((await r.json()).countries.unknown,1);
 assert.equal((await collect(b.project.id,a.project.origin,visitor)).status,403);
 r=await collect(b.project.id,b.project.origin,visitor);assert.equal((await r.json()).online,1);
 assert.equal((await request('/api/hosted/projects/'+a.project.id,{method:'PATCH',key:'wrong',body:{disabled:true}})).status,401);
 assert.equal((await request('/api/hosted/projects/'+a.project.id,{method:'PATCH',key:a.managementKey,body:{disabled:true}})).status,200);
 assert.equal((await collect(a.project.id,a.project.origin,visitor)).status,403);
 await request('/api/hosted/projects/'+a.project.id,{method:'PATCH',key:a.managementKey,body:{disabled:false}});
 assert.equal((await collect(a.project.id,a.project.origin,visitor)).status,200);
 assert.equal((await collect(a.project.id,a.project.origin,visitor)).status,429);
 r=await collect('self','https://self.example.test',randomUUID());assert.equal(r.status,200);
 assert.equal((await collect('self','https://other.example.test',visitor)).status,403);
 const listed=await (await request('/api/hosted/admin',{method:'GET',key:admin})).json();assert.equal(listed.projects.length,2);assert.ok(!JSON.stringify(listed).includes('keyHash'));
 const registry=await (await fetch(base+'/r/connected-globe.json?projectId='+b.project.id+'&endpoint='+encodeURIComponent('https://backend.example.test'))).json();assert.equal(registry.files.length,3);assert.ok(registry.files[2].content.includes(b.project.id));assert.ok(!JSON.stringify(registry).includes(b.managementKey));
 assert.equal((await request('/api/hosted/projects/'+a.project.id,{method:'DELETE',key:a.managementKey})).status,200);assert.equal((await collect(a.project.id,a.project.origin,visitor)).status,403);
 console.log('Hosted API integration passed: registration, CORS, tenant isolation, management authentication, pause/resume/delete, quotas, self-host mode, configured registry.');
}finally{
 child.kill('SIGTERM');await new Promise(r=>{if(child.exitCode!==null)return r();child.once('exit',r);setTimeout(r,3000).unref();});
 let cursor='0';do{const result=await db.scan(cursor,'MATCH',namespace+':*','COUNT',200);cursor=result[0];if(result[1].length)await db.del(...result[1]);}while(cursor!=='0');await db.quit();
}

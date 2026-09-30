// Run against an explicitly supplied test Redis connection, or inside Railway.
import Redis from 'ioredis';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {collectScript,createProjectScript} from '../src/lib/hosted-core.ts';
const db=new Redis(process.env.REDIS_URL,{maxRetriesPerRequest:1});
const prefix='gt:test:'+randomUUID(),keys=[];
function key(value){const k=prefix+':'+value;keys.push(k);return k;}
try {
 const index=key('projects'),p1=key('p1'),p2=key('p2');
 assert.equal(await db.eval(createProjectScript,2,index,p1,1,'one','{}'),1);
 assert.equal(await db.eval(createProjectScript,2,index,p2,1,'two','{}'),0,'project limit is atomic');
 const a=['rate','month','active','seen:a','day'].map(key),b=['b:rate','b:month','b:active','b:seen:a','b:day'].map(key);
 const now=Date.now();
 const ping=(k,time=now,visitor='visitor-a',minute=20,month=100)=>db.eval(collectScript,5,...k,minute,month,time,visitor,'GB');
 assert.equal(await ping(a),1);assert.equal(await ping(a,now+1000),0);
 assert.equal(await db.hget(a[4],'GB'),'1','duplicate visits are not counted');
 assert.equal(await ping(b),1);assert.equal(await db.hget(b[4],'GB'),'1','other project isolated');
 assert.equal(await ping(a,now+2000,'new',2),-1,'minute budget enforced before adding new visitors');
 assert.equal(await db.zcard(a[2]),1);
 assert.equal(await ping(b,now+11000,'visitor-a',20,1),-2,'monthly budget enforced');
 const c=['c:rate','c:month','c:active','c:seen:a','c:day'].map(key);await ping(c);
 c[3]=key('c:seen:b');await ping(c,now+80000,'visitor-b');
 assert.equal(await db.zcard(c[2]),1,'stale active visitor expires');
 assert.ok(await db.ttl(c[4])>2678300,'country bucket has bounded retention');
 console.log('Hosted Redis integration passed: project capacity, tenant isolation, deduplication, active expiry, rate limits, monthly budgets, retention.');
} finally {await db.del(...keys);await db.quit();}

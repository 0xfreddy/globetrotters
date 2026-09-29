import Redis from 'ioredis';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { heartbeatScript } from '../src/lib/tracking.ts';
const db=new Redis(process.env.REDIS_PUBLIC_URL||process.env.REDIS_URL,{maxRetriesPerRequest:1,connectTimeout:10000});
const prefix='globe:test:'+randomUUID();
const keys=[prefix+':active',prefix+':seen:a',prefix+':countries',prefix+':seen:b',prefix+':seen:c'];
const now=Date.now();
try {
 const ping=(time,id,seen)=>db.eval(heartbeatScript,3,keys[0],seen,keys[2],time,id,'GB');
 assert.equal(await ping(now,'a',keys[1]),1);
 assert.equal(await ping(now+1000,'a',keys[1]),0);
 assert.equal(await ping(now+11000,'a',keys[1]),1);
 assert.equal(await db.hget(keys[2],'GB'),'1','refreshes are deduplicated');
 await ping(now+12000,'b',keys[3]);
 assert.equal(await db.zcard(keys[0]),2);
 assert.equal(await db.hget(keys[2],'GB'),'2');
 await ping(now+90000,'c',keys[4]);
 assert.equal(await db.zcard(keys[0]),1,'stale visitors expire');
 assert.ok(await db.ttl(keys[1])>86000,'24h deduplication TTL');
 console.log('Redis integration passed: heartbeat throttling, 24h deduplication, country counts, and active expiry.');
} finally {await db.del(...keys);await db.quit();}

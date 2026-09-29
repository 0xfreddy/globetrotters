import Redis from "ioredis";
import geoip from "geoip-lite";
import countries from "world-countries";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const shared = globalThis as typeof globalThis & { globeRedis?: Redis };
export function redis() {
  if (!process.env.REDIS_URL) return null;
  if (!shared.globeRedis) shared.globeRedis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest:1, connectTimeout:3000, lazyConnect:true });
  return shared.globeRedis;
}
export function sign(id: string) {return createHmac("sha256",process.env.TRACKING_SECRET!).update(id).digest("hex");}
export function session(cookie?: string) {
  if(cookie){const [id,signature] = cookie.split(".");if(/^[a-f0-9-]{36}$/.test(id) && /^[a-f0-9]{64}$/.test(signature||"")){const expected = sign(id);if(timingSafeEqual(Buffer.from(expected),Buffer.from(signature)))return {id,value:cookie};}}
  const id = randomUUID();return {id,value:`${id}.${sign(id)}`};
}
// Configure only a header that your edge provider strips and supplies itself.
// Railway alone has no country header: unknown is preferable to fabricated locations.
export function country(headers: Headers) {
  const name=process.env.TRUSTED_COUNTRY_HEADER;
  const value=name?headers.get(name)?.toUpperCase():null;
  if(value && /^[A-Z]{2}$/.test(value) && countries.some(c=>c.cca2===value))return value;
  if(process.env.GEOIP_PROVIDER === "railway") {
    const ip = headers.get("x-real-ip");
    if(ip) return geoip.lookup(ip)?.country || "unknown";
  }
  return "unknown";
}
export const heartbeatScript = `
local now = tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 75000)
local previous = redis.call('ZSCORE', KEYS[1], ARGV[2])
if previous and now - tonumber(previous) < 10000 then return 0 end
redis.call('ZADD', KEYS[1], now, ARGV[2])
redis.call('EXPIRE', KEYS[1], 120)
if redis.call('SET', KEYS[2], '1', 'EX', 86400, 'NX') then
 redis.call('HINCRBY', KEYS[3], ARGV[3], 1)
end
return 1
`;
export async function stats() {
  const db=redis();if(!db)throw new Error("Tracking not configured");
  const now=Date.now();
  const results=await db.multi().zremrangebyscore("globe:active","-inf",now-75000).zcard("globe:active").hgetall("globe:countries").exec();
  if(!results || results.some(([error])=>error))throw new Error("Tracking unavailable");
  const totals=results[2][1] as Record<string,string>;
  const locations=Object.entries(totals).flatMap(([code,count])=>{
    const match=countries.find(c=>c.cca2===code);
    return match?[{location:match.latlng,count:Number(count),label:match.name.common}]:[];
  }).sort((a,b)=>b.count-a.count);
  return {online:Number(results[1][1]),countries:totals,locations,updatedAt:now};
}

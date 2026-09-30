import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type TrackingProject = { id:string; name:string; origin:string; keyHash:string; ownerId?:string; createdAt:number; disabled:boolean };
export function normalizeOrigin(input:unknown):string {
  if(typeof input!=="string" || input.length>512)throw new Error("Enter a valid website URL.");
  let url:URL;try{url=new URL(input);}catch{throw new Error("Include https:// in your website URL.");}
  const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if((url.protocol!=="https:" && !(local && url.protocol==="http:")) || url.username || url.password || url.pathname!=="/" || url.search || url.hash)throw new Error("Use an HTTPS website origin without a path, query, or password. HTTP is allowed only for localhost.");
  return url.origin;
}
export function hashKey(value:string){return createHash("sha256").update(value).digest("hex");}
export function matchesSecret(value:string,expected:string){return !!expected && timingSafeEqual(Buffer.from(hashKey(value)),Buffer.from(hashKey(expected)));}
export function validProjectId(value:string){return value==="self" || /^gt_[a-f0-9]{24}$/.test(value);}
export function visitorKey(project:string,id:string,secret:string){return createHmac("sha256",secret).update(`${project}:${id}`).digest("hex");}
export function positiveLimit(value:string|undefined,fallback:number){const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:fallback;}
export const createProjectScript=`
if redis.call('SCARD', KEYS[1]) >= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[2], ARGV[3])
redis.call('SADD', KEYS[1], ARGV[2])
return 1
`;
// Count all accepted-origin requests before allocating visitor keys. Both quotas
// and updates are atomic, so parallel requests cannot bypass the limits.
export const collectScript=`
local minute = redis.call('INCR', KEYS[1])
if minute == 1 then redis.call('EXPIRE', KEYS[1], 60) end
if minute > tonumber(ARGV[1]) then return -1 end
local month = redis.call('INCR', KEYS[2])
if month == 1 then redis.call('EXPIRE', KEYS[2], 2764800) end
if month > tonumber(ARGV[2]) then return -2 end
local now = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now-75000)
local previous = redis.call('ZSCORE', KEYS[3], ARGV[4])
if previous and now-tonumber(previous)<10000 then return 0 end
redis.call('ZADD', KEYS[3], now, ARGV[4])
redis.call('EXPIRE', KEYS[3], 120)
if redis.call('SET', KEYS[4], '1', 'EX', 86400, 'NX') then redis.call('HINCRBY', KEYS[5], ARGV[5], 1) end
redis.call('EXPIRE', KEYS[5], 2678400)
return 1
`;
export const rateScript=`local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],tonumber(ARGV[1])) end;return n`;

// A missing owner never grants account access to legacy capability-key projects.
export function ownsProject(project: TrackingProject | null, userId: string | null) {
 return !!userId && !!project?.ownerId && project.ownerId === userId;
}
export function publicProject(project: TrackingProject) {
 const {id,name,origin,createdAt,disabled}=project;
 return {id,name,origin,createdAt,disabled};
}

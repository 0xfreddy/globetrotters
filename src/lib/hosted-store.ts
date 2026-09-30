import { clerkConfigured } from "./auth-config";
import { randomBytes } from "node:crypto";
import countries from "world-countries";
import { redis } from "./tracking";
import { createProjectScript, hashKey, normalizeOrigin, positiveLimit, rateScript, type TrackingProject } from "./hosted-core";
const namespace=process.env.TRACKING_NAMESPACE||"gt:v1";
export const indexKey=`${namespace}:projects`;
export const projectKey=(id:string)=>`${namespace}:project:${id}`;
export const dataPrefix=(id:string)=>`${namespace}:data:${id}`;
export function hostedEnabled(){return process.env.HOSTED_ENABLED==="true" && (clerkConfigured() || (!!process.env.HOSTED_SIGNUP_CODE && !!process.env.HOSTED_ADMIN_KEY)) && !!process.env.TRACKING_SECRET && !!process.env.REDIS_URL;}
export async function getProject(id:string):Promise<TrackingProject|null>{
 if(id==="self"){
  if(!process.env.SELF_HOSTED_ORIGIN)return null;
  return {id,name:"My website",origin:normalizeOrigin(process.env.SELF_HOSTED_ORIGIN),keyHash:"",createdAt:0,disabled:false};
 }
 if(!hostedEnabled())return null;
 const value=await redis()!.get(projectKey(id));return value?JSON.parse(value):null;
}
export async function createProject(name:string,origin:string,ownerId?:string){
 const id=`gt_${randomBytes(12).toString("hex")}`,managementKey=randomBytes(32).toString("hex");
 const project:TrackingProject={id,name,origin:normalizeOrigin(origin),keyHash:ownerId?"":hashKey(managementKey),...(ownerId?{ownerId}:{}),createdAt:Date.now(),disabled:false};
 const created=await redis()!.eval(createProjectScript,2,indexKey,projectKey(id),positiveLimit(process.env.HOSTED_MAX_PROJECTS,100),id,JSON.stringify(project));
 if(!created)throw new Error("Project capacity reached. Contact the service owner.");
 return {project,managementKey};
}
export async function allowRequest(key:string,limit:number,seconds:number){return Number(await redis()!.eval(rateScript,1,`${namespace}:rate:${key}`,seconds))<=limit;}
export async function projectStats(id:string){
 const prefix=dataPrefix(id),now=Date.now(),dates=Array.from({length:30},(_,i)=>new Date(now-i*86400000).toISOString().slice(0,10));
 const pipeline=redis()!.multi().zremrangebyscore(`${prefix}:active`,"-inf",now-75000).zcard(`${prefix}:active`);
 for(const day of dates)pipeline.hgetall(`${prefix}:day:${day}`);
 const results=await pipeline.exec();if(!results || results.some(([e])=>e))throw new Error("Tracking unavailable");
 const totals:Record<string,number>={};for(const [,result] of results.slice(2))for(const [code,count] of Object.entries(result as Record<string,string>))totals[code]=(totals[code]||0)+Number(count);
 const locations=Object.entries(totals).flatMap(([code,count])=>{const c=countries.find(c=>c.cca2===code);return c?[{location:c.latlng,count,label:c.name.common}]:[];}).sort((a,b)=>b.count-a.count);
 return {online:Number(results[1][1]),countries:totals,locations,updatedAt:now,windowDays:30};
}
export async function deleteProject(id:string){
 // Remove access first. A collector already in flight may finish; its keys expire.
 await redis()!.multi().del(projectKey(id)).srem(indexKey,id).exec();
 let cursor="0";do{const result=await redis()!.scan(cursor,"MATCH",`${dataPrefix(id)}:*`,"COUNT",200);cursor=result[0];if(result[1].length)await redis()!.unlink(...result[1]);}while(cursor!=="0");
}

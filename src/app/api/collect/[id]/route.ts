import { NextRequest } from "next/server";
import { getProject,dataPrefix,projectStats } from "@/lib/hosted-store";
import { collectScript,positiveLimit,validProjectId,visitorKey } from "@/lib/hosted-core";
import { json,smallBody } from "@/lib/hosted-http";
import { country,redis } from "@/lib/tracking";
export const runtime="nodejs";
async function projectFor(request:NextRequest,id:string){
 if(!validProjectId(id)||!process.env.TRACKING_SECRET||!redis())return null;
 const project=await getProject(id);return project && !project.disabled && request.headers.get("origin")===project.origin?project:null;
}
export async function OPTIONS(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const project=await projectFor(request,(await params).id);return project?json({ok:true},200,project.origin):json({error:"Project or origin not allowed."},403);}catch{return json({error:"Tracking unavailable."},503);}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 let origin:string|undefined;
 try{
  const {id}=await params,project=await projectFor(request,id);if(!project)return json({error:"Project paused, not found, or website origin not allowed."},403);origin=project.origin;
  let body;try{body=await smallBody(request);}catch{return json({error:"Invalid request."},400,origin);}
  if(typeof body.visitorId!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.visitorId))return json({error:"Invalid visitor ID."},400,origin);
  const now=Date.now(),prefix=dataPrefix(id),date=new Date(now).toISOString(),visitor=visitorKey(id,body.visitorId,process.env.TRACKING_SECRET!);
  const result=Number(await redis()!.eval(collectScript,5,`${prefix}:rate`,`${prefix}:month:${date.slice(0,7)}`,`${prefix}:active`,`${prefix}:seen:${visitor}`,`${prefix}:day:${date.slice(0,10)}`,positiveLimit(process.env.HOSTED_REQUESTS_PER_MINUTE,300),positiveLimit(process.env.HOSTED_MONTHLY_REQUEST_LIMIT,100000),now,visitor,country(request.headers)));
  if(result<0)return json({error:result===-2?"Monthly tracking limit reached.":"Tracking is temporarily rate limited."},429,origin);
  return json(await projectStats(id),200,origin);
 }catch{return json({error:"Tracking temporarily unavailable."},503,origin);}
}

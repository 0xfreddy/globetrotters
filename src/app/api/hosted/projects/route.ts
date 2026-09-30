import { NextRequest } from "next/server";
import { hostedEnabled, allowRequest, createProject } from "@/lib/hosted-store";
import { matchesSecret, normalizeOrigin } from "@/lib/hosted-core";
import { json,sameOrigin,smallBody } from "@/lib/hosted-http";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return json({error:"Invalid origin."},403);
 if(!hostedEnabled())return json({error:"Hosted signups are not open yet. Choose self-hosting or ask the owner for access."},503);
 try{
  if(!await allowRequest("signup",30,60))return json({error:"Too many attempts. Try again in a minute."},429);
  let body;try{body=await smallBody(request);}catch{return json({error:"Enter a valid project name, website URL, and invite code."},400);}
  if(typeof body.inviteCode!=="string" || !matchesSecret(body.inviteCode,process.env.HOSTED_SIGNUP_CODE||""))return json({error:"Invalid invite code."},401);
  if(typeof body.name!=="string" || body.name.trim().length<1 || body.name.length>80)return json({error:"Project name must be 1–80 characters."},400);
  let origin;try{origin=normalizeOrigin(body.origin);}catch(e){return json({error:(e as Error).message},400);}
  const {project,managementKey}=await createProject(body.name.trim(),origin);
  return json({project:{id:project.id,name:project.name,origin:project.origin},managementKey},201);
 }catch{return json({error:"Could not create a project. Capacity may be reached or storage temporarily unavailable."},503);}
}

import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { clerkConfigured } from "@/lib/auth-config";
import { getProject, hostedEnabled, projectKey, deleteProject } from "@/lib/hosted-store";
import { ownsProject, validProjectId, normalizeOrigin, publicProject } from "@/lib/hosted-core";
import { json,sameOrigin,smallBody } from "@/lib/hosted-http";
import { redis } from "@/lib/tracking";
export const runtime="nodejs";
async function access(id:string) {
 if(!clerkConfigured() || !hostedEnabled()) return null;
 const {userId}=await auth();
 if(!userId || !validProjectId(id) || id==="self")return null;
 const project=await getProject(id);return ownsProject(project,userId)?project:null;
}
type Context={params:Promise<{id:string}>};
export async function PATCH(request:NextRequest,{params}:Context){
 if(!sameOrigin(request))return json({error:"Invalid origin."},403);
 try{
  const {id}=await params,project=await access(id);if(!project)return json({error:"Project not found or access denied."},404);
  const body=await smallBody(request);
  const changes:Record<string,string|boolean>={};
  if(body.name!==undefined){if(typeof body.name!=="string"||!body.name.trim()||body.name.length>80)return json({error:"Project name must be 1–80 characters."},400);changes.name=body.name.trim();}
  if(body.origin!==undefined){try{changes.origin=normalizeOrigin(body.origin);}catch(e){return json({error:(e as Error).message},400);}}
  if(body.disabled!==undefined){if(typeof body.disabled!=="boolean")return json({error:"Invalid tracking status."},400);changes.disabled=body.disabled;}
  if(!Object.keys(changes).length)return json({error:"No changes provided."},400);
  // Update only an existing record, avoiding resurrection after concurrent deletion.
  const updated={...project,...changes};
  const saved=await redis()!.set(projectKey(id),JSON.stringify(updated),"XX");
  if(!saved)return json({error:"Project no longer exists."},404);
  return json({project:publicProject(updated)});
 }catch{return json({error:"Could not update project."},503);}
}
export async function DELETE(request:NextRequest,{params}:Context){
 if(!sameOrigin(request))return json({error:"Invalid origin."},403);
 try{const {id}=await params;if(!await access(id))return json({error:"Project not found or access denied."},404);await deleteProject(id);return json({deleted:true});}catch{return json({error:"Could not delete project."},503);}
}

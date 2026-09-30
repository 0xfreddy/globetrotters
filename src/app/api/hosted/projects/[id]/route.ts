import { NextRequest } from "next/server";
import { getProject,projectKey,deleteProject,allowRequest } from "@/lib/hosted-store";
import { hashKey,matchesSecret,validProjectId } from "@/lib/hosted-core";
import { json,sameOrigin,smallBody } from "@/lib/hosted-http";
import { redis } from "@/lib/tracking";
async function access(request:NextRequest,id:string){
 if(!validProjectId(id)||id==="self")return null;
 if(!await allowRequest("manage",120,60))return null;
 const project=await getProject(id),key=request.headers.get("authorization")?.replace(/^Bearer /,"")||"";
 if(!project || !key)return null;
 return matchesSecret(hashKey(key),project.keyHash)||matchesSecret(key,process.env.HOSTED_ADMIN_KEY||"")?project:null;
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return json({error:"Invalid origin."},403);
 try{const {id}=await params,project=await access(request,id);if(!project)return json({error:"Invalid project or management key."},401);
  const body=await smallBody(request);if(typeof body.disabled!=="boolean")return json({error:"Choose pause or resume."},400);
  await redis()!.set(projectKey(id),JSON.stringify({...project,disabled:body.disabled}));return json({disabled:body.disabled});
 }catch{return json({error:"Could not update project."},503);}
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return json({error:"Invalid origin."},403);
 try{const {id}=await params;if(!await access(request,id))return json({error:"Invalid project or management key."},401);await deleteProject(id);return json({deleted:true});}catch{return json({error:"Could not delete project."},503);}
}

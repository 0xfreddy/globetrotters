import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { clerkConfigured } from "@/lib/auth-config";
import { hostedEnabled, indexKey, projectKey, projectStats, dataPrefix, createProject, allowRequest } from "@/lib/hosted-store";
import { ownsProject, publicProject, normalizeOrigin, positiveLimit, type TrackingProject } from "@/lib/hosted-core";
import { json, sameOrigin, smallBody } from "@/lib/hosted-http";
import { redis } from "@/lib/tracking";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
 if (!clerkConfigured() || !hostedEnabled()) return json({error:"Hosted accounts are not configured yet."},503);
 const {userId}=await auth(); if (!userId) return json({error:"Sign in to continue."},401);
 try {
  const ids=await redis()!.smembers(indexKey);
  const records=ids.length?await redis()!.mget(...ids.map(projectKey)):[];
  const owned=records.filter(Boolean).map(v=>JSON.parse(v!) as TrackingProject).filter(p=>ownsProject(p,userId));
  const projects=await Promise.all(owned.map(async p=>({ ...publicProject(p),stats:await projectStats(p.id),requests:Number(await redis()!.get(`${dataPrefix(p.id)}:month:${new Date().toISOString().slice(0,7)}`)||0) })));
  return json({projects,monthlyLimit:positiveLimit(process.env.HOSTED_MONTHLY_REQUEST_LIMIT,100000)});
 } catch { return json({error:"Could not load projects. Please retry."},503); }
}
export async function POST(request:NextRequest) {
 if (!sameOrigin(request)) return json({error:"Invalid origin."},403);
 if (!clerkConfigured() || !hostedEnabled()) return json({error:"Hosted accounts are not configured yet."},503);
 const {userId}=await auth(); if (!userId) return json({error:"Sign in to continue."},401);
 try {
  if (!await allowRequest(`create:${userId}`,5,3600)) return json({error:"You can create up to five projects per hour. Try again later."},429);
  const body=await smallBody(request);
  if(typeof body.name!=="string" || !body.name.trim() || body.name.length>80) return json({error:"Project name must be 1–80 characters."},400);
  if(body.consent!==true) return json({error:"Please confirm you manage this website and accept hosted tracking."},400);
  let origin;try{origin=normalizeOrigin(body.origin);}catch(e){return json({error:(e as Error).message},400);}
  const {project}=await createProject(body.name.trim(),origin,userId);
  return json({project:publicProject(project)},201);
 } catch {return json({error:"Could not create project. Capacity may be reached; please retry later."},503);}
}

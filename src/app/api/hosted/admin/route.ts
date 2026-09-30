import { NextRequest } from "next/server";
import { matchesSecret } from "@/lib/hosted-core";
import { hostedEnabled,indexKey,projectKey } from "@/lib/hosted-store";
import { redis } from "@/lib/tracking";
import { json } from "@/lib/hosted-http";
export async function GET(request:NextRequest){
 if(!hostedEnabled() || !matchesSecret(request.headers.get("authorization")?.replace(/^Bearer /,"")||"",process.env.HOSTED_ADMIN_KEY||""))return json({error:"Unauthorized."},401);
 try{const ids=await redis()!.smembers(indexKey);const rows=ids.length?await redis()!.mget(...ids.map(projectKey)):[];return json({projects:rows.filter(Boolean).map(value=>{const {keyHash,...project}=JSON.parse(value!);void keyHash;return project;})});}catch{return json({error:"Storage unavailable."},503);}
}

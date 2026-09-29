import { NextRequest, NextResponse } from "next/server";
import { country, heartbeatScript, redis, session, stats } from "@/lib/tracking";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const unavailable=()=>NextResponse.json({error:"Visitor tracking is not available. Configure REDIS_URL and TRACKING_SECRET."},{status:503,headers:{"Cache-Control":"no-store"}});
export async function GET(){try{return NextResponse.json(await stats(),{headers:{"Cache-Control":"no-store"}});}catch{return unavailable();}}
export async function POST(request:NextRequest){
  const origin=request.headers.get("origin");
  // Browser-only same-origin heartbeats. Cross-site embedding requires its own backend.
  if(!origin || origin !== request.nextUrl.origin && origin !== process.env.APP_URL)return NextResponse.json({error:"Invalid origin"},{status:403});
  if(!process.env.TRACKING_SECRET || !redis())return unavailable();
  try{
    const visitor=session(request.cookies.get("gt_session")?.value);
    await redis()!.eval(heartbeatScript,3,"globe:active",`globe:seen:${visitor.id}`,"globe:countries",Date.now(),visitor.id,country(request.headers));
    const response=NextResponse.json(await stats(),{headers:{"Cache-Control":"no-store"}});
    response.cookies.set("gt_session",visitor.value,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:86400,path:"/"});
    return response;
  }catch{return unavailable();}
}

import { NextRequest } from "next/server";
import { normalizeOrigin,validProjectId } from "@/lib/hosted-core";
import registry from "../../../../public/r/tracked-globe.json";
export function GET(request:NextRequest){
 try{
  const id=request.nextUrl.searchParams.get("projectId")||"self";
  if(!validProjectId(id))throw new Error("Invalid project ID.");
  const endpoint=normalizeOrigin(request.nextUrl.searchParams.get("endpoint"));
  const content=`"use client";\nimport { TrackedGlobe } from "@/components/tracked-globe";\nimport type { GlobeSettings } from "@/components/globetrotters";\n\nexport function VisitorGlobe(props: { settings?: Partial<GlobeSettings>; className?: string; enabled?: boolean }) {\n  return <TrackedGlobe {...props} endpoint={${JSON.stringify(endpoint)}} projectId={${JSON.stringify(id)}} />;\n}\n`;
  return Response.json({...registry,name:"visitor-globe",title:"Your connected visitor globe",files:[...registry.files,{path:"src/components/visitor-globe.tsx",type:"registry:component",content}]},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return Response.json({error:(e as Error).message},{status:400});}
}

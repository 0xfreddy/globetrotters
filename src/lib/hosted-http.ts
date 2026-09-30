import { NextRequest, NextResponse } from "next/server";
export function json(data:unknown,status=200,origin?:string){
 const headers:Record<string,string>={"Cache-Control":"no-store","Vary":"Origin"};
 if(origin)Object.assign(headers,{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"});
 return NextResponse.json(data,{status,headers});
}
export function sameOrigin(request:NextRequest){
 const expected=process.env.APP_URL || (process.env.NODE_ENV!=="production"?request.nextUrl.origin:"");
 return !!expected && request.headers.get("origin")===expected;
}
export async function smallBody(request:Request):Promise<Record<string,unknown>>{
 if(!request.headers.get("content-type")?.startsWith("application/json"))throw new Error("Expected JSON.");
 if(Number(request.headers.get("content-length"))>2048)throw new Error("Request too large.");
 const reader=request.body?.getReader();if(!reader)throw new Error("Missing request body.");
 let size=0,text="";const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new Error("Request too large.");}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 const result=JSON.parse(text);if(!result || typeof result!=="object" || Array.isArray(result))throw new Error("Expected an object.");return result;
}

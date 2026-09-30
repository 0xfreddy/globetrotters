"use client";
import { useEffect,useState } from "react";
import { Globetrotters,type GlobeSettings,type VisitorLocation } from "@/components/globetrotters";
export function useVisitorTracking({endpoint,projectId,enabled=true}:{endpoint:string;projectId:string;enabled?:boolean}){
 const [data,setData]=useState<{online:number;locations:VisitorLocation[]}|null>(null),[error,setError]=useState<string|null>(null);
 useEffect(()=>{
  setData(null);setError(null);if(!enabled)return;
  let disposed=false,busy=false;const abort=new AbortController();
  let base:string;try{const url=new URL(endpoint);if(url.protocol!=="https:" && !(url.protocol==="http:" && ["localhost","127.0.0.1","[::1]"].includes(url.hostname)))throw new Error();base=url.origin;}catch{setError("Invalid tracking URL.");return;}
  const storageKey=`globetrotters:${base}:${projectId}`;
  let visitor={id:crypto.randomUUID() as string,expires:Date.now()+86400000};
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved && typeof saved.id==="string" && saved.expires>Date.now())visitor=saved;else localStorage.setItem(storageKey,JSON.stringify(visitor));}catch{}
  const ping=async()=>{
   if(document.hidden||busy||disposed)return;busy=true;
   if(visitor.expires<=Date.now()){visitor={id:crypto.randomUUID(),expires:Date.now()+86400000};try{localStorage.setItem(storageKey,JSON.stringify(visitor));}catch{}}
   try{const response=await fetch(`${base}/api/collect/${encodeURIComponent(projectId)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorId:visitor.id}),credentials:"omit",signal:abort.signal});const body=await response.json();if(!response.ok)throw new Error(body.error||"Tracking unavailable.");if(!disposed){setData(body);setError(null);}}
   catch(e){if(!disposed){setError(e instanceof Error?e.message:"Tracking unavailable.");setData(null);}}
   finally{busy=false;}
  };
  void ping();const timer=setInterval(ping,30000);document.addEventListener("visibilitychange",ping);
  return()=>{disposed=true;abort.abort();clearInterval(timer);document.removeEventListener("visibilitychange",ping);};
 },[endpoint,projectId,enabled]);
 return {online:data?.online??null,locations:data?.locations??[],error,loading:enabled&&!data&&!error};
}
/** Connects only to the tracking service you explicitly configure. Set enabled=false until consent if required by your site. */
export function TrackedGlobe({endpoint,projectId,enabled=true,settings,className,showCount=true}:{endpoint:string;projectId:string;enabled?:boolean;settings?:Partial<GlobeSettings>;className?:string;showCount?:boolean}){
 const {online,locations,error,loading}=useVisitorTracking({endpoint,projectId,enabled});
 return <div className={className}><Globetrotters settings={settings} locations={locations}/>{showCount&&<p role="status" style={{textAlign:"center",fontSize:12,color:"#737b69"}}>{!enabled?"Tracking is off":error?"Live count unavailable":loading?"Connecting…":`${online} ${online===1?"person":"people"} here right now`}</p>}</div>;
}

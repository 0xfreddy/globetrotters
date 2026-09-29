"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";

export type GlobeSettings = {
  baseColor: string; markerColor: string; glowColor: string;
  dark: number; diffuse: number; mapBrightness: number; mapSamples: number;
  scale: number; theta: number; speed: number; autoRotate: boolean;
  drag: boolean; damping: number; transition: number; markerSize: number;
  markerElevation: number; showMarkers: boolean; showArcs: boolean;
  arcHeight: number; arcWidth: number;
};
export const defaultSettings: GlobeSettings = {
  baseColor: "#a1ad8a", markerColor: "#526b30", glowColor: "#ffffff",
  dark: 0, diffuse: 1.4, mapBrightness: 5, mapSamples: 18000,
  scale: 1, theta: 0.22, speed: 0.12, autoRotate: true,
  drag: true, damping: 0.92, transition: 550, markerSize: 0.045,
  markerElevation: 0.02, showMarkers: true, showArcs: false, arcHeight: 0.3, arcWidth: 0.5,
};
export type VisitorLocation = { location: [number, number]; count: number; label: string };
export const demoLocations: VisitorLocation[] = [
  { location: [40.7,-74], count: 84, label: "United States" },
  { location: [51.5,-0.1], count: 48, label: "United Kingdom" },
  { location: [48.8,2.3], count: 26, label: "France" },
  { location: [25.2,55.3], count: 36, label: "United Arab Emirates" },
  { location: [20.6,78.9], count: 65, label: "India" },
  { location: [35.7,139.7], count: 21, label: "Japan" },
  { location: [-33.9,151.2], count: 18, label: "Australia" },
  { location: [-23.5,-46.6], count: 16, label: "Brazil" },
];
const rgb = (hex: string): [number,number,number] => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255) as [number,number,number];

/** Standalone globe. No telemetry, cookies, or external requests beyond COBE's bundled map. */
export function Globetrotters({ settings, locations = [], className = "", onReady }: {
  settings?: Partial<GlobeSettings>; locations?: VisitorLocation[]; className?: string; onReady?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef({ ...defaultSettings, ...settings });
  current.current = { ...defaultSettings, ...settings };
  const points = useRef(locations); points.current = locations;
  const onReadyRef = useRef(onReady); onReadyRef.current = onReady;
  const drag = useRef<{ x:number; y:number } | null>(null);
  const motion = useRef({ phi: 0.65, tilt:0, velocity:0 });
  const [error,setError] = useState(false);
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    let frame = 0, width = el.clientWidth || 400, visible = true, last = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const smooth = { ...current.current };
    let colors = [rgb(smooth.baseColor),rgb(smooth.markerColor),rgb(smooth.glowColor)];
    let globe: ReturnType<typeof createGlobe>;
    try {
      globe = createGlobe(el, { width:width*dpr, height:width*dpr, devicePixelRatio:dpr,
        phi:motion.current.phi, theta:smooth.theta, dark:smooth.dark, diffuse:smooth.diffuse,
        mapSamples:smooth.mapSamples, mapBrightness:smooth.mapBrightness,
        baseColor:colors[0], markerColor:colors[1], glowColor:colors[2], markers:[] });
      onReadyRef.current?.();
    } catch { setError(true); return; }
    const resize = new ResizeObserver(() => { width = el.clientWidth; }); resize.observe(el);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(el);
    const animate = (now: number) => {
      const dt = Math.min((now-last)/1000 || .016, .05); last = now;
      if (visible && !document.hidden) {
        const s = current.current, m = motion.current;
        const mix = reduced.matches || s.transition === 0 ? 1 : 1-Math.exp(-dt*1000/(s.transition/3));
        for (const key of ["dark","diffuse","mapBrightness","scale","theta","markerSize","markerElevation","arcHeight","arcWidth"] as const) smooth[key] += (s[key]-smooth[key])*mix;
        colors = colors.map((color,i) => { const target = rgb([s.baseColor,s.markerColor,s.glowColor][i]); return color.map((v,j)=>v+(target[j]-v)*mix) as [number,number,number]; });
        if (!drag.current) {
          if(s.autoRotate && !reduced.matches) m.phi += s.speed*dt;
          m.phi += m.velocity*dt; m.velocity *= Math.pow(s.damping,dt*60);
        }
        const markers = s.showMarkers ? points.current.map(p=>({location:p.location,size:smooth.markerSize*Math.max(.35,Math.min(2,Math.sqrt(p.count/40)))})) : [];
        const arcs = s.showArcs && points.current.length > 1 ? points.current.slice(1).map(p=>({from:points.current[0].location,to:p.location})) : [];
        globe.update({ width:width*dpr,height:width*dpr,phi:m.phi,theta:smooth.theta+m.tilt,
          dark:smooth.dark,diffuse:smooth.diffuse,mapSamples:s.mapSamples,mapBrightness:smooth.mapBrightness,
          scale:smooth.scale,baseColor:colors[0],markerColor:colors[1],glowColor:colors[2],
          markers,markerElevation:smooth.markerElevation,arcs,arcColor:colors[1],arcHeight:smooth.arcHeight,arcWidth:smooth.arcWidth });
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();globe.destroy(); };
  }, []);
  return <div className={className} style={{position:"relative",aspectRatio:"1/1"}}>
    {error ? <div role="status" style={{padding:40,textAlign:"center"}}>The interactive globe needs WebGL. Try another browser or enable hardware acceleration.</div> :
    <canvas ref={canvas} aria-label="Interactive visitor globe. Use arrow keys or drag to rotate." tabIndex={0}
      style={{display:"block",width:"100%",height:"100%",touchAction:"pan-y",cursor:current.current.drag?"grab":"default"}}
      onPointerDown={e=>{if(!current.current.drag)return;drag.current={x:e.clientX,y:e.clientY};motion.current.velocity=0;e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x; motion.current.phi+=dx*.006;motion.current.tilt=Math.max(-1,Math.min(1,motion.current.tilt+(e.clientY-drag.current.y)*.003));motion.current.velocity=dx*.15;drag.current={x:e.clientX,y:e.clientY};}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
      onKeyDown={e=>{if(!current.current.drag)return;if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){e.preventDefault();if(e.key==="ArrowLeft")motion.current.phi-=.1;if(e.key==="ArrowRight")motion.current.phi+=.1;if(e.key==="ArrowUp")motion.current.tilt=Math.max(-1,motion.current.tilt-.1);if(e.key==="ArrowDown")motion.current.tilt=Math.min(1,motion.current.tilt+.1);}}}/ >}
  </div>;
}

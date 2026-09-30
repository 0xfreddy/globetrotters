"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Code2, Copy, Github, Globe2, RotateCcw, Settings2, Sparkles, X } from "lucide-react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Drawer } from "vaul";
import SpotlightButton from "@/components/SpotlightButton";
import { Globetrotters, defaultSettings, demoLocations, type GlobeSettings, type MarkerStyle } from "@/components/globetrotters";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REPO = "https://github.com/0xfreddy/globetrotters";
const SITE = "https://globetrotters-production-dc49.up.railway.app";
const COMMAND = `npx shadcn@latest add ${SITE}/r/globetrotters.json`;
const presets: Record<string, Partial<GlobeSettings>> = {
  Sage: { baseColor: "#a1ad8a", markerColor: "#526b30", glowColor: "#ffffff", dark: 0 },
  Ocean: { baseColor: "#83aac2", markerColor: "#247ca8", glowColor: "#ffffff", dark: 0 },
  Clay: { baseColor: "#c99781", markerColor: "#b35e3d", glowColor: "#ffffff", dark: 0 },
  Midnight: { baseColor: "#3c4460", markerColor: "#bba9fb", glowColor: "#ffffff", dark: 1 },
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <Button className="h-10 rounded-lg px-4 text-xs" onClick={async()=>{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?"Copied":label}</Button>;
}

function ColorPicker({ label, color, onChange }: { label: string; color: string; onChange: (color: string) => void }) {
  return <Popover><PopoverTrigger asChild><button className="ml-auto flex h-9 items-center gap-2 rounded-lg border bg-white px-2.5 text-[10px] uppercase mono" aria-label={`Change ${label.toLowerCase()} color`}><span className="h-4 w-4 rounded border border-black/10" style={{background:color}}/>{color}</button></PopoverTrigger><PopoverContent className="w-auto p-3" align="end"><HexColorPicker color={color} onChange={onChange}/><label className="mt-3 flex items-center gap-3 text-xs">HEX<HexColorInput aria-label={`${label} hex color`} color={color} onChange={onChange} prefixed className="h-8 w-40 rounded border px-2 mono"/></label></PopoverContent></Popover>;
}

function ControlTable({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border bg-white"><table className="w-full table-fixed border-collapse"><tbody>{children}</tbody></table></div>;
}

function SectionRow({ children }: { children: ReactNode }) {
  return <tr><th colSpan={2} className="border-b bg-[#f7f8f4] px-4 py-2 text-left text-[9px] font-medium uppercase tracking-[.14em] text-[#858c7e] mono">{children}</th></tr>;
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return <tr className="border-b last:border-b-0"><th scope="row" className="w-[38%] px-4 py-3 text-left text-xs font-normal text-[#60655c]">{label}</th><td className="px-4 py-2.5">{children}</td></tr>;
}

export default function Home() {
  const [settings, setSettings] = useState<GlobeSettings>(defaultSettings);
  const [preset, setPreset] = useState("Sage");
  const [loaded, setLoaded] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(()=>{try{const saved=localStorage.getItem("globetrotters-settings");if(saved){const parsed=JSON.parse(saved);const clean={...defaultSettings};for(const key of Object.keys(clean) as (keyof GlobeSettings)[]){const value=parsed[key];const validColor=(["baseColor","markerColor","glowColor"] as string[]).includes(key)&&typeof value==="string"&&/^#[a-f0-9]{6}$/i.test(value);const validMarkerStyle=key==="markerStyle"&&["dots","analytics","polaroids"].includes(value);if(validColor||validMarkerStyle||(typeof clean[key]!=="string"&&typeof value===typeof clean[key]))Object.assign(clean,{[key]:value});}setSettings(clean);setPreset("Custom");}}catch{}setLoaded(true);},[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem("globetrotters-settings",JSON.stringify(settings));}catch{}},[settings,loaded]);

  function update<K extends keyof GlobeSettings>(key: K, value: GlobeSettings[K]) { setSettings(s=>({...s,[key]:value})); setPreset("Custom"); }
  const range = (key: keyof GlobeSettings, label: string, min: number, max: number, step: number, unit = "") => <ControlRow key={key} label={label}><div className="flex items-center gap-3"><Slider aria-label={label} value={[settings[key] as number]} onValueChange={v=>update(key,v[0])} min={min} max={max} step={step}/><span className="w-16 text-right text-[10px] tabular-nums mono">{Number((settings[key] as number).toFixed(3))}{unit}</span></div></ControlRow>;
  const toggle = (key: keyof GlobeSettings, label: string) => <ControlRow key={key} label={label}><div className="flex justify-end"><Switch checked={settings[key] as boolean} onCheckedChange={value=>update(key,value)} aria-label={label}/></div></ControlRow>;
  const code = `import { Globetrotters } from "@/components/globetrotters";\n\n<Globetrotters\n  settings={${JSON.stringify(settings,null,2).replace(/\n/g,"\n  ")}}\n  locations={[\n    { location: [51.5, -0.1], count: 48, label: "London" }\n  ]}\n/>`;
  const installPrompt = `Integrate the Globetrotters component into this React or Next.js project.\n\nBefore editing, inspect package.json, the component aliases, and git status. Preserve all existing work. If the target files have overlapping uncommitted changes, stop and ask me to commit or stash them first.\n\nRun:\n${COMMAND}\n\nThen render the component with this configuration:\n${code}\n\nKeep the existing project conventions, do not overwrite unrelated files, and finish by running the available typecheck, tests, and production build.`;

  return <div className="min-h-screen bg-white px-5 sm:px-10">
    <header className="mx-auto flex h-16 max-w-[1160px] items-center justify-between border-b">
      <a href="#" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-.6px]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ecf0e2]"><Globe2 size={20} strokeWidth={1.5}/></span>globetrotters</a>
      <nav className="flex items-center gap-4"><a href="/dashboard" className="text-xs text-[#777d72]">Dashboard</a><a href={REPO} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs"><Github size={15}/>GitHub</a></nav>
    </header>

    <main className={`mx-auto flex max-w-[900px] flex-col items-center text-center transition-[padding] duration-300 ${configOpen?"pt-5":"pt-10 sm:pt-12"}`}>
      <div className="transition-all duration-300" data-drawer-open={configOpen}>
        <h1 className={`font-medium tracking-[-.055em] transition-all duration-300 ${configOpen?"text-[28px] leading-none sm:text-[32px]":"text-[48px] leading-[.98] sm:text-[72px]"}`}>See where your visitors are.</h1>
        <p className={`mx-auto max-w-[570px] text-[#777d72] transition-all duration-300 ${configOpen?"mt-2 text-xs":"mt-5 text-base leading-7 sm:text-lg"}`}>Add a customizable, interactive visitor globe to your website.</p>
      </div>

      <div className={`transition-all duration-300 ${configOpen?"mt-2 w-[220px] sm:w-[250px]":"mt-5 w-[330px] sm:w-[430px]"}`}>
        <Globetrotters settings={settings} locations={demoLocations} className="w-full"/>
      </div>

      <Drawer.Root open={configOpen} onOpenChange={(open)=>{setConfigOpen(open);if(!open)setInstallOpen(false);}} shouldScaleBackground={false} repositionInputs={false}>
        <Drawer.Trigger asChild>
          <SpotlightButton className={`mt-1 transition-opacity ${configOpen?"pointer-events-none opacity-0":"opacity-100"}`}><Settings2 size={16}/><span className="relative mt-px bg-gradient-to-b from-white/70 to-white bg-clip-text text-sm font-medium text-transparent">Configure</span></SpotlightButton>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-[#172015]/10 backdrop-blur-[1px]"/>
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[68vh] max-w-[920px] flex-col rounded-t-[24px] border border-b-0 bg-[#fbfcf9]/95 shadow-[0_-24px_70px_-30px_rgba(20,30,18,.35)] backdrop-blur-2xl outline-none">
            <Drawer.Handle className="mt-3 bg-[#c8cdc2]"/>
            <div className="flex items-start justify-between px-5 pb-3 pt-2 sm:px-8"><div className="text-left"><Drawer.Title className="text-lg font-semibold tracking-[-.02em]">Configure your globe</Drawer.Title><Drawer.Description className="mt-1 text-xs text-[#858b80]">Choose the essentials or fine-tune every detail.</Drawer.Description></div><Drawer.Close asChild><button className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[#6f756b]" aria-label="Close configuration"><X size={15}/></button></Drawer.Close></div>
            <Tabs defaultValue="simple" className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="flex items-center gap-3 border-y bg-white/70 px-5 py-2 sm:px-8"><TabsList className="grid h-9 flex-1 grid-cols-2 bg-[#eef0eb]"><TabsTrigger value="simple" className="text-[11px]">Simple</TabsTrigger><TabsTrigger value="advanced" className="text-[11px]">Advanced</TabsTrigger></TabsList><button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-[#747b70]" onClick={()=>{setSettings(defaultSettings);setPreset("Sage");}} aria-label="Reset all settings" title="Reset all settings"><RotateCcw size={14}/></button></div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8">
                <TabsContent value="simple" className="mx-auto mt-0 max-w-[720px] space-y-4">
                  <ControlTable>
                    <SectionRow>Appearance</SectionRow>
                    <ControlRow label="Map color"><ColorPicker label="Map" color={settings.baseColor} onChange={v=>update("baseColor",v)}/></ControlRow>
                    <ControlRow label="Dot color"><ColorPicker label="Dots" color={settings.markerColor} onChange={v=>update("markerColor",v)}/></ControlRow>
                    <ControlRow label="Glow color"><ColorPicker label="Glow" color={settings.glowColor} onChange={v=>update("glowColor",v)}/></ControlRow>
                    {range("scale","Globe scale",.6,1.15,.01)}
                    {toggle("autoRotate","Auto rotate")}
                    {toggle("showMarkers","Visitor markers")}
                    <ControlRow label="Marker style"><div className="grid grid-cols-3 gap-1 rounded-lg bg-[#f0f2ed] p-1">{(["dots","analytics","polaroids"] as MarkerStyle[]).map(style=><button key={style} className={`rounded-md px-2 py-2 text-[10px] capitalize ${settings.markerStyle===style?"bg-white font-medium shadow-sm":"text-[#7c8278]"}`} onClick={()=>update("markerStyle",style)}>{style==="analytics"?"Counts":style==="polaroids"?"Cards":style}</button>)}</div></ControlRow>
                  </ControlTable>
                  <ControlTable><SectionRow>Presets</SectionRow><ControlRow label="Color palette"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(presets).map(([name,values])=><button key={name} aria-pressed={preset===name} className={`rounded-lg border p-2 text-left ${preset===name?"border-[#7f8e6a] bg-[#f6f8f2]":"bg-white"}`} onClick={()=>{setSettings(s=>({...s,...values}));setPreset(name);}}><span className="mb-1.5 flex -space-x-1">{[values.baseColor,values.markerColor,values.glowColor].map((color,index)=><span key={`${name}-${index}`} className="h-4 w-4 rounded-full border border-white" style={{background:color}}/>)}</span><span className="block text-[9px] text-[#666c62]">{name}</span></button>)}</div></ControlRow></ControlTable>
                </TabsContent>
                <TabsContent value="advanced" className="mx-auto mt-0 max-w-[720px]"><ControlTable><SectionRow>Appearance</SectionRow>{range("mapSamples","Map detail",4000,40000,1000)}{range("mapBrightness","Brightness",1,10,.1)}{range("diffuse","Diffuse light",0,3,.05)}{range("dark","Darkness",0,1,.01)}<SectionRow>Motion</SectionRow>{toggle("drag","Drag to rotate")}{range("speed","Rotation speed",-.6,.6,.01," rad/s")}{range("theta","Tilt",-1,1,.01," rad")}{range("damping","Drag inertia",0,.99,.01)}{range("transition","Transition duration",0,2000,50," ms")}<SectionRow>Markers</SectionRow>{toggle("showArcs","Connection arcs")}{range("markerSize","Marker size",.01,.12,.005)}{range("markerElevation","Elevation",0,.15,.005)}{range("arcHeight","Arc height",.05,.8,.01)}{range("arcWidth","Arc width",.1,2,.1)}</ControlTable></TabsContent>
              </div>
            </Tabs>
            <div className="flex items-center justify-between border-t bg-white/80 px-5 py-3 sm:px-8"><span className="text-[10px] text-[#8b9186]">{preset} · saved locally</span>
              <Drawer.NestedRoot open={installOpen} onOpenChange={setInstallOpen} repositionInputs={false}>
                <Drawer.Trigger asChild><Button className="h-10 rounded-lg px-5 text-xs"><Code2 size={14}/>Install</Button></Drawer.Trigger>
                <Drawer.Portal>
                  <Drawer.Overlay className="fixed inset-0 z-[60] bg-[#172015]/15"/>
                  <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[64vh] max-w-[820px] flex-col rounded-t-[24px] border border-b-0 bg-white shadow-[0_-30px_80px_-35px_rgba(20,30,18,.5)] outline-none">
                    <Drawer.Handle className="mt-3 bg-[#c8cdc2]"/>
                    <div className="flex items-start justify-between px-5 pb-3 pt-2 sm:px-8"><div className="text-left"><Drawer.Title className="text-lg font-semibold tracking-[-.02em]">Install Globetrotters</Drawer.Title><Drawer.Description className="mt-1 text-xs text-[#858b80]">Give this ready-made prompt to your coding agent.</Drawer.Description></div><Drawer.Close asChild><button className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[#6f756b]" aria-label="Close install drawer"><X size={15}/></button></Drawer.Close></div>
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6 sm:px-8">
                      <div className="rounded-xl border border-[#dfe5d7] bg-[#f5f8f1] p-4 text-left"><p className="flex items-center gap-2 text-xs font-medium"><Sparkles size={14} className="text-[#70815b]"/>Before you install</p><p className="mt-1.5 text-[11px] leading-5 text-[#747b70]">Commit or stash edits that overlap the component files. The prompt tells the agent to preserve unrelated work and stop before overwriting anything.</p></div>
                      <section className="text-left"><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-medium">AI install prompt</h2><CopyButton value={installPrompt} label="Copy prompt"/></div><pre className="max-h-[230px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#171b16] p-4 text-[11px] leading-5 text-[#eef3e9] mono">{installPrompt}</pre></section>
                      <section className="text-left"><h2 className="mb-2 text-xs font-medium">Generated component code</h2><pre className="overflow-x-auto rounded-xl border bg-[#f8f9f6] p-4 text-[10px] leading-5 text-[#555b52] mono">{code}</pre></section>
                    </div>
                  </Drawer.Content>
                </Drawer.Portal>
              </Drawer.NestedRoot>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </main>

    <footer className="mx-auto mt-10 flex max-w-[900px] items-center justify-between border-t py-5 text-[10px] text-[#92998d]"><span>Open source. No tracking in the component.</span><a href={REPO} className="flex items-center gap-1.5">View on GitHub <Github size={11}/></a></footer>
  </div>;
}

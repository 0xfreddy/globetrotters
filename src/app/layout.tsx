import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
export const metadata: Metadata = {title:"Globetrotters — Give your visitors a place in the world.",description:"An open-source, customizable visitor globe for React. Make your site feel a little more alive. Built with COBE and shadcn/ui.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}<Script src="https://freddy-umami.fly.dev/script.js" data-website-id="72d499b9-78a4-44cf-adee-78a874089e9e" data-domains="globetrotters-production-dc49.up.railway.app" strategy="afterInteractive" /></body></html>}

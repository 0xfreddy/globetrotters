import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Globetrotters — Give your visitors a place in the world.",description:"An open-source, customizable visitor globe for React. Make your site feel a little more alive. Built with COBE and shadcn/ui.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}

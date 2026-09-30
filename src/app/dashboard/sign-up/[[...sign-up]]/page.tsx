import { SignUp } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
export default function Page(){if(!clerkConfigured())return null;return <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6"><a href="/" className="text-sm">← Globetrotters</a><SignUp routing="path" path="/dashboard/sign-up" /></main>;}

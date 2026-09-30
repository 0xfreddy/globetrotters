import { ClerkProvider } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
export const dynamic="force-dynamic";
export default function DashboardLayout({children}:{children:React.ReactNode}) {
 if(!clerkConfigured()) return <main className="mx-auto max-w-lg px-6 py-24"><a href="/" className="text-sm underline">← Globetrotters</a><h1 className="mt-12 text-3xl font-semibold">Your globe, one home.</h1><p className="mt-4 text-muted-foreground">Hosted accounts are being prepared. Once sign-in is enabled, you can create projects, see visitors, and manage your globes here.</p><a href="/setup" className="mt-6 inline-block underline">Set up your own backend →</a></main>;
 return <ClerkProvider signInUrl="/dashboard/sign-in" signUpUrl="/dashboard/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">{children}</ClerkProvider>;
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { clerkConfigured } from "@/lib/auth-config";
import { ProjectDashboard } from "@/components/project-dashboard";
export default async function DashboardPage(){
 if(!clerkConfigured())return null;
 const {userId}=await auth();if(!userId)redirect("/dashboard/sign-in");
 return <ProjectDashboard/>;
}

import { hostedEnabled } from "@/lib/hosted-store";
import { json } from "@/lib/hosted-http";
export const dynamic="force-dynamic";
export function GET(){return json({hostedAvailable:hostedEnabled(),templateUrl:process.env.RAILWAY_TEMPLATE_URL||null});}

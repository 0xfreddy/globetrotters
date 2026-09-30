import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { clerkConfigured } from "./lib/auth-config";
const middleware = clerkMiddleware({
  authorizedParties: process.env.APP_URL ? [new URL(process.env.APP_URL).origin] : undefined,
});
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkConfigured()) return NextResponse.next();
  return middleware(request, event);
}
export const config = { matcher: ["/dashboard/:path*", "/api/dashboard/:path*"] };
